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

  console.log('🚀 Creating gallery entry in database...');

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

    // ✅ Call Luma AI to Generate Images
    const generateResponse = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: data.entryId,   // 🔥 Pass entry ID to backend
        firstImagePrompt,
        lastImagePrompt
      }),
    });

    const generateData = await generateResponse.json();
    if (generateData.firstImageJobId && generateData.lastImageJobId) {
      pollForImages(data.entryId);
    } else {
      console.error("❌ Error starting Luma AI generation:", generateData.error);
      setIsGenerating(false);
    }
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

    console.log("📡 Poll Response (Image):", data);

    if (data.firstImageUrl && data.firstImageUrl !== "pending") {
      setFirstImageUrl(data.firstImageUrl);
    }

    if (data.lastImageUrl && data.lastImageUrl !== "pending") {
      setLastImageUrl(data.lastImageUrl);
    }

    // ✅ Only proceed when both images have actual URLs, not "pending"
    if (
      data.firstImageUrl &&
      data.firstImageUrl !== "pending" &&
      data.lastImageUrl &&
      data.lastImageUrl !== "pending"
    ) {
      console.log("✅ Both images are ready! Stopping polling and starting video generation.");
      clearInterval(pollInterval);
      startVideoGeneration(entryId);
    }
  }, 2000);
}



// ✅ Start Video Generation
async function startVideoGeneration(entryId) {
    console.log("🎬 Fetching latest image URLs before starting video generation...");

    // 🔥 Fetch Latest Image URLs from Database
    const response = await fetch(`/api/status?entryId=${entryId}`);
    const data = await response.json();

    console.log("🔍 Confirming Image URLs Before Video Generation:", data);

    if (!data.firstImageUrl || !data.lastImageUrl || data.firstImageUrl === 'pending' || data.lastImageUrl === 'pending') {
        console.error("❌ Missing or Pending Image URLs. Aborting video generation.");
        return;
    }

    console.log("📤 Sending video generation request with:", {
      firstImageUrl: data.firstImageUrl,
      lastImageUrl: data.lastImageUrl,
      videoPrompt,
    });

    const videoResponse = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        entryId,
        firstImageUrl: data.firstImageUrl,  
        lastImageUrl: data.lastImageUrl,   
        videoPrompt 
      }),
    });

    const videoData = await videoResponse.json();
    console.log("📡 Video Generation API Response:", videoData);

    if (videoData.videoJobId) {
      pollForVideo(videoData.videoJobId, entryId);
    } else {
      console.error("❌ Video generation failed:", videoData.error);
      setIsGenerating(false);
    }
}


// ✅ Polls the status of the video job until the video is ready
async function pollForVideo(videoJobId, entryId) {
  console.log('🔄 Polling for video completion...', { videoJobId, entryId });

  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/status?entryId=${entryId}&videoJobId=${videoJobId}`);
    const data = await response.json();

    console.log("📡 Poll Response (Video):", data);

    if (data.videoUrl) {
      clearInterval(pollInterval);
      startMuxUpload(data.videoUrl, entryId);
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
