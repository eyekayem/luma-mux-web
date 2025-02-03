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
    async function checkJobStatus(jobId, label) {
      if (!jobId) {
        console.error(`❌ Missing ${label} Job ID`);
        return null;
      }

      console.log(`🔄 Checking status for ${label} Image (Job ID: ${jobId})...`);

      const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
      });

      if (!response.ok) {
        console.error(`❌ API Error for ${label} Image: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      console.log(`🔍 Response for ${label} Image:`, JSON.stringify(data, null, 2));

      if (data.state === 'failed') {
        console.error(`❌ Luma job ${jobId} failed: ${data.failure_reason}`);
        return null;
      }

      // Ensure assets exist before accessing image URL
      return data.state === 'completed' && data.assets?.image ? data.assets.image : null;
    }

    const firstImageUrl = await checkJobStatus(firstImageJobId, "First");
    const lastImageUrl = await checkJobStatus(lastImageJobId, "Last");

    if (firstImageUrl && lastImageUrl) {
      console.log('✅ Both images are ready! Proceeding to video generation...');
      res.status(200).json({ firstImageUrl, lastImageUrl, readyForVideo: true });
    } else {
      console.log('⏳ Waiting for images to complete...');
      res.status(200).json({ firstImageUrl, lastImageUrl, readyForVideo: false });
    }
  } catch (error) {
    console.error('❌ Error checking job status:', error);
    res.status(500).json({ error: error.message });
  }
}
