import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { startScanning, scanStatus } from './scanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors());
app.use(express.json());

// 1. Scan a directory
app.post('/api/scan', (req, res) => {
  const { directoryPath } = req.body;

  if (!directoryPath) {
    return res.status(400).json({ error: 'directoryPath is required' });
  }

  try {
    startScanning(directoryPath);
    res.json({ message: 'Scanning started in the background.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Query scan status
app.get('/api/scan/status', (req, res) => {
  res.json(scanStatus);
});

// 3. Get all photos, optionally filtered by keyword search
app.get('/api/photos', (req, res) => {
  const { search } = req.query;

  try {
    let photos;
    if (search && search.trim() !== '') {
      const query = `%${search.trim()}%`;
      const stmt = db.prepare(`
        SELECT * FROM photos 
        WHERE filename LIKE ? 
           OR location_name LIKE ? 
           OR subject LIKE ? 
           OR people LIKE ? 
           OR tags LIKE ? 
           OR description LIKE ? 
        ORDER BY date_taken DESC
      `);
      photos = stmt.all(query, query, query, query, query, query);
    } else {
      const stmt = db.prepare('SELECT * FROM photos ORDER BY date_taken DESC');
      photos = stmt.all();
    }
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Get detailed metadata for a specific photo
app.get('/api/photos/:id', (req, res) => {
  const { id } = req.params;
  try {
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.json(photo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Update photo metadata (subject, people, tags, description, location_name)
app.put('/api/photos/:id/metadata', (req, res) => {
  const { id } = req.params;
  const { subject, people, tags, description, location_name } = req.body;

  try {
    const stmt = db.prepare(`
      UPDATE photos 
      SET subject = ?, people = ?, tags = ?, description = ?, location_name = ?
      WHERE id = ?
    `);
    const result = stmt.run(subject, people, tags, description, location_name, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const updatedPhoto = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
    res.json(updatedPhoto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// 6. Delete a photo from the database
app.delete('/api/photos/:id', (req, res) => {
  const { id } = req.params;

  try {
    // First, get the photo to retrieve the filepath
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete from database
    const stmt = db.prepare('DELETE FROM photos WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Optionally delete the actual file from disk
    if (fs.existsSync(photo.filepath)) {
      fs.unlinkSync(photo.filepath);
    }

    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const buildMissingImageSvg = (filePath) => {
  const safePath = String(filePath || 'image').replace(/[<>&"']/g, '');
  const label = safePath.length > 80 ? `${safePath.slice(0, 77)}...` : safePath;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#f3f4f6" />
      <rect x="80" y="80" width="640" height="440" rx="24" fill="#e5e7eb" stroke="#cbd5e1" stroke-width="6" />
      <path d="M220 420L320 300L390 360L520 220L650 420H220Z" fill="#94a3b8" />
      <circle cx="270" cy="240" r="56" fill="#64748b" />
      <text x="400" y="500" text-anchor="middle" fill="#475569" font-family="Arial, sans-serif" font-size="24">Image unavailable</text>
      <text x="400" y="540" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="16">${label}</text>
    </svg>
  `;
};

// 7. Serve local photo files securely via stream to bypass browser file:// security
app.get('/api/photo/file', (req, res) => {
  const rawFilePath = Array.isArray(req.query.filePath) ? req.query.filePath[0] : req.query.filePath;

  if (!rawFilePath) {
    return res.status(400).json({ error: 'filePath parameter is required.' });
  }

  try {
    const filePath = decodeURIComponent(rawFilePath);
    const resolvedFilePath = path.resolve(filePath);

    if (!fs.existsSync(resolvedFilePath)) {
      console.warn(`[photo] Missing file path: ${filePath}`);
      res.type('image/svg+xml');
      return res.send(buildMissingImageSvg(filePath));
    }

    const stat = fs.statSync(resolvedFilePath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'Path is not a file.' });
    }

    const ext = path.extname(resolvedFilePath).toLowerCase();
    const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp', '.tiff', '.heif']);
    if (!allowedExts.has(ext)) {
      return res.status(400).json({ error: 'File type not supported for viewing.' });
    }

    res.sendFile(resolvedFilePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Serve Vite client static build in production
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
