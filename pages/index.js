async function checkStatus() {
  const response = await fetch(`/api/status?firstImageJobId=${firstImageJobId}&lastImageJobId=${lastImageJobId}`);
  const data = await response.json();

  if (data.firstImageUrl) setFirstImageUrl(data.firstImageUrl);
  if (data.lastImageUrl) setLastImageUrl(data.lastImageUrl);

  if (data.readyForVideo) {
    console.log('🎬 Starting video generation...');
    startVideoGeneration(data.firstImageUrl, data.lastImageUrl);
  } else {
    setTimeout(checkStatus, 5000); // Poll every 5s until ready
  }
}

async function startVideoGeneration(firstImageUrl, lastImageUrl) {
  const response = await fetch('/api/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstImageUrl, lastImageUrl, videoPrompt })
  });

  const data = await response.json();
  console.log('🎥 Video Generation Response:', data);
}
