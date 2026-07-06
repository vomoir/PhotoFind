import fs from 'fs';
import path from 'path';
import exifr from 'exifr';
import db from './db.js';
import { reverseGeocode } from './geocoder.js';

// Global scan status
export const scanStatus = {
  isScanning: false,
  totalFiles: 0,
  processedFiles: 0,
  currentFile: '',
  error: null
};

// Supported image extensions
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp', '.tiff', '.heif']);

/**
 * Recursively walks a directory to find image files.
 * @param {string} dirPath 
 * @param {string[]} fileList 
 */
function walkDirectory(dirPath, fileList = []) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Skip common system and package folders to avoid infinite loops or bloat
      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();
        if (
          lowerName === 'node_modules' || 
          lowerName === '.git' || 
          lowerName === '$recycle.bin' || 
          lowerName === 'system volume information'
        ) {
          continue;
        }
        walkDirectory(fullPath, fileList);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTENSIONS.has(ext)) {
          fileList.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`Error walking directory: ${dirPath}`, err);
  }
  return fileList;
}

/**
 * Performs scanning in the background.
 * @param {string} targetDir 
 */
async function runScan(targetDir) {
  scanStatus.isScanning = true;
  scanStatus.totalFiles = 0;
  scanStatus.processedFiles = 0;
  scanStatus.currentFile = '';
  scanStatus.error = null;

  try {
    if (!fs.existsSync(targetDir)) {
      throw new Error(`Directory does not exist: ${targetDir}`);
    }

    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${targetDir}`);
    }

    console.log(`Starting scan of directory: ${targetDir}`);
    const files = walkDirectory(targetDir);
    scanStatus.totalFiles = files.length;
    console.log(`Found ${files.length} images to process.`);

    const checkStmt = db.prepare('SELECT 1 FROM photos WHERE filepath = ?');
    const insertStmt = db.prepare(`
      INSERT INTO photos (
        filepath, filename, latitude, longitude, location_name, date_taken
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const file of files) {
      scanStatus.currentFile = file;

      // Check if file is already in the database
      const exists = checkStmt.get(file);
      if (exists) {
        scanStatus.processedFiles++;
        continue;
      }

      let latitude = null;
      let longitude = null;
      let dateTaken = null;
      let locationName = null;

      try {
        // Parse EXIF metadata using exifr
        // Parse GPS and basic TIFF properties
        const metadata = await exifr.parse(file, {
          gps: true,
          tiff: true,
          xmp: false,
          icc: false
        });

        if (metadata) {
          if (typeof metadata.latitude === 'number' && typeof metadata.longitude === 'number') {
            latitude = metadata.latitude;
            longitude = metadata.longitude;
          }

          // Fallback date properties
          const rawDate = metadata.DateTimeOriginal || metadata.CreateDate || metadata.ModifyDate;
          if (rawDate instanceof Date) {
            dateTaken = rawDate.toISOString();
          } else if (typeof rawDate === 'string') {
            dateTaken = new Date(rawDate).toISOString();
          }
        }
      } catch (exifErr) {
        // Some images don't have valid EXIF metadata, which is fine
        console.warn(`Could not read EXIF for: ${file}. Reason: ${exifErr.message}`);
      }

      // If coordinates are found, resolve the location
      if (latitude !== null && longitude !== null) {
        try {
          locationName = await reverseGeocode(latitude, longitude);
        } catch (geoErr) {
          console.error(`Geocoding error for: ${file}`, geoErr);
        }
      }

      // If the file does not have a date taken, fallback to file system creation/modification time
      if (!dateTaken) {
        try {
          const fileStat = fs.statSync(file);
          dateTaken = (fileStat.birthtime || fileStat.mtime || new Date()).toISOString();
        } catch (fsStatErr) {
          dateTaken = new Date().toISOString();
        }
      }

      const filename = path.basename(file);

      // Insert record
      try {
        insertStmt.run(file, filename, latitude, longitude, locationName, dateTaken);
      } catch (dbErr) {
        console.error(`Database insert error for: ${file}`, dbErr);
      }

      scanStatus.processedFiles++;
    }

    console.log(`Scan completed. Processed ${scanStatus.processedFiles} / ${scanStatus.totalFiles} files.`);
  } catch (err) {
    console.error('Scan failed:', err);
    scanStatus.error = err.message;
  } finally {
    scanStatus.isScanning = false;
  }
}

/**
 * Triggers background scanning of a directory.
 * @param {string} targetDir 
 */
export function startScanning(targetDir) {
  if (scanStatus.isScanning) {
    throw new Error('Scan is already in progress.');
  }
  // Run asynchronously in the background
  runScan(targetDir);
}
