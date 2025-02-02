import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🟢 Starting media generation process');

  const { firstImagePrompt, lastImagePrompt } = req.body;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;

  if (!LUMA_API_KEY) {
    console.error('❌ Missing Luma API Key');
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    console.log('📸 Creating First Image...');
    const firstImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: firstImagePrompt, model: "photon-1", aspect_ratio: "16:9" })
    });
    const firstImageData = await firstImageResponse.json();
    if (!firstImageData.id) throw new Error('❌ Failed to create first image');

    console.log('📸 Creating Last Image...');
    const lastImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: lastImagePrompt, model: "photon-1", aspect_ratio: "16:9" })
    });
    const lastImageData = await lastImageResponse.json();
    if (!lastImageData.id) throw new Error('❌ Failed to create last image');

    console.log('✅ Image jobs created successfully!');

    res.status(200).json({
      firstImageJobId: firstImageData.id,
      lastImageJobId: lastImageData.id
    });

  } catch (error) {
    console.error('❌ Error generating media:', error);
    res.status(500).json({ error: error.message });
  }
}
