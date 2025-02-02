import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstImagePrompt, lastImagePrompt, videoPrompt } = req.body;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;
  const MUX_ACCESS_TOKEN_ID = process.env.MUX_ACCESS_TOKEN_ID;
  const MUX_SECRET_KEY = process.env.MUX_SECRET_KEY;

  if (!LUMA_API_KEY) {
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }
  if (!MUX_ACCESS_TOKEN_ID || !MUX_SECRET_KEY) {
    return res.status(500).json({ error: 'Missing Mux API credentials' });
  }

  try {
    async function pollForCompletion(jobId) {
      const maxAttempts = 30;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
        });
        const data = await response.json();
        if (data.state === 'completed' && data.assets) {
          return data.assets[0].url;
        } else if (data.state === 'failed') {
          throw new Error(`Luma job ${jobId} failed: ${data.failure_reason}`);
        }
        attempts++;
      }
      throw new Error(`Luma job ${jobId} timed out`);
    }

    const firstImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: firstImagePrompt })
    });
    const firstImageData = await firstImageResponse.json();
    if (!firstImageData.id) throw new Error('Failed to create first image');
    const firstImageUrl = await pollForCompletion(firstImageData.id);

    const lastImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: lastImagePrompt })
    });
    const lastImageData = await lastImageResponse.json();
    if (!lastImageData.id) throw new Error('Failed to create last image');
    const lastImageUrl = await pollForCompletion(lastImageData.id);

    const videoResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/video', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: videoPrompt,
        image_start: firstImageUrl,
        image_end: lastImageUrl,
        model: 'ray-1.6'
      })
    });
    const videoData = await videoResponse.json();
    if (!videoData.id) throw new Error('Failed to create video');
    const videoUrl = await pollForCompletion(videoData.id);

    const metadataString = `${firstImageUrl}|${lastImageUrl}|${videoUrl}`;
    if (metadataString.length > 256) {
      throw new Error('Metadata exceeds 256 character limit');
    }

    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_ACCESS_TOKEN_ID}:${MUX_SECRET_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard',
          passthrough: metadataString
        }
      })
    });
    const muxData = await muxResponse.json();
    if (!muxData.data) throw new Error('Failed to upload video to Mux');

    res.status(200).json({
      firstImageUrl,
      lastImageUrl,
      videoUrl,
      muxAssetId: muxData.data.id
    });
  } catch (error) {
    console.error('Error generating media:', error);
    res.status(500).json({ error: error.message });
  }
}
