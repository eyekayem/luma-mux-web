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
  const [muxVideoUrl, setMuxVideoUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [currentEntryId, setCurrentEntryId] = useState(null);

// ✅ Load Work Panel from Database when entryId changes
useEffect(() => {
  async function fetchWorkPanel() {
    if (!currentEntryId) return;

    console.log(`📡 Fetching Work Panel Data for entryId: ${currentEntryId}`);
    try {
      const response = await fetch(`/api/status?entryId=${currentEntryId}`);
      const data = await response.json();

      setFirstImageUrl(data.firstImageUrl || null);
      setLastImageUrl(data.lastImageUrl || null);
      setMuxPlaybackId(data.videoUrl || null);
    } catch (error) {
      console.error("❌ Failed to fetch Work Panel data:", error);
    }
  }

  fetchWorkPanel();
}, [currentEntryId]); // ✅ Only runs when entryId changes


  // ✅ Start Image Generation
async function startImageGeneration() {
  setIsGenerating(true);
  setMuxPlaybackId(null);
  setFirstImageUrl(null);
  setLastImageUrl(null);

  console.log('🚀 Creating new gallery entry or updating existing one...');

  const response = await fetch('/api/gallery/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entryId: 0,  // ✅ Signals to create a new entry
      firstImagePrompt,
      lastImagePrompt,
      videoPrompt,
    }),
  });

  const data = await response.json();
  if (data.entryId) {
    console.log("✅ Entry ID assigned:", data.entryId);
    setCurrentEntryId(data.entryId);
    pollForImages(data.entryId);  // ✅ Start polling for images
  } else {
    console.error("❌ Error creating/updating gallery entry:", data.error);
    setIsGenerating(false);
  }
}


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
        console.log(`✅ Video job started! Polling for completion... Job ID: ${videoData.videoJobId}`);
        pollForVideo(videoData.videoJobId, entryId);  // ✅ Call video polling
    } else {
        console.error("❌ Video generation failed:", videoData.error);
        setIsGenerating(false);
    }
}



// ✅ Polls the status of the video job until the video is ready
async function pollForVideo(videoJobId, entryId) {
  console.log('🔄 Polling for video completion...');

  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/status?entryId=${entryId}`);
    const data = await response.json();

    console.log("📡 Poll Response (Video):", data);

    if (data.videoUrl && data.videoUrl !== "pending") {
      clearInterval(pollInterval);
      startMuxUpload(data.videoUrl, entryId);
    }
  }, 2000);
}

// ✅ Uploads video to Mux & Updates Database
async function startMuxUpload(videoUrl, entryId) {
  console.log("🚀 Uploading video to Mux:", videoUrl);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl }),
    });

    const data = await response.json();
    console.log("📡 Mux Upload Response:", data);

    if (!data.muxJobId) {
      console.error("❌ Mux Upload Failed: No Job ID Returned");
      return;
    }

    console.log("✅ Mux Upload Started, Job ID:", data.muxJobId);

    // ✅ Construct Mux Playback URL
    const muxPlaybackUrl = data.playbackId 
      ? `https://stream.mux.com/${data.playbackId}.m3u8`
      : null;

    // ✅ Update the database in ONE request (instead of two)
    await fetch('/api/gallery/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId, muxJobId: data.muxJobId, muxPlaybackUrl }),
    });

    console.log("✅ Database Updated: ", { muxJobId: data.muxJobId, muxPlaybackUrl });

  } catch (error) {
    console.error("❌ Error in startMuxUpload:", error);
  }
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
