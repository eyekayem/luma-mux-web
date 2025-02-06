import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  console.log("📝 Incoming Request:", req.body); // ✅ Log request body

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ Extract variables from frontend
    const { entryId, firstImageUrl, lastImageUrl, videoUrl, videoJobId, muxPlaybackId } = req.body;

    if (!entryId) {
      console.error("❌ Missing entryId in request.");
      return res.status(400).json({ error: "Missing entryId" });
    }

    const parsedEntryId = parseInt(entryId, 10);
    if (isNaN(parsedEntryId)) {
      console.error(`❌ Invalid entryId: ${entryId}`);
      return res.status(400).json({ error: "Invalid entryId" });
    }

    // ✅ Log received data
    console.log(`📡 Updating gallery entry ${parsedEntryId} with:`, {
      firstImageUrl, lastImageUrl, videoUrl, videoJobId, muxPlaybackId
    });

    // ✅ Update the database only if new values exist
    const result = await sql`
      UPDATE gallery
      SET 
        first_image_url = COALESCE(NULLIF(${firstImageUrl}, 'pending')::text, first_image_url),
        last_image_url = COALESCE(NULLIF(${lastImageUrl}, 'pending')::text, last_image_url),
        video_url = COALESCE(NULLIF(${videoUrl}, 'pending')::text, video_url),
        video_job_id = COALESCE(NULLIF(${videoJobId}, 'pending')::text, video_job_id),
        mux_playback_id = COALESCE(NULLIF(${muxPlaybackId}, 'pending')::text, mux_playback_id)
      WHERE id = ${parsedEntryId}::integer
      RETURNING *;
    `;

    console.log(`✅ Database Updated for entryId: ${parsedEntryId}`, result.rows[0]);
    res.status(200).json({ success: true, updatedEntry: result.rows[0] });

  } catch (error) {
    console.error("❌ Error updating gallery entry:", error);
    res.status(500).json({ error: 'Failed to update gallery entry' });
  }
}
