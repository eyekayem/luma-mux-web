import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔄 Checking job status');

  const { firstImageJobId, lastImageJobId, videoJobId } = req.query;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;

  if (!LUMA_API_KEY) {
    console.error('❌ Missing Luma API Key');
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    async function checkJob(jobId) {
      const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
      });
      const data = await response.json();
      return data;
    }

    const firstImageStatus = firstImageJobId ? await checkJob(firstImageJobId) : null;
    const lastImageStatus = lastImageJobId ? await checkJob(lastImageJobId) : null;
    const videoStatus = videoJobId ? await checkJob(videoJobId) : null;

    console.log(`📸 First Image Status: ${firstImageStatus?.state}`);
    console.log(`📸 Last Image Status: ${lastImageStatus?.state}`);
    console.log(`🎬 Video Status: ${videoStatus?.state}`);

    res.status(200).json({
      firstImageStatus: firstImageStatus?.state,
      lastImageStatus: lastImageStatus?.state,
      videoStatus: videoStatus?.state,
      firstImageUrl: firstImageStatus?.assets?.[0]?.url || null,
      lastImageUrl: lastImageStatus?.assets?.[0]?.url || null,
      videoUrl: videoStatus?.assets?.[0]?.url || null,
      status: firstImageStatus?.state === 'completed' && lastImageStatus?.state === 'completed' && videoStatus?.state === 'completed' ? 'ready' : 'pending'
    });
  } catch (error) {
    console.error('❌ Error checking job status:', error);
    res.status(500).json({ error: error.message });
  }
}
