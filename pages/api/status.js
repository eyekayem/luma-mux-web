import fetch from 'node-fetch';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    console.error("❌ Method Not Allowed: Only GET requests are accepted.");
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { entryId, firstImageJobId, lastImageJobId, videoJobId } = req.query;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;

  if (!entryId) {
    console.error("❌ Missing entryId in request.");
    return res.status(400).json({ error: 'Missing entryId' });
  }

  if (!LUMA_API_KEY) {
    console.error("❌ Missing Luma API Key.");
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    async function checkJobStatus(jobId, type) {
      if (!jobId) return null;

      console.log(`🔄 Checking ${type} Job Status: ${jobId}...`);
      const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
      });

      const data = await response.json();
      console.log(`📊 ${type} Status Response:`, data);

      if (data.state === 'failed') {
        throw new Error(`❌ Luma ${type} job ${jobId} failed: ${data.failure_reason}`);
      }

      return data.state === 'completed' ? (type === 'Video' ? data.assets.video : data.assets.image) : null;
    }

    // ✅ Fetch latest status from Luma
    const firstImageUrl = await checkJobStatus(firstImageJobId, "First Image");
    const lastImageUrl = await checkJobStatus(lastImageJobId, "Last Image");
    const videoUrl = videoJobId ? await checkJobStatus(videoJobId, "Video") : null;

    const readyForVideo = !!(firstImageUrl && lastImageUrl);
    const readyForMux = !!videoUrl;

    console.log("📊 Status Update:", { firstImageUrl, lastImageUrl, videoUrl, readyForVideo, readyForMux });

    // ✅ Update database if images are ready
    if (firstImageUrl || lastImageUrl || videoUrl) {
      await sql`
        UPDATE gallery
        SET 
          first_image_url = COALESCE(${firstImageUrl}, first_image_url),
          last_image_url = COALESCE(${lastImageUrl}, last_image_url),
          mux_playback_id = COALESCE(${videoUrl}, mux_playback_id)
        WHERE id = ${entryId};
      `;
      console.log(`✅ Database Updated for entryId: ${entryId}`);
    }

    res.status(200).json({ firstImageUrl, lastImageUrl, videoUrl, readyForVideo, readyForMux });

  } catch (error) {
    console.error("❌ Error checking job status:", error);
    res.status(500).json({ error: error.message });
  }
}
