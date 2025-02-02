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
    console.error('❌ Missing LUMA_API_KEY');
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  console.log('🟢 Starting media generation process');

  async function pollForCompletion(jobId, type) {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      console.log(`🔄 Polling for ${type} completion (Attempt ${attempts + 1})...`);

      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

      const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
      });

      const data = await response.json();
      console.log(`📩 ${type} API Response:`, JSON.stringify(data, null, 2));

      if (data.state === 'completed' && data.assets && data.assets.length > 0) {
        console.log(`✅ ${type} job completed: ${data.assets[0].url}`);
        return data.assets[0].url;
      } else if (data.state === 'failed') {
        console.error(`❌ ${type} job failed: ${data.failure_reason}`);
        throw new Error(`${type} job failed: ${data.failure_reason}`);
      }

      attempts++;
    }

    throw new Error(`${type} job timed out`);
  }

  try {
    // 🟢 Step 1: Generate First Image
    console.log('📸 Creating First Image...');
    const firstImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: firstImagePrompt })
    });

    const firstImageData = await firstImageResponse.json();
    console.log('📩 First Image API Response:', JSON.stringify(firstImageData, null, 2));

    if (!firstImageData.id) throw new Error('❌ Failed to create first image');

    const firstImageUrl = await pollForCompletion(firstImageData.id, 'First Image');

    // 🟢 Step 2: Generate Last Image
    console.log('📸 Creating Last Image...');
    const lastImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: lastImagePrompt })
    });

    const lastImageData = await lastImageResponse.json();
    console.log('📩 Last Image API Response:', JSON.stringify(lastImageData, null, 2));

    if (!lastImageData.id) throw new Error('❌ Failed to create last image');

    const lastImageUrl = await pollForCompletion(lastImageData.id, 'Last Image');

    // 🟢 Step 3: Generate Video
    console.log('🎥 Creating Video...');
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
    console.log('📩 Video API Response:', JSON.stringify(videoData, null, 2));

    if (!videoData.id) throw new Error('❌ Failed to create video');

    const videoUrl = await pollForCompletion(videoData.id, 'Video');

    // ✅ Step 4: Upload to Mux **Only After Video is Ready**
    console.log('🟢 All assets are ready! Uploading to Mux...');

    if (!MUX_ACCESS_TOKEN_ID || !MUX_SECRET_KEY) {
      console.error('❌ Missing Mux API credentials');
      throw new Error('Missing Mux API credentials');
    }

    const metadataString = `${firstImageUrl}|${lastImageUrl}|${videoUrl}`;
    if (metadataString.length > 256) {
      console.error('❌ Metadata exceeds 256 character limit');
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
    console.log('✅ Mux Upload Complete:', JSON.stringify(muxData, null, 2));

    if (!muxData.data) throw new Error('Failed to upload video to Mux');

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
