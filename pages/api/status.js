import fetch from 'node-fetch';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    console.error("❌ Method Not Allowed: Only GET requests are accepted.");
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { entryId } = req.query;
  if (!entryId) {
    console.error("❌ Missing entryId in request.");
    return res.status(400).json({ error: 'Missing entryId' });
  }

  const LUMA_API_KEY = process.env.LUMA_API_KEY;
  if (!LUMA_API_KEY) {
    console.error("❌ Missing Luma API Key.");
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    // 🔥 Fetch Job IDs and Image URLs from Database
    const result = await sql`
      SELECT first_image_job_id, last_image_job_id, video_job_id, 
             first_image_url, last_image_url, video_url
      FROM gallery WHERE id = ${entryId}
    `;

    if (result.rows.length === 0) {
      console.error(`❌ No entry found for ID: ${entryId}`);
      return res.status(404).json({ error: 'Entry not found' });
    }

    let {
      first_image_job_id,
      last_image_job_id,
      video_job_id,
      first_image_url,
      last_image_url,
      video_url,
    } = result.rows[0];

    console.log(`📡 [${new Date().toISOString()}] Fetched Job IDs:`, 
      { first_image_job_id, last_image_job_id, video_job_id });

    async function checkJobStatus(jobId, type) {
      if (!jobId) return null;

      console.log(`🔄 [${new Date().toISOString()}] Checking ${type} Job Status: ${jobId}...`);
      const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
      });

      const data = await response.json();
      console.log(`📊 [${new Date().toISOString()}] ${type} Status Response:`, data);

      if (data.state === 'failed') {
        console.error(`❌ Luma ${type} job ${jobId} failed: ${data.failure_reason}`);
        return null;
      }

      return data.state === 'completed' ? (type === 'Video' ? data.assets.video : data.assets.image) : null;
    }

    // ✅ Fetch latest status from Luma API **only if URLs are still missing**
    let updatedFirstImageUrl = first_image_url || await checkJobStatus(first_image_job_id, "First Image");
    let updatedLastImageUrl = last_image_url || await checkJobStatus(last_image_job_id, "Last Image");
    let updatedVideoUrl = video_url || (video_job_id ? await checkJobStatus(video_job_id, "Video") : null);

    const readyForVideo = !!(updatedFirstImageUrl && updatedLastImageUrl);
    const readyForMux = !!updatedVideoUrl;

    console.log("📊 [Final Status Update]:", { 
      firstImageUrl: updatedFirstImageUrl, 
      lastImageUrl: updatedLastImageUrl, 
      videoUrl: updatedVideoUrl, 
      readyForVideo, 
      readyForMux 
    });

    // ✅ Update the database **only if new values exist**
    if (updatedFirstImageUrl !== first_image_url || 
        updatedLastImageUrl !== last_image_url || 
        updatedVideoUrl !== video_url) {
      
      await sql`
        UPDATE gallery
        SET 
          first_image_url = COALESCE(${updatedFirstImageUrl}, first_image_url),
          last_image_url = COALESCE(${updatedLastImageUrl}, last_image_url),
          video_url = COALESCE(${updatedVideoUrl}, video_url)
        WHERE id = ${entryId};
      `;

      console.log(`✅ [${new Date().toISOString()}] Database Updated for entryId: ${entryId}`);
    }

    res.status(200).json({ 
      firstImageUrl: updatedFirstImageUrl, 
      lastImageUrl: updatedLastImageUrl, 
      videoUrl: updatedVideoUrl, 
      readyForVideo, 
      readyForMux 
    });

  } catch (error) {
    console.error("❌ Error checking job status:", error);
    res.status(500).json({ error: error.message });
  }
}
