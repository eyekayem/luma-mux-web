import { Pool } from '@neondatabase/serverless';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Ensure this is set in Vercel
  ssl: true,
});

// Handle API requests
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 36; // Default limit to 36
    try {
      console.log("📡 Fetching shared gallery from database...");
      const result = await pool.query(
        `SELECT * FROM featured_gallery ORDER BY RANDOM() LIMIT $1`, // Randomize the entries
        [limit]
      );
      res.status(200).json({ gallery: result.rows });
    } catch (error) {
      console.error("❌ Database Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  } else if (req.method === 'POST') {
      console.log('📩 Incoming Data:', req.body); // Add this line to log the incoming data

    try {
      console.log("📝 Adding new entry to shared gallery...");

      const { entryId, firstImagePrompt, firstImageUrl, lastImagePrompt, lastImageUrl, videoPrompt, muxPlaybackId } = req.body;

      if (!firstImagePrompt || !firstImageUrl || !lastImagePrompt || !lastImageUrl || !videoPrompt || !muxPlaybackId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      let result;
      if (entryId === 0) {
        result = await pool.query(
          `INSERT INTO gallery (first_image_prompt, first_image_url, last_image_prompt, last_image_url, video_prompt, mux_playback_id, featured)
           VALUES ($1, $2, $3, $4, $5, $6, 'Y') RETURNING *`,
          [firstImagePrompt, firstImageUrl, lastImagePrompt, lastImageUrl, videoPrompt, muxPlaybackId]
        );
        console.log("✅ New Entry Created:", result.rows[0]);
      } else {
        const updateFields = [];
        const values = [];
        const keys = Object.keys(req.body);
        keys.forEach((key, index) => {
          const value = req.body[key];
          if (key !== 'entryId' && value !== undefined) {
            updateFields.push(`${key} = $${index + 1}`);
            values.push(value);
          }
        });
        values.push(entryId);

        result = await pool.query(
          `UPDATE gallery SET ${updateFields.join(', ')} WHERE id = $${values.length} RETURNING *`,
          values
        );
        console.log("✅ Entry Updated:", result.rows[0]);
      }

      res.status(200).json({ message: "Gallery updated successfully", entry: result.rows[0] });
    } catch (error) {
      console.error("❌ Database Insert/Error:", error);
      res.status(500).json({ error: "Failed to save entry" });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
