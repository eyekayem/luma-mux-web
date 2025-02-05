import fetch from 'node-fetch';
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.error("❌ Method Not Allowed: Only POST requests are accepted.");
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { entryId, firstImageUrl, lastImageUrl, videoPrompt } = req.body;

  if (!entryId) {
    console.error("❌ Missing entryId for video generation.");
    return res.status(400).json({ error: 'Missing entryId' });
  }

  if (!firstImageUrl || !lastImageUrl) {
    console.error("❌ Missing Image URLs for Video Generation.");
    return res.status(400).json({ error: 'Missing Image URLs' });
  }

  const LUMA_API_KEY = process.env.LUMA_API_KEY;
  if (!LUMA_API_KEY) {
    console.error("❌ Missing Luma API Key.");
    return res.status(500).json({ error: 'Missing LUMA_API_KEY' });
  }

  try {
    console.log("🎬 Starting Video Generation...");
    console.log("📤 First Image URL:", firstImageUrl);
    console.log("📤 Last Image URL:", lastImageUrl);
    console.log("📤 Video Prompt:", videoPrompt);
    console.log("📌 Entry ID:", entryId);

    const requestBody = {
      generation_type: "video",
      prompt: videoPrompt || "A smooth cinematic transition",
      keyframes: {
        frame0: { type: "image", url: firstImageUrl.trim() },
        frame1: { type: "image", url: lastImageUrl.trim() }
      }
    };

    console.log("📦 Request Payload:", JSON.stringify(requestBody, null, 2));

    const videoResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LUMA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const videoData = await videoResponse.json();
    console.log("📽 Luma API Response:", videoData);

    if (!videoData.id) {
      console.error("❌ Failed to create video:", videoData);
      return res.status(500).json({ error: 'Failed to create video', details: videoData });
    }

    console.log("✅ Video Job ID:", videoData.id);

    // ✅ Store video job ID in the database
    await sql`
      UPDATE gallery
      SET video_job_id = ${videoData.id}
      WHERE id = ${entryId};
    `;

    console.log(`✅ Stored Video Job ID in DB for Entry ID: ${entryId}`);

    res.status(200).json({ videoJobId: videoData.id });

  } catch (error) {
    console.error("❌ Error generating video:", error);
    res.status(500).json({ error: error.message });
  }
}
