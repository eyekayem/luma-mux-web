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
    // 🔥 Fetch Job IDs from Database if not provided in request
    const result = await sql`
      SELECT first_image_job_id, last_image_job_id, video_job_id, first_image_url, last_image_url, video_url
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

    console.log(`📡 Fetched Job IDs:`, { first_image_job_id, last_image_job_id, video_job_id });

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

    // ✅ Fetch latest status from Luma API if URLs are still pending
    if (!first_image_url) first_image_url = await checkJobStatus(first_image_job_id, "First Image");
    if (!last_image_url) last_image_url = await checkJobStatus(last_image_job_id, "Last Image");
    if (!video_url && video_job_id) video_url = await checkJobStatus(video_job_id, "Video");

    const readyForVideo = !!(first_image_url && last_image_url);
    const readyForMux = !!video_url;

    console.log("📊 Status Update:", { first_image_url, last_image_url, video_url, readyForVideo, readyForMux });

    // ✅ Update the database if new URLs are found
    if (first_image_url || last_image_url || video_url) {
      await sql`
        UPDATE gallery
        SET 
          first_image_url = COALESCE(${first_image_url}, first_image_url),
          last_image_url = COALESCE(${last_image_url}, last_image_url),
          video_url = COALESCE(${video_url}, video_url)
        WHERE id = ${entryId};
      `;
      console.log(`✅ Database Updated for entryId: ${entryId}`);
    }

    res.status(200).json({ firstImageUrl: first_image_url, lastImageUrl: last_image_url, videoUrl: video_url, readyForVideo, readyForMux });

  } catch (error) {
    console.error("❌ Error checking job status:", error);
    res.status(500).json({ error: error.message });
  }
}
