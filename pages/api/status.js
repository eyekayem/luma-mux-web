import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstImageJobId, lastImageJobId, videoJobId } = req.query;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;

  if (!LUMA_API_KEY) {
    console.error('❌ Missing Luma API Key');
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    const checkJobStatus = async (jobId, type) => {
      const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
      });
      const data = await response.json();
      console.log(`🔄 Status Check for ${type}:`, data);
      return data;
    };

    const firstImageStatus = firstImageJobId ? await checkJobStatus(firstImageJobId, "First Image") : null;
    const lastImageStatus = lastImageJobId ? await checkJobStatus(lastImageJobId, "Last Image") : null;
    const videoStatus = videoJobId ? await checkJobStatus(videoJobId, "Video") : null;

    res.status(200).json({ firstImageStatus, lastImageStatus, videoStatus });
  } catch (error) {
    console.error('❌ Error checking status:', error);
    res.status(500).json({ error: error.message });
  }
}
