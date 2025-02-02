import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstImageJobId, lastImageJobId } = req.query;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;

  if (!LUMA_API_KEY) {
    console.error('❌ Missing Luma API Key');
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    async function checkJobStatus(jobId) {
      const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
      });

      const data = await response.json();
      console.log(`🔄 Status Check for Job ${jobId}:`, data);

      if (data.state === 'failed') {
        throw new Error(`❌ Luma job ${jobId} failed: ${data.failure_reason}`);
      }

      return data.state === 'completed' ? data.assets.image : null;
    }

    const firstImageUrl = await checkJobStatus(firstImageJobId);
    const lastImageUrl = await checkJobStatus(lastImageJobId);

    if (firstImageUrl && lastImageUrl) {
      console.log('✅ Both images are ready! Proceeding to video generation...');
      return res.status(200).json({
        firstImageUrl,
        lastImageUrl,
        readyForVideo: true
      });
    }

    res.status(200).json({
      firstImageUrl,
      lastImageUrl,
      readyForVideo: false
    });

  } catch (error) {
    console.error('❌ Error checking image status:', error);
    res.status(500).json({ error: error.message });
  }
}
