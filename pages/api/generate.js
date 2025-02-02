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
    console.log(`🟢 Sending request to Luma API: ${firstImagePrompt}`);
    const firstImageResponse = await fetch(
      'https://api.lumalabs.ai/dream-machine/v1/generations/image',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LUMA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: firstImagePrompt }),
      }
    );

    const firstImageData = await firstImageResponse.json();
    console.log('🟡 Luma API Response:', firstImageData);

    if (!firstImageData.job_id) {
      throw new Error(`Failed to create first image. Response: ${JSON.stringify(firstImageData)}`);
    }

    // Generate last image
    console.log(`🟢 Sending request to Luma API: ${lastImagePrompt}`);
    const lastImageResponse = await fetch(
      'https://api.lumalabs.ai/dream-machine/v1/generations/image',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LUMA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: lastImagePrompt }),
      }
    );

    const lastImageData = await lastImageResponse.json();
    console.log('🟡 Luma API Response:', lastImageData);

    if (!lastImageData.job_id) {
      throw new Error(`Failed to create last image. Response: ${JSON.stringify(lastImageData)}`);
    }

    res.status(200).json({
      firstImageJobId: firstImageData.job_id,
      lastImageJobId: lastImageData.job_id,
      videoPrompt,
    });
  } catch (error) {
    console.error('❌ Error generating media:', error);
    res.status(500).json({ error: error.message });
  }
}
