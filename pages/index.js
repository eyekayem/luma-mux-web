import { useState } from 'react';

export default function Home() {
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [firstImageJobId, setFirstImageJobId] = useState('');
  const [lastImageJobId, setLastImageJobId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

async function checkStatus(firstImageJobId, lastImageJobId) {
  console.log("🔄 Initiating Status Check...");

  try {
    const response = await fetch(`/api/status?firstImageJobId=${firstImageJobId}&lastImageJobId=${lastImageJobId}`);
    const data = await response.json();

    console.log("📡 Status Response:", data); // Log API response

    if (data.firstImageUrl) setFirstImageUrl(data.firstImageUrl);
    if (data.lastImageUrl) setLastImageUrl(data.lastImageUrl);

    if (data.readyForVideo) {
      console.log('🎬 Starting video generation...');
      startVideoGeneration(data.firstImageUrl, data.lastImageUrl);
    } else {
      console.log('⏳ Images still processing... Polling again in 5s');
      setTimeout(() => checkStatus(firstImageJobId, lastImageJobId), 5000);
    }
  } catch (error) {
    console.error("❌ Error polling status:", error);
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

  async function generateImages() {
    setIsGenerating(true);

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstImagePrompt: 'A futuristic city skyline',
        lastImagePrompt: 'The same city but in ruins',
      }),
    });

    const data = await response.json();
    console.log('📸 Image Generation Response:', data);

    if (data.firstImageJobId && data.lastImageJobId) {
      setFirstImageJobId(data.firstImageJobId);
      setLastImageJobId(data.lastImageJobId);
      checkStatus();
    }
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <h1>AI Media Generator</h1>
      <button onClick={generateImages} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Media'}
      </button>

      {firstImageUrl && <div><h2>First Image:</h2><img src={firstImageUrl} alt="First Image" width="300" /></div>}
      {lastImageUrl && <div><h2>Last Image:</h2><img src={lastImageUrl} alt="Last Image" width="300" /></div>}
    </div>
  );
}
