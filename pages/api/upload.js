import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoUrl } = req.body;
  const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
  const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    console.error('❌ Missing Mux API credentials');
    return res.status(500).json({ error: 'Missing Mux API credentials' });
  }
  
  console.log('🚀 Uploading video to Mux:', videoUrl);

  try {
    const response = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        video_quality: "basic",
        playback_policy: ["public"],
        max_resolution_tier: "1080p",
        input_url: videoUrl
      })
    });

    const data = await response.json();
    console.log("📡 Mux Upload Response:", data);

    if (data.data && data.data.id) {
      console.log("✅ Video successfully uploaded to Mux:", data.data.id);
      res.status(200).json({ muxAssetId: data.data.id });
    } else {
      throw new Error(data.error || "Unknown error from Mux API");
    }
  } catch (error) {
    console.error("❌ Error uploading video to Mux:", error);
    res.status(500).json({ error: error.message });
  }
}
