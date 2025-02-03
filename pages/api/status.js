import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    console.error("❌ Method Not Allowed: Only GET requests are accepted.");
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { firstImageJobId, lastImageJobId, videoJobId } = req.query;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;

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

    const firstImageUrl = await checkJobStatus(firstImageJobId, "First Image");
    const lastImageUrl = await checkJobStatus(lastImageJobId, "Last Image");
    const videoUrl = videoJobId ? await checkJobStatus(videoJobId, "Video") : null;

    const readyForVideo = !!(firstImageUrl && lastImageUrl);
    const readyForMux = !!videoUrl;

    console.log("📊 Status Update:", { firstImageUrl, lastImageUrl, videoUrl, readyForVideo, readyForMux });

    res.status(200).json({ firstImageUrl, lastImageUrl, videoUrl, readyForVideo, readyForMux });

  } catch (error) {
    console.error("❌ Error checking job status:", error);
    res.status(500).json({ error: error.message });
  }
}
