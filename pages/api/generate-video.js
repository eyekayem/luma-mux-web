import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🎬 Starting Video Generation...');

  const { firstImage, lastImage, videoPrompt } = req.body;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;

  if (!LUMA_API_KEY) {
    console.error('❌ Missing Luma API Key');
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    console.log('📽️ Sending video generation request...');
    const videoResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/video', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: videoPrompt,
        image_start: firstImage,
        image_end: lastImage,
        model: "ray-1.6"
      })
    });

    const videoData = await videoResponse.json();
    if (!videoData.id) throw new Error('❌ Failed to create video');

    console.log(`✅ Video Job Created: ${videoData.id}`);
    res.status(200).json({ videoJobId: videoData.id });

  } catch (error) {
    console.error('❌ Error generating video:', error);
    res.status(500).json({ error: error.message });
  }
}
