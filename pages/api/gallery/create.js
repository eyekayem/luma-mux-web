import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  console.log("📝 Incoming Request:", req.body); // ✅ Log request body

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ Extract camelCase variables from frontend
    const { firstImagePrompt, lastImagePrompt, videoPrompt } = req.body;

    // ✅ Insert into the database using snake_case for SQL
    const result = await sql`
      INSERT INTO gallery (first_image_prompt, last_image_prompt, video_prompt, first_image_url, last_image_url, mux_playback_id)
      VALUES (${firstImagePrompt}, ${lastImagePrompt}, ${videoPrompt}, 'pending', 'pending', 'waiting')
      RETURNING id;
    `;

    console.log("✅ New gallery entry created:", result.rows[0].id);
    res.status(200).json({ entryId: result.rows[0].id });

  } catch (error) {
    console.error("❌ Error inserting gallery entry:", error);
    res.status(500).json({ error: 'Failed to insert gallery entry' });
  }
}
