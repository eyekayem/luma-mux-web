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
    async function pollForCompletion(jobId) {
      console.log(`🔄 Polling for job ${jobId}`);
      const maxAttempts = 30;
      let attempts = 0;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
        });
        const data = await response.json();

        if (data.state === 'completed' && data.assets && data.assets.length > 0) {
          console.log(`✅ Job ${jobId} completed!`);
          return data.assets[0].url;
        } else if (data.state === 'failed') {
          throw new Error(`❌ Luma job ${jobId} failed: ${data.failure_reason}`);
        }
        console.log(`🔄 Polling for job ${jobId} (Attempt ${attempts + 1})...`);
        attempts++;
      }
      throw new Error(`❌ Luma job ${jobId} timed out`);
    }

    console.log('📸 Creating First Image...');
    const firstImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: firstImagePrompt })
    });
    const firstImageData = await firstImageResponse.json();
    if (!firstImageData.id) throw new Error('❌ Failed to create first image');

    console.log('📸 Creating Last Image...');
    const lastImageResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: lastImagePrompt })
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
