import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('🔄 Checking Luma job status...');

  const { firstImageJobId, lastImageJobId, videoJobId } = req.query;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;

  if (!LUMA_API_KEY) {
    console.error('❌ Missing Luma API Key');
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    async function checkJobStatus(jobId) {
      if (!jobId) return null;
      const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
      });
      const data = await response.json();
      if (data.state === 'completed' && data.assets && data.assets.length > 0) {
        return data.assets[0].url;
      }
      return null;
    }

    const firstImageUrl = await checkJobStatus(firstImageJobId);
    const lastImageUrl = await checkJobStatus(lastImageJobId);
    const videoUrl = videoJobId ? await checkJobStatus(videoJobId) : null;

    if (!firstImageUrl || !lastImageUrl) {
      console.log('⏳ Images still processing...');
      return res.status(202).json({ status: 'processing' });
    }

    console.log('✅ All assets ready!');
    res.status(200).json({ firstImageUrl, lastImageUrl, videoUrl });

  } catch (error) {
    console.error('❌ Error checking status:', error);
    res.status(500).json({ error: error.message });
  }
}
