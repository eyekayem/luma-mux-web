import fs from 'fs';
import path from 'path';

const GALLERY_FILE = path.join(process.cwd(), 'public/gallery.json');

export default function handler(req, res) {
  if (req.method === 'GET') {
    console.log("📡 Fetching shared gallery...");
    
    if (fs.existsSync(GALLERY_FILE)) {
      const galleryData = JSON.parse(fs.readFileSync(GALLERY_FILE, 'utf8'));
      res.status(200).json({ gallery: galleryData });
    } else {
      res.status(200).json({ gallery: [] });
    }

  } else if (req.method === 'POST') {
    console.log("📝 Adding new entry to shared gallery...");

    const newEntry = req.body;
    let galleryData = [];

    if (fs.existsSync(GALLERY_FILE)) {
      galleryData = JSON.parse(fs.readFileSync(GALLERY_FILE, 'utf8'));
    }

    galleryData.unshift(newEntry); // Add new entry at the top

    fs.writeFileSync(GALLERY_FILE, JSON.stringify(galleryData, null, 2));

    res.status(200).json({ message: "Gallery updated successfully" });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
