import fetch from 'node-fetch';

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { assetId } = req.query;

  if (!assetId) {
    return res.status(400).json({ error: 'Missing asset ID' });
  }

  try {
    console.log(`🔄 Checking Mux status for asset: ${assetId}`);

    const response = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`
      }
    });

    const data = await response.json();
    console.log("📊 Mux Asset Status:", data);

    const status = data.data.status;
    const playbackId = data.data.playback_ids ? data.data.playback_ids[0].id : null;

    res.status(200).json({ status, playbackId });

  } catch (error) {
    console.error("❌ Error checking Mux status:", error);
    res.status(500).json({ error: error.message });
  }
}
