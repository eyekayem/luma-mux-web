import { Pool } from '@neondatabase/serverless';

// ✅ Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // 🔥 Ensure this is set in Vercel
  ssl: true,
});

// ✅ Handle API requests
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 6; // Default limit to 6 if not provided
    try {
      console.log("📡 Fetching shared gallery from database...");
      const result = await pool.query(
        `SELECT * FROM featured_gallery LIMIT $1`,
        [limit]
      );
      res.status(200).json({ gallery: result.rows });
    } catch (error) {
      console.error("❌ Database Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  }

  else if (req.method === 'POST') {
    try {
      console.log("📝 Adding new entry to shared gallery...");

      const { firstImagePrompt, firstImageUrl, lastImagePrompt, lastImageUrl, videoPrompt, muxPlaybackId } = req.body;
      if (!firstImagePrompt || !firstImageUrl || !lastImagePrompt || !lastImageUrl || !videoPrompt || !muxPlaybackId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const result = await pool.query(
        `INSERT INTO gallery (first_image_prompt, first_image_url, last_image_prompt, last_image_url, video_prompt, mux_playback_id, featured)
         VALUES ($1, $2, $3, $4, $5, $6, 'Y') RETURNING *`,
        [firstImagePrompt, firstImageUrl, lastImagePrompt, lastImageUrl, videoPrompt, muxPlaybackId]
      );

      console.log("✅ New Entry Saved:", result.rows[0]);
      res.status(200).json({ message: "Gallery updated successfully", entry: result.rows[0] });
    } catch (error) {
      console.error("❌ Database Insert Error:", error);
      res.status(500).json({ error: "Failed to save entry" });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
