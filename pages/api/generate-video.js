import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstImageUrl, lastImageUrl, videoPrompt } = req.body;
  console.log("🎬 Received request for video generation.");
  console.log("🔍 First Image URL:", firstImageUrl);
  console.log("🔍 Last Image URL:", lastImageUrl);
  console.log("🔍 Video Prompt:", videoPrompt);

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
    console.log("🎥 Sending request to Luma API...");
    const videoResponse = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LUMA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: videoPrompt || "A cinematic transition",
        image_start: firstImageUrl,
        image_end: lastImageUrl,
        model: 'ray-1.6'
      })
    });

    const videoData = await videoResponse.json();
    console.log("📽 Luma API Response:", videoData);

    if (!videoData.id) {
      throw new Error("❌ Failed to create video");
    }

    res.status(200).json({ videoJobId: videoData.id });

  } catch (error) {
    console.error("❌ Error generating video:", error);
    res.status(500).json({ error: error.message });
  }
}
