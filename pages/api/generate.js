import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🟢 Starting media generation process');

  const { firstImagePrompt, lastImagePrompt, videoPrompt } = req.body;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;
  const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
  const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

  if (!LUMA_API_KEY) {
    console.error('❌ Missing Luma API Key');
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }
  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    console.error('❌ Missing Mux API credentials');
    return res.status(500).json({ error: 'Missing Mux API credentials' });
  }

  try {
    async function pollForCompletion(jobId, type) {
      const maxAttempts = type === "video" ? 30 : 24; // Video (5 min), Images (2 min)
      const interval = type === "video" ? 10000 : 5000; // Video every 10s, Images every 5s

      console.log(`🔄 Polling for ${type} job ${jobId}...`);

      let attempts = 0;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, interval)); // Wait before polling

        const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
        });

        const data = await response.json();
        console.log(`🟡 Polling Attempt ${attempts + 1} for ${type}:`, data);

        if (data.state === "completed" && data.assets && data.assets.length > 0) {
          console.log(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} job ${jobId} completed!`);
          return data.assets[0].url;
        }

        if (data.state === "failed") {
          throw new Error(`❌ Luma ${type} job ${jobId} failed: ${data.failure_reason}`);
        }

        attempts++;
      }

      throw new Error(`❌ Luma ${type} job ${jobId} timed out`);
    }

    console.log('📸 Creating First Image...');
    const firstImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation_type: "image",
        model: "photon-1",
        prompt: firstImagePrompt,
        aspect_ratio: "16:9"
      })
    });
    const firstImageData = await firstImageResponse.json();
    if (!firstImageData.id) throw new Error('❌ Failed to create first image');
    const firstImageUrl = await pollForCompletion(firstImageData.id, "image");

    console.log('📸 Creating Last Image...');
    const lastImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation_type: "image",
        model: "photon-1",
        prompt: lastImagePrompt,
        aspect_ratio: "16:9"
      })
    });
    const lastImageData = await lastImageResponse.json();
    if (!lastImageData.id) throw new Error('❌ Failed to create last image');
    const lastImageUrl = await pollForCompletion(lastImageData.id, "image");

    console.log('✅ Image jobs completed! Displaying images...');
    
    console.log('🎬 Creating Video...');
    const videoResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/video', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generation_type: "video",
        model: "ray-1.6",
        prompt: videoPrompt,
        image_start: firstImageUrl,
        image_end: lastImageUrl,
        aspect_ratio: "16:9"
      })
    });
    const videoData = await videoResponse.json();
    if (!videoData.id) throw new Error('❌ Failed to create video');
    const videoUrl = await pollForCompletion(videoData.id, "video");

    console.log('🚀 Uploading to Mux...');
    const metadataString = `${firstImageUrl}|${lastImageUrl}|${videoUrl}`.slice(0, 256);
    const muxResponse = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`,
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
    if (!muxData.data) throw new Error('❌ Failed to upload video to Mux');

    console.log('✅ Media generation and upload complete!');
    res.status(200).json({
      firstImageUrl,
      lastImageUrl,
      videoUrl,
      muxAssetId: muxData.data.id
    });
  } catch (error) {
    console.error('❌ Error generating media:', error);
    res.status(500).json({ error: error.message });
  }
}
