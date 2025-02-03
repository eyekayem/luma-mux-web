import { useState } from 'react';

export default function Home() {
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [firstImageJobId, setFirstImageJobId] = useState('');
  const [lastImageJobId, setLastImageJobId] = useState('');
  const [videoJobId, setVideoJobId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateMedia() {
    setIsGenerating(true);
    console.log('🚀 Sending request to generate images...');

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        firstImagePrompt: "A futuristic city skyline",
        lastImagePrompt: "The same city but in ruins"
      })
    });

    const data = await response.json();
    if (data.firstImageJobId && data.lastImageJobId) {
      console.log('✅ Image jobs created:', data);
      setFirstImageJobId(data.firstImageJobId);
      setLastImageJobId(data.lastImageJobId);
      pollForImages(data.firstImageJobId, data.lastImageJobId);
    } else {
      console.error('❌ Error creating images:', data.error);
      setIsGenerating(false);
    }
  }

  async function pollForImages(firstJobId, lastJobId) {
    console.log('🔄 Polling for image completion...');
    
    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?firstImageJobId=${firstJobId}&lastImageJobId=${lastJobId}`);
      const data = await response.json();
      console.log('📊 Status Update:', data);

      if (data.firstImageUrl) setFirstImageUrl(data.firstImageUrl);
      if (data.lastImageUrl) setLastImageUrl(data.lastImageUrl);

      if (data.readyForVideo) {
        clearInterval(pollInterval); // Stop polling for images
        console.log('🎬 Images ready, starting video generation...');
        startVideoGeneration(data.firstImageUrl, data.lastImageUrl);
      }
    }, 5000); // Poll every 5 seconds
  }

  async function startVideoGeneration(firstImageUrl, lastImageUrl) {
    console.log('🎬 Sending request to generate video...');

    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstImageUrl, lastImageUrl, videoPrompt })
    });

    const data = await response.json();
    if (data.videoJobId) {
      console.log('🎥 Video job created:', data.videoJobId);
      setVideoJobId(data.videoJobId);
      pollForVideo(data.videoJobId);
    } else {
      console.error('❌ Error creating video:', data.error);
      setIsGenerating(false);
    }
  }

  async function pollForVideo(videoJobId) {
    console.log('🔄 Polling for video completion...');

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?videoJobId=${videoJobId}`);
      const data = await response.json();
      console.log('📊 Video Status Update:', data);

      if (data.videoUrl) {
        clearInterval(pollInterval); // Stop polling for video
        console.log('✅ Video ready:', data.videoUrl);
      }
    }, 5000); // Poll every 5 seconds
  }

  return (
    <div>
      <h1>AI Media Generator</h1>
      <button onClick={generateMedia} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Media'}
      </button>
      {firstImageUrl && <img src={firstImageUrl} alt="First Image" />}
      {lastImageUrl && <img src={lastImageUrl} alt="Last Image" />}
    </div>
  );
}
