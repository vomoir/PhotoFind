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

// 6. Serve local photo files securely via stream to bypass browser file:// security
app.get('/api/photo/file', (req, res) => {
  const { filePath } = req.query;

  if (!filePath) {
    return res.status(400).json({ error: 'filePath parameter is required.' });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on system.' });
    }

    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'Path is not a file.' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp', '.tiff', '.heif']);
    if (!allowedExts.has(ext)) {
      return res.status(400).json({ error: 'File type not supported for viewing.' });
    }

    res.sendFile(path.resolve(filePath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Serve Vite client static build in production
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
