import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstImageJobId, lastImageJobId } = req.query;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;
  if (!LUMA_API_KEY) {
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    // Poll first image status
    const firstImageResponse = await fetch(`https://api.lumalabs.ai/dream-machine/v1/jobs/${firstImageJobId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
    });
    const firstImageData = await firstImageResponse.json();

    // Poll last image status
    const lastImageResponse = await fetch(`https://api.lumalabs.ai/dream-machine/v1/jobs/${lastImageJobId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
    });
    const lastImageData = await lastImageResponse.json();

    res.status(200).json({
      firstImage: firstImageData.output_url,
      lastImage: lastImageData.output_url
    });
  } catch (error) {
    console.error('Error fetching Luma job status:', error);
    res.status(500).json({ error: error.message });
  }
}
