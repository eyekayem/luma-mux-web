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

    try {
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
      if (!data.entryId) {
        console.error("❌ Error creating/updating gallery entry:", data.error);
        setIsGenerating(false);
        return;
      }

      console.log("✅ Entry ID assigned:", data.entryId);
      setCurrentEntryId(data.entryId);

      // ✅ Call Luma AI to Generate Images
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: data.entryId,
          firstImagePrompt,
          lastImagePrompt
        }),
      });

      const generateData = await generateResponse.json();
      if (generateData.firstImageJobId && generateData.lastImageJobId) {
        console.log("✅ Luma AI Generation Started!");
        pollForImages(data.entryId); // ✅ Start polling for images
      } else {
        console.error("❌ Error starting Luma AI generation:", generateData.error);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error("❌ Error during image generation:", error);
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

      if (data.readyForVideo) {
        console.log("✅ Both images are ready! Stopping polling and starting video generation.");
        clearInterval(pollInterval);
        startVideoGeneration(entryId);
      }
    }, 2000);
  }

  // ✅ Start Video Generation
  async function startVideoGeneration(entryId) {
    console.log("🎬 Fetching latest image URLs before starting video generation...");

    const response = await fetch(`/api/status?entryId=${entryId}`);
    const data = await response.json();

    console.log("🔍 Confirming Image URLs Before Video Generation:", data);

    if (!data.readyForVideo) {
      console.error("❌ Missing or Pending Image URLs. Aborting video generation.");
      return;
    }

    console.log("📤 Sending video generation request with:", data);

    const videoResponse = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId, firstImageUrl: data.firstImageUrl, lastImageUrl: data.lastImageUrl, videoPrompt }),
    });

    const videoData = await videoResponse.json();
    console.log("📡 Video Generation API Response:", videoData);

    if (videoData.videoJobId) {
      console.log(`✅ Video job started! Polling for completion... Job ID: ${videoData.videoJobId}`);
      pollForVideo(videoData.videoJobId, entryId);
    } else {
      console.error("❌ Video generation failed:", videoData.error);
      setIsGenerating(false);
    }
  }

  // ✅ Poll for Video Completion
  async function pollForVideo(videoJobId, entryId) {
    console.log('🔄 Polling for video completion...');

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?entryId=${entryId}`);
      const data = await response.json();

      console.log("📡 Poll Response (Video):", data);

      if (data.readyForMux) {
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

    if (!data.playbackId) {
      console.error("❌ Mux Upload Failed: No Playback ID Returned");
      return;
    }

    console.log("✅ Mux Upload Successful, Playback ID:", data.playbackId);

    // ✅ Construct Mux Playback URL
    const muxPlaybackUrl = `https://stream.mux.com/${data.playbackId}.m3u8`;

    if (!entryId) {
      console.error("❌ Missing entryId in startMuxUpload, cannot update DB.");
      return;
    }

    // ✅ Ensure correct data before making the request
    const updatePayload = {
      entryId,
      muxPlaybackId: data.playbackId,
      muxPlaybackUrl,
    };

    console.log("📡 Sending database update:", updatePayload);

    const updateResponse = await fetch('/api/gallery/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    const updateData = await updateResponse.json();
    if (updateResponse.ok) {
      console.log("✅ Database Updated Successfully:", updateData);
    } else {
      console.error("❌ Database Update Failed:", updateData.error);
    }

  } catch (error) {
    console.error("❌ Error in startMuxUpload:", error);
  }
}

  // ✅ Render UI
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

      {/* ✅ Display Images When Available */}
      <div className="w-full max-w-5xl mt-6 grid grid-cols-3 gap-4">
        {firstImageUrl && <img src={firstImageUrl} alt="First Image" className="w-full rounded-lg" />}
        {lastImageUrl && <img src={lastImageUrl} alt="Last Image" className="w-full rounded-lg" />}
        {muxPlaybackId && <VideoPlayer playbackId={muxPlaybackId} />}
      </div>
    </div>
  );
}
