import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('❌ Invalid request method:', req.method);
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
  if (!MUX_ACCESS_TOKEN_ID || !MUX_SECRET_KEY) {
    console.error('❌ Missing Mux API credentials');
    return res.status(500).json({ error: 'Missing Mux API credentials' });
  }

  console.log('🟢 Generating media with prompts:', { firstImagePrompt, lastImagePrompt, videoPrompt });

  try {
    async function pollForCompletion(jobId) {
      const maxAttempts = 30;
      let attempts = 0;

      while (attempts < maxAttempts) {
        console.log(`🔄 Polling for job ${jobId} - Attempt ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 10000));

        const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
        });

        const data = await response.json();
        console.log(`🟡 Luma API Response (${jobId}):`, data);

        if (data.state === 'completed' && data.assets) {
          console.log(`✅ Job ${jobId} completed - URL: ${data.assets[0].url}`);
          return data.assets[0].url;
        } else if (data.state === 'failed') {
          throw new Error(`Luma job ${jobId} failed: ${data.failure_reason}`);
        }
        attempts++;
      }
      throw new Error(`Luma job ${jobId} timed out`);
    }

    console.log('🟢 Requesting first image from Luma...');
    const firstImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: firstImagePrompt })
    });

    const firstImageData = await firstImageResponse.json();
    console.log('🟡 First Image Response:', firstImageData);
    if (!firstImageData.id) throw new Error(`Failed to create first image. Response: ${JSON.stringify(firstImageData)}`);
    const firstImageUrl = await pollForCompletion(firstImageData.id);

    console.log('🟢 Requesting last image from Luma...');
    const lastImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: lastImagePrompt })
    });

    const lastImageData = await lastImageResponse.json();
    console.log('🟡 Last Image Response:', lastImageData);
    if (!lastImageData.id) throw new Error(`Failed to create last image. Response: ${JSON.stringify(lastImageData)}`);
    const lastImageUrl = await pollForCompletion(lastImageData.id);

    console.log('🟢 Requesting video generation from Luma...');
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
    console.log('🟡 Video Generation Response:', videoData);
    if (!videoData.id) throw new Error(`Failed to create video. Response: ${JSON.stringify(videoData)}`);
    const videoUrl = await pollForCompletion(videoData.id);

    const metadataString = `${firstImageUrl}|${lastImageUrl}|${videoUrl}`;
    if (metadataString.length > 256) {
      throw new Error(`Metadata exceeds 256 character limit: ${metadataString.length} characters`);
    }

    console.log('🟢 Uploading video to Mux...');
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
    console.log('🟡 Mux Upload Response:', muxData);
    if (!muxData.data) throw new Error(`Failed to upload video to Mux. Response: ${JSON.stringify(muxData)}`);

    console.log('✅ Media generation complete! Sending response...');
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
