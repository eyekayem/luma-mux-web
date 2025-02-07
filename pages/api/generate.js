import { sql } from '@vercel/postgres';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  console.log("🔴 Incoming Request Data:", req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🟢 Starting media generation process');

  const { entryId, firstImagePrompt, lastImagePrompt } = req.body;
  const LUMA_API_KEY = process.env.LUMA_API_KEY;

  if (!LUMA_API_KEY) {
    console.error('❌ Missing Luma API Key');
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  async function requestImage(prompt) {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const response = await fetch(
          'https://api.lumalabs.ai/dream-machine/v1/generations/image',
          {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${LUMA_API_KEY}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ prompt })
          }
        );

        const data = await response.json();
        console.log("📝 Image Response:", JSON.stringify(data, null, 2));
        
        if (data.id) {
          return data;
        } else {
          console.error(`❌ Failed to create image. Luma API Response: ${JSON.stringify(data)}`);
        }

      } catch (error) {
        console.error('❌ Error during image generation:', error.message);
      }

      attempts++;
      console.log(`🔄 Retry attempt ${attempts} for prompt: ${prompt}`);
    }

    throw new Error('❌ Max retries reached. Failed to generate image.');
  }

  try {
    // Request First Image Generation
    console.log('📸 Requesting First Image...');
    const firstImageData = await requestImage(firstImagePrompt);

    // Request Last Image Generation
    console.log('📸 Requesting Last Image...');
    const lastImageData = await requestImage(lastImagePrompt);

    console.log("✅ Job IDs created:", { 
      firstImageJobId: firstImageData.id, 
      lastImageJobId: lastImageData.id 
    });

    // Update the database with the job IDs
    await sql`
      UPDATE gallery
      SET first_image_job_id = ${firstImageData.id}, last_image_job_id = ${lastImageData.id}
      WHERE id = ${entryId};
    `;

    console.log(`✅ Stored job IDs in DB for entryId: ${entryId}`);

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
