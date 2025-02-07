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

  const parsedEntryId = parseInt(entryId, 10);
  if (isNaN(parsedEntryId)) {
    console.error(`❌ Invalid entryId: ${entryId}`);
    return res.status(400).json({ error: "Invalid entryId" });
  }

  const LUMA_API_KEY = process.env.LUMA_API_KEY;
  if (!LUMA_API_KEY) {
    console.error("❌ Missing Luma API Key.");
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    const result = await sql`
      SELECT first_image_job_id, last_image_job_id, video_job_id, 
             first_image_url, last_image_url, video_url,
             mux_playback_id, mux_playback_url
      FROM gallery WHERE id = ${parsedEntryId}
    `;


    if (result.rows.length === 0) {
      console.error(`❌ No entry found for ID: ${parsedEntryId}`);
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

    if (!video_job_id) {
      console.warn(`⚠️ Missing videoJobId in request. Fetching from DB...`);
      video_job_id = result.rows[0].video_job_id;
    }
    console.log(`📡 Fetched Job IDs:`, { first_image_job_id, last_image_job_id, video_job_id });

    async function checkJobStatus(jobId, type) {
      if (!jobId) return "pending";

      console.log(`🔄 Checking ${type} Job Status: ${jobId}...`);

      try {
        const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
        });

        const data = await response.json();
        console.log(`📊 ${type} Full Response:`, JSON.stringify(data, null, 2));

        if (data.state === 'failed') {
          console.error(`❌ Luma ${type} job ${jobId} failed: ${data.failure_reason}`);
          return "failed";
        }

        if (data.state !== 'completed') {
          console.log(`⏳ ${type} still processing...`);
          return "pending";
        }

        return type === 'Video' ? data.assets.video : data.assets.image;
      } catch (error) {
        console.error(`❌ Error fetching ${type} job ${jobId}:`, error);
        return "pending";
      }
    }

    let updatedFirstImageUrl = (first_image_url === "pending" || !first_image_url)
      ? await checkJobStatus(first_image_job_id, "First Image")
      : first_image_url;

    let updatedLastImageUrl = (last_image_url === "pending" || !last_image_url)
      ? await checkJobStatus(last_image_job_id, "Last Image")
      : last_image_url;

    let updatedVideoUrl = (video_url === "pending" || (!video_url && video_job_id))
      ? await checkJobStatus(video_job_id, "Video")
      : video_url;

    const readyForVideo = updatedFirstImageUrl !== "pending" && updatedLastImageUrl !== "pending";
    const readyForMux = updatedVideoUrl !== "pending";

    console.log("📊 Status Update:", { 
      firstImageUrl: updatedFirstImageUrl, 
      lastImageUrl: updatedLastImageUrl, 
      videoUrl: updatedVideoUrl, 
      readyForVideo, 
      readyForMux 
    });

    // ✅ Only update database if values have changed
    const needsUpdate = 
      (updatedFirstImageUrl && updatedFirstImageUrl !== "pending" && updatedFirstImageUrl !== first_image_url) || 
      (updatedLastImageUrl && updatedLastImageUrl !== "pending" && updatedLastImageUrl !== last_image_url) || 
      (updatedVideoUrl && updatedVideoUrl !== "pending" && updatedVideoUrl !== video_url);

    if (needsUpdate) {
      console.log(`🔄 Updating database entry ${parsedEntryId} with new image/video URLs...`);
      await sql`
        UPDATE gallery
        SET 
          first_image_url = COALESCE(NULLIF(${updatedFirstImageUrl}, 'pending')::text, first_image_url),
          last_image_url = COALESCE(NULLIF(${updatedLastImageUrl}, 'pending')::text, last_image_url),
          video_url = COALESCE(NULLIF(${updatedVideoUrl}, 'pending')::text, video_url)
        WHERE id = ${parsedEntryId}::integer;
      `;
      console.log(`✅ Database Updated for entryId: ${parsedEntryId}`);
    } else {
      console.log(`🔹 No changes detected for entryId: ${parsedEntryId}. Skipping database update.`);
    }

    res.status(200).json({ 
      firstImageUrl: updatedFirstImageUrl, 
      lastImageUrl: updatedLastImageUrl, 
      videoUrl: updatedVideoUrl, 
      muxPlaybackId: result.rows[0].mux_playback_id || null,  // ✅ Add Mux ID
      muxPlaybackUrl: result.rows[0].mux_playback_url || null, // ✅ Add Mux URL
      readyForVideo, 
      readyForMux 
    });

  } catch (error) {
    console.error("❌ Error checking job status:", error);
    res.status(500).json({ error: error.message });
  }
}
