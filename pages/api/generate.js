import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstImagePrompt, lastImagePrompt, videoPrompt } = req.body;

  const LUMA_API_KEY = process.env.LUMA_API_KEY;
  if (!LUMA_API_KEY) {
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    // Generate first image
    const firstImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: firstImagePrompt })
    });
    const firstImageData = await firstImageResponse.json();
    if (!firstImageData.job_id) throw new Error('Failed to create first image');

    // Generate last image
    const lastImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: lastImagePrompt })
    });
    const lastImageData = await lastImageResponse.json();
    if (!lastImageData.job_id) throw new Error('Failed to create last image');

    res.status(200).json({
      firstImageJobId: firstImageData.job_id,
      lastImageJobId: lastImageData.job_id,
      videoPrompt
    });
  } catch (error) {
    console.error('Error generating media:', error);
    res.status(500).json({ error: error.message });
  }
}
