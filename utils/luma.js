import fetch from 'node-fetch';

const LUMA_API_KEY = process.env.LUMA_API_KEY;
if (!LUMA_API_KEY) {
  console.error('❌ Missing Luma API Key');
  throw new Error('Missing LUMA_API_KEY');
}

export async function createLumaImage(prompt) {
  console.log(`📸 Sending request to Luma API: ${prompt}`);

  const response = await fetch('https://api.lumalabs.ai/dream-machine/v1/generations/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LUMA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });

  const data = await response.json();
  if (!data.id) throw new Error('❌ Failed to create Luma image');

  return data.id;
}

export async function pollForCompletion(jobId) {
  console.log(`🔄 Polling for job ${jobId}`);
  const maxAttempts = 30;
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const response = await fetch(`https://api.lumalabs.ai/dream-machine/v1/generations/${jobId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${LUMA_API_KEY}` }
    });

    const data = await response.json();
    if (data.state === 'completed' && data.assets && data.assets.length > 0) {
      console.log(`✅ Job ${jobId} completed!`);
      return data.assets[0].url;
    } else if (data.state === 'failed') {
      throw new Error(`❌ Luma job ${jobId} failed: ${data.failure_reason}`);
    }

    console.log(`🔄 Polling for job ${jobId} (Attempt ${attempts + 1})...`);
    attempts++;
  }
  
  throw new Error(`❌ Luma job ${jobId} timed out`);
}
