import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  console.log("🟢 App Loaded: Initializing States...");

  // ✅ Default Work Panel State
  const defaultWorkPanel = {
    firstImagePrompt: 'A fashion show for clowns, on the runway. Everyone in the audience is not a clown.',
    lastImagePrompt: 'Holding a hand mirror up and seeing that you are a clown.',
    videoPrompt: 'Looking down from the fashion runway while holding a hand mirror up and seeing that you are a clown.',
  };

  // ✅ Work Panel States
  const [firstImagePrompt, setFirstImagePrompt] = useState(defaultWorkPanel.firstImagePrompt);
  const [lastImagePrompt, setLastImagePrompt] = useState(defaultWorkPanel.lastImagePrompt);
  const [videoPrompt, setVideoPrompt] = useState(defaultWorkPanel.videoPrompt);
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);

  // ✅ Fetch Shared Gallery & Load Work Panel State on Page Load
  useEffect(() => {
    async function fetchGallery() {
      try {
        console.log("📡 Fetching shared gallery...");
        const response = await fetch('/api/gallery');
        const data = await response.json();
        setGallery(data.gallery || []);
      } catch (error) {
        console.error("❌ Failed to fetch gallery:", error);
        setGallery([]);
      }
    }

    fetchGallery();

    // ✅ Load Work Panel from Local Storage
    const storedWorkPanel = JSON.parse(localStorage.getItem('workPanel')) || defaultWorkPanel;
    setFirstImagePrompt(storedWorkPanel.firstImagePrompt);
    setLastImagePrompt(storedWorkPanel.lastImagePrompt);
    setVideoPrompt(storedWorkPanel.videoPrompt);
  }, []);

  // ✅ Save Work Panel to Local Storage (Debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('workPanel', JSON.stringify({ firstImagePrompt, lastImagePrompt, videoPrompt }));
    }, 500);

    return () => clearTimeout(timeout);
  }, [firstImagePrompt, lastImagePrompt, videoPrompt]);

  // ✅ Start Image Generation
  async function startImageGeneration() {
    setIsGenerating(true);
    setMuxPlaybackId(null);
    setFirstImageUrl(null);
    setLastImageUrl(null);

    console.log('🚀 Generating media and storing in database...');

    const response = await fetch('/api/gallery/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstImagePrompt,
        lastImagePrompt,
        videoPrompt,
      }),
    });

    const data = await response.json();
    if (data.entryId) {
      console.log("✅ New entry created with ID:", data.entryId);
      pollForImages(data.entryId);
    } else {
      console.error("❌ Error creating database entry:", data.error);
      setIsGenerating(false);
    }
  }

  // ✅ Poll for Image Completion
  async function pollForImages(entryId) {
    console.log('🔄 Polling for image completion...', { entryId });
    
    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?entryId=${entryId}`);
      const data = await response.json();

      if (data.firstImageUrl) setFirstImageUrl(data.firstImageUrl);
      if (data.lastImageUrl) setLastImageUrl(data.lastImageUrl);

      if (data.firstImageUrl && data.lastImageUrl) {
        clearInterval(pollInterval);
        startVideoGeneration(entryId);
      }
    }, 2000);
  }

  // ✅ Start Video Generation
  async function startVideoGeneration(entryId) {
    console.log("🎬 Starting Video Generation...");
    
    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId, videoPrompt }),
    });
    
    const data = await response.json();
    if (data.videoJobId) {
      pollForVideo(data.videoJobId, entryId);
    } else {
      console.error("❌ Video generation failed:", data.error);
      setIsGenerating(false);
    }
  }

  // ✅ Poll for Video Completion
  async function pollForVideo(videoJobId, entryId) {
    console.log('🔄 Polling for video completion...');
    
    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?videoJobId=${videoJobId}`);
      const data = await response.json();
      
      if (data.videoUrl) {
        clearInterval(pollInterval);
        setMuxPlaybackId(data.videoUrl);
      }
    }, 2000);
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-900 text-white p-6">
      {/* Work Panel */}
      <div className="w-full max-w-5xl bg-gray-800 p-6 rounded-lg grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-center">Kinoprompt.bklt.ai</h1>
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white"
            value={firstImagePrompt} onChange={(e) => setFirstImagePrompt(e.target.value)}
            placeholder="First Frame Description" 
          />
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white"
            value={lastImagePrompt} onChange={(e) => setLastImagePrompt(e.target.value)}
            placeholder="Last Frame Description" 
          />
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white"
            value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)}
            placeholder="Camera Move / Shot Action" 
          />
          <button className="w-full p-3 bg-blue-600 rounded-lg"
            onClick={startImageGeneration} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
