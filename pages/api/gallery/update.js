import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { entryId, firstImagePrompt, lastImagePrompt, videoPrompt, 
          firstImageUrl, lastImageUrl, videoUrl, muxJobId, muxPlaybackUrl } = req.body;

  if (!entryId) {
    return res.status(400).json({ error: 'Missing entryId' });
  }

  try {
    console.log(`🔄 Updating entry ${entryId} in gallery...`);

    await sql`
      UPDATE gallery
      SET 
        first_image_prompt = COALESCE(${firstImagePrompt}, first_image_prompt),
        last_image_prompt = COALESCE(${lastImagePrompt}, last_image_prompt),
        video_prompt = COALESCE(${videoPrompt}, video_prompt),
        first_image_url = COALESCE(NULLIF(${firstImageUrl}, 'pending')::text, first_image_url),
        last_image_url = COALESCE(NULLIF(${lastImageUrl}, 'pending')::text, last_image_url),
        video_url = COALESCE(NULLIF(${videoUrl}, 'pending')::text, video_url),
        mux_job_id = COALESCE(${muxJobId}, mux_job_id),
        mux_playback_url = COALESCE(${muxPlaybackUrl}, mux_playback_url)
      WHERE id = ${entryId}::integer;
    `;

    console.log(`✅ Gallery entry ${entryId} updated successfully.`);
    res.status(200).json({ success: true });

  } catch (error) {
    console.error("❌ Error updating gallery entry:", error);
    res.status(500).json({ error: error.message });
  }
}
