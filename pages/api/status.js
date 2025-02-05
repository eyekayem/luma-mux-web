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

  // ✅ Convert entryId to an integer to prevent SQL errors
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
    // 🔥 Fetch Job IDs and Image URLs from Database
    const result = await sql`
      SELECT first_image_job_id, last_image_job_id, video_job_id, 
             first_image_url, last_image_url, video_url
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

    console.log(`📡 Fetched Job IDs:`, { first_image_job_id, last_image_job_id, video_job_id });

    async function checkJobStatus(jobId, type) {
      if (!jobId) return null;
    
      console.log(`🔄 Checking ${type} Job Status: ${jobId}...`);
    
      try {
        const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
        });
    
        const data = await response.json();
        console.log(`📊 ${type} Full Response:`, JSON.stringify(data, null, 2)); // 🔥 Debugging Log
    
        if (data.state === 'failed') {
          console.error(`❌ Luma ${type} job ${jobId} failed: ${data.failure_reason}`);
          return null;
        }
    
        if (data.state !== 'completed') {
          console.log(`⏳ ${type} still processing...`);
          return "pending"; // ✅ Ensure we track pending correctly
        }
    
        return type === 'Video' ? data.assets.video : data.assets.image;
    
      } catch (error) {
        console.error(`❌ Error fetching ${type} job ${jobId}:`, error);
        return null;
      }
    }
    
    // ✅ Fetch latest status from Luma API only if URLs are still missing or pending
    let updatedFirstImageUrl = first_image_url === "pending" || !first_image_url
      ? await checkJobStatus(first_image_job_id, "First Image")
      : first_image_url;
    
    let updatedLastImageUrl = last_image_url === "pending" || !last_image_url
      ? await checkJobStatus(last_image_job_id, "Last Image")
      : last_image_url;
    
    let updatedVideoUrl = video_url === "pending" || (!video_url && video_job_id)
      ? await checkJobStatus(video_job_id, "Video")
      : video_url;
    
    // ✅ Ensure we only mark as ready when URLs are NOT "pending"
    const readyForVideo = updatedFirstImageUrl && updatedLastImageUrl && updatedFirstImageUrl !== "pending" && updatedLastImageUrl !== "pending";
    const readyForMux = updatedVideoUrl && updatedVideoUrl !== "pending";
    
    console.log("📊 Status Update:", { 
      firstImageUrl: updatedFirstImageUrl, 
      lastImageUrl: updatedLastImageUrl, 
      videoUrl: updatedVideoUrl, 
      readyForVideo, 
      readyForMux 
    });
    
    // ✅ Update the database only if new values exist (and are not "pending")
    if (
      (updatedFirstImageUrl && updatedFirstImageUrl !== "pending") || 
      (updatedLastImageUrl && updatedLastImageUrl !== "pending") || 
      (updatedVideoUrl && updatedVideoUrl !== "pending")
    ) {
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
    }

// ✅ Respond with the updated values
res.status(200).json({ 
  firstImageUrl: updatedFirstImageUrl, 
  lastImageUrl: updatedLastImageUrl, 
  videoUrl: updatedVideoUrl, 
  readyForVideo, 
  readyForMux 
});


    // ✅ Update the database only if new values exist
    if (updatedFirstImageUrl || updatedLastImageUrl || updatedVideoUrl) {
      console.log(`🔄 Updating database entry ${parsedEntryId} with new image/video URLs...`);
      await sql`
        UPDATE gallery
        SET 
          first_image_url = COALESCE(${updatedFirstImageUrl}::text, first_image_url),
          last_image_url = COALESCE(${updatedLastImageUrl}::text, last_image_url),
          video_url = COALESCE(${updatedVideoUrl}::text, video_url)
        WHERE id = ${parsedEntryId}::integer;
      `;
      console.log(`✅ Database Updated for entryId: ${parsedEntryId}`);
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
