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

  async function requestMedia(prompt, type = 'image') {
    const maxDuration = 3 * 60 * 1000; // 3 minutes
    const startTime = Date.now();
    const delay = 1000; // 1 second for images

    while ((Date.now() - startTime) < maxDuration) {
      try {
        const response = await fetch(
          `https://api.lumalabs.ai/dream-machine/v1/generations/${type}`,
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
        console.log(`📝 ${type.charAt(0).toUpperCase() + type.slice(1)} Response:`, JSON.stringify(data, null, 2));
        
        if (data.id) {
          return data;
        } else {
          console.error(`❌ Failed to create ${type}. Luma API Response: ${JSON.stringify(data)}`);
        }

      } catch (error) {
        console.error(`❌ Error during ${type} generation:`, error.message);
      }

      // Delay before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error(`❌ Max duration reached. Failed to generate ${type}.`);
  }

  try {
    // Request First Image Generation
    console.log('📸 Requesting First Image...');
    const firstImageData = await requestMedia(firstImagePrompt, 'image');

    // Request Last Image Generation
    console.log('📸 Requesting Last Image...');
    const lastImageData = await requestMedia(lastImagePrompt, 'image');

    console.log("✅ Image Job IDs created:", { 
      firstImageJobId: firstImageData.id, 
      lastImageJobId: lastImageData.id 
    });

    // Update the database with the image job IDs
    await sql`
      UPDATE gallery
      SET 
        first_image_job_id = ${firstImageData.id}, 
        last_image_job_id = ${lastImageData.id}
      WHERE id = ${entryId};
    `;

    console.log(`✅ Stored image job IDs in DB for entryId: ${entryId}`);

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
