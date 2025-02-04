import fetch from 'node-fetch';

export default async function handler(req, res) {
  console.log("🔴 Incoming Request Data:", req.body);

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
    const firstImageResponse = await fetch(
      'https://api.lumalabs.ai/dream-machine/v1/generations/image',
      {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${LUMA_API_KEY}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ prompt: firstImagePrompt })
      }
    );
    
    const firstImageData = await firstImageResponse.json();
    console.log("📝 First Image Response:", firstImageData);

    if (!firstImageData.id) {
      throw new Error(`❌ Failed to create first image. Luma API Response: ${JSON.stringify(firstImageData)}`);
    }

    console.log('📸 Creating Last Image...');
    const lastImageResponse = await fetch(
      'https://api.lumalabs.ai/dream-machine/v1/generations/image',
      {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${LUMA_API_KEY}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ prompt: lastImagePrompt })
      }
    );

    const lastImageData = await lastImageResponse.json();
    console.log("📝 Last Image Response:", lastImageData);

    if (!lastImageData.id) {
      throw new Error(`❌ Failed to create last image. Luma API Response: ${JSON.stringify(lastImageData)}`);
    }

    console.log("✅ Job IDs created:", { 
      firstImageJobId: firstImageData.id, 
      lastImageJobId: lastImageData.id 
    });

    // Return job IDs, polling will happen on the frontend
    res.status(200).json({
      firstImageJobId: firstImageData.id,
      lastImageJobId: lastImageData.id
    });

  } catch (error) {
    console.error('❌ Error generating media:', error.message);
    res.status(500).json({ error: error.message });
  }
}
