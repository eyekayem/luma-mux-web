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
        INSERT INTO gallery (first_image_prompt, last_image_prompt, video_prompt, first_image_url, last_image_url, mux_playback_id, mux_playback_url, mux_job_id)
        VALUES (${firstImagePrompt || 'pending'}, ${lastImagePrompt || 'pending'}, ${videoPrompt || 'pending'}, 'pending', 'pending', 'waiting', NULL, NULL)
        RETURNING id;
      `;

      console.log("✅ New gallery entry created:", result.rows[0].id);
      return res.status(200).json({ entryId: result.rows[0].id });
    } 
    
    // 🔄 **Update an existing entry**
    console.log(`🔄 Updating gallery entry ${entryId}...`);

    // ✅ Collect only fields that need to be updated
    const updateFields = {};
    if (firstImagePrompt) updateFields.first_image_prompt = firstImagePrompt;
    if (lastImagePrompt) updateFields.last_image_prompt = lastImagePrompt;
    if (videoPrompt) updateFields.video_prompt = videoPrompt;
    if (muxPlaybackId) updateFields.mux_playback_id = muxPlaybackId;
    if (muxPlaybackUrl) updateFields.mux_playback_url = muxPlaybackUrl;
    if (muxJobId) updateFields.mux_job_id = muxJobId;

    // ✅ Ensure there's something to update
    if (Object.keys(updateFields).length === 0) {
      console.warn("⚠️ No valid fields provided for update.");
      return res.status(400).json({ error: "No fields to update" });
    }

    // ✅ Dynamically construct SET statement for SQL update
    const setClauses = Object.entries(updateFields).map(([key, value]) => sql`${sql.raw(key)} = ${value}`);

    // ✅ Execute the update query
    const result = await sql`
      UPDATE gallery
      SET ${sql.raw(setClauses.join(', '))}
      WHERE id = ${entryId}
      RETURNING id;
    `;

    if (result.rows.length === 0) {
      console.error(`❌ No entry found for ID: ${entryId}`);
      return res.status(404).json({ error: 'Entry not found' });
    }

    console.log("✅ Gallery entry updated:", result.rows[0].id);
    return res.status(200).json({ entryId: result.rows[0].id });

  } catch (error) {
    console.error("❌ Error handling gallery entry:", error);
    res.status(500).json({ error: 'Failed to process gallery entry' });
  }
}
