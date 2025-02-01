import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoUrl } = req.body;
  const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
  const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;
  
  if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
    return res.status(500).json({ error: 'Missing MUX credentials' });
  }

  try {
    const muxResponse = await fetch('https://api.mux.com/video/v1/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: videoUrl, playback_policy: ['public'] })
    });
    const muxData = await muxResponse.json();
    
    if (!muxData.data || !muxData.data.playback_ids) {
      throw new Error('Failed to upload video');
    }

    res.status(200).json({ playbackId: muxData.data.playback_ids[0].id });
  } catch (error) {
    console.error('Error uploading video to Mux:', error);
    res.status(500).json({ error: error.message });
  }
}
