import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { firstImagePrompt, lastImagePrompt, videoPrompt } = req.body;

    // ✅ Insert into the database
    const result = await sql`
      INSERT INTO gallery (firstImagePrompt, lastImagePrompt, videoPrompt, firstImageUrl, lastImageUrl, muxPlaybackId)
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
