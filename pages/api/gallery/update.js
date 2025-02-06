import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  console.log("📝 Incoming Request:", req.body); // ✅ Log request body

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ Extract fields from request body
    let { entryId, firstImagePrompt, lastImagePrompt, videoPrompt, muxPlaybackId, muxPlaybackUrl, muxJobId } = req.body;

    // ✅ Convert entryId to an integer
    entryId = parseInt(entryId, 10);
    if (isNaN(entryId)) {
      console.error("❌ Invalid entryId:", entryId);
      return res.status(400).json({ error: "Invalid entryId" });
    }

    if (entryId === 0) {
      // 🔥 **Create a new entry**
      console.log("🆕 Creating new gallery entry...");
      const result = await sql`
        INSERT INTO gallery (first_image_prompt, last_image_prompt, video_prompt, first_image_url, last_image_url, mux_playback_id)
        VALUES (${firstImagePrompt || 'pending'}, ${lastImagePrompt || 'pending'}, ${videoPrompt || 'pending'}, 'pending', 'pending', 'waiting')
        RETURNING id;
      `;

      console.log("✅ New gallery entry created:", result.rows[0].id);
      return res.status(200).json({ entryId: result.rows[0].id });
    } else {
      // 🔄 **Update an existing entry**
      console.log(`🔄 Updating gallery entry ${entryId}...`);

      if (firstImagePrompt) {
        await sql`UPDATE gallery SET first_image_prompt = ${firstImagePrompt} WHERE id = ${entryId}`;
      }
      if (lastImagePrompt) {
        await sql`UPDATE gallery SET last_image_prompt = ${lastImagePrompt} WHERE id = ${entryId}`;
      }
      if (videoPrompt) {
        await sql`UPDATE gallery SET video_prompt = ${videoPrompt} WHERE id = ${entryId}`;
      }
      if (muxPlaybackId) {
        await sql`UPDATE gallery SET mux_playback_id = ${muxPlaybackId} WHERE id = ${entryId}`;
      }
      if (muxPlaybackUrl) {
        await sql`UPDATE gallery SET mux_playback_url = ${muxPlaybackUrl} WHERE id = ${entryId}`;
      }
      if (muxJobId) {
        await sql`UPDATE gallery SET mux_job_id = ${muxJobId} WHERE id = ${entryId}`;
      }

      console.log("✅ Gallery entry updated:", entryId);
      return res.status(200).json({ entryId });
    }
  } catch (error) {
    console.error("❌ Error handling gallery entry:", error);
    res.status(500).json({ error: 'Failed to process gallery entry' });
  }
}
