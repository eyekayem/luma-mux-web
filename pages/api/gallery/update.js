import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  console.log("📝 Incoming Request:", req.body); // ✅ Log request body

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ Extract fields from request body
    let { 
      entryId, 
      firstImagePrompt, 
      lastImagePrompt, 
      videoPrompt, 
      muxPlaybackId, 
      muxPlaybackUrl, 
      muxJobId 
    } = req.body;

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
        INSERT INTO gallery (
          first_image_prompt, last_image_prompt, video_prompt, 
          first_image_url, last_image_url, mux_playback_id, 
          mux_playback_url, mux_job_id
        )
        VALUES (
          ${firstImagePrompt || 'pending'}, 
          ${lastImagePrompt || 'pending'}, 
          ${videoPrompt || 'pending'}, 
          'pending', 'pending', 'waiting', 
          NULL, NULL
        )
        RETURNING id;
      `;

      console.log("✅ New gallery entry created:", result.rows[0].id);
      return res.status(200).json({ entryId: result.rows[0].id });
    } else {
      // 🔄 **Update an existing entry**
      console.log(`🔄 Updating gallery entry ${entryId}...`);

      // ✅ Construct update query manually
      const updates = [];
      if (firstImagePrompt) updates.push(`first_image_prompt = '${firstImagePrompt}'`);
      if (lastImagePrompt) updates.push(`last_image_prompt = '${lastImagePrompt}'`);
      if (videoPrompt) updates.push(`video_prompt = '${videoPrompt}'`);
      if (muxPlaybackId) updates.push(`mux_playback_id = '${muxPlaybackId}'`);
      if (muxPlaybackUrl) updates.push(`mux_playback_url = '${muxPlaybackUrl}'`);
      if (muxJobId) updates.push(`mux_job_id = '${muxJobId}'`);

      if (updates.length === 0) {
        console.warn("⚠️ No valid fields provided for update.");
        return res.status(400).json({ error: "No fields to update" });
      }

      // ✅ Use string template for SQL update
      const updateQuery = `UPDATE gallery SET ${updates.join(", ")} WHERE id = ${entryId} RETURNING id;`;
      const result = await sql`${sql.raw(updateQuery)}`;

      if (result.rows.length === 0) {
        console.error(`❌ No entry found for ID: ${entryId}`);
        return res.status(404).json({ error: 'Entry not found' });
      }

      console.log("✅ Gallery entry updated:", result.rows[0].id);
      return res.status(200).json({ entryId: result.rows[0].id });
    }
  } catch (error) {
    console.error("❌ Error handling gallery entry:", error);
    res.status(500).json({ error: 'Failed to process gallery entry' });
  }
}
