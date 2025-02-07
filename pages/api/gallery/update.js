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
    const updateFields = [];
    const updateValues = [];

    const fieldMap = {
      firstImagePrompt: "first_image_prompt",
      lastImagePrompt: "last_image_prompt",
      videoPrompt: "video_prompt",
      muxPlaybackId: "mux_playback_id",
      muxPlaybackUrl: "mux_playback_url",
      muxJobId: "mux_job_id"
    };
    
    Object.entries(req.body).forEach(([key, value]) => {
      const columnName = fieldMap[key];
      if (columnName && value !== undefined) {
        updateFields.push(`${columnName} = $${updateFields.length + 1}`);
        updateValues.push(value);
      }
    });


    if (updateFields.length === 0) {
      console.warn("⚠️ No valid fields provided for update.");
      return res.status(400).json({ error: "No fields to update" });
    }

    updateValues.push(entryId); // Push entryId as the last parameter

    // ✅ Execute SQL Update Query
    const query = `UPDATE gallery SET ${updateFields.join(', ')} WHERE id = $${updateValues.length} RETURNING id;`;
    const result = await sql.query(query, updateValues);

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
