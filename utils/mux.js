import fetch from 'node-fetch';

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
  console.error('❌ Missing Mux API credentials');
  throw new Error('Missing Mux API credentials');
}

export async function uploadToMux(videoUrl) {
  console.log('🚀 Uploading to Mux...');

  const response = await fetch('https://api.mux.com/video/v1/assets', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: videoUrl,
      playback_policy: ['public'], // Ensure public playback ID is included
      mp4_support: 'standard'
    })
  });

  const data = await response.json();
  
  if (!data.data || !data.data.playback_ids || !data.data.playback_ids[0].id) {
    console.error('❌ Failed to upload to Mux:', data);
    throw new Error('Mux API did not return a playback ID');
  }

  return data.data.playback_ids[0].id;
}
