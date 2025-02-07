import { useState, useEffect } from "react";
import VideoPlayer from "../components/VideoPlayer";

export default function Home() {
  // ✅ Work Panel States
  const [firstImagePrompt, setFirstImagePrompt] = useState("");
  const [lastImagePrompt, setLastImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState(null);
  const [muxPlaybackUrl, setMuxPlaybackUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [currentEntryId, setCurrentEntryId] = useState(null);

  useEffect(() => {
    if (currentEntryId) {
      fetchWorkPanel();
    }
  }, [currentEntryId]);

  useEffect(() => {
    loadGallery();
  }, []);

  // ✅ Load Gallery Entries on Startup
  async function loadGallery() {
    console.log("📡 Loading gallery...");
    try {
      const response = await fetch("/api/gallery");
      const data = await response.json();
      setGallery(data);
    } catch (error) {
      console.error("❌ Error loading gallery:", error);
    }
  }

  // ✅ Fetch Work Panel Data for Current Entry
  async function fetchWorkPanel() {
    console.log("📡 Fetching Work Panel Data for Entry ID:", currentEntryId);
    try {
      const response = await fetch(`/api/status?entryId=${currentEntryId}`);
      const data = await response.json();
      console.log("📡 Work Panel Response:", data);

      setFirstImageUrl(data.firstImageUrl || null);
      setLastImageUrl(data.lastImageUrl || null);
      setMuxPlaybackId(data.muxPlaybackId || null);
      setMuxPlaybackUrl(data.muxPlaybackUrl || null);
      if (data.readyForMux) {
        setIsGenerating(false); // ✅ Reset button when ready
      }
    } catch (error) {
      console.error("❌ Failed to fetch Work Panel data:", error);
    }
  }

  // ✅ Start Image Generation
  async function startImageGeneration() {
    setIsGenerating(true);
    setMuxPlaybackId(null);
    setFirstImageUrl(null);
    setLastImageUrl(null);

    console.log("🚀 Creating new gallery entry or updating existing one...");
    try {
      const response = await fetch("/api/gallery/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: 0,
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
      pollForImages(data.entryId);
    } catch (error) {
      console.error("❌ Error during image generation:", error);
      setIsGenerating(false);
    }
  }

  // ✅ Poll for Image Completion
  async function pollForImages(entryId) {
    console.log("🔄 Polling for image completion...", { entryId });

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

    const videoResponse = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryId,
        firstImageUrl: data.firstImageUrl,
        lastImageUrl: data.lastImageUrl,
        videoPrompt,
      }),
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
    console.log("🔄 Polling for video completion...");

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

  // ✅ Upload Video to Mux & Update Database
  async function startMuxUpload(videoUrl, entryId) {
    console.log("🚀 Uploading video to Mux:", videoUrl);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });

      const data = await response.json();
      console.log("📡 Mux Upload Response:", data);

      if (!data.playbackId) {
        console.error("❌ Mux Upload Failed: No Playback ID Returned");
        return;
      }

      const muxPlaybackUrl = `https://stream.mux.com/${data.playbackId}.m3u8`;

      await fetch("/api/gallery/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, muxPlaybackId: data.playbackId, muxPlaybackUrl }),
      });

      console.log("✅ Database Updated with Mux Playback URL:", muxPlaybackUrl);
      fetchWorkPanel();
    } catch (error) {
      console.error("❌ Error in startMuxUpload:", error);
    }
  }

  
  // ✅ Render UI
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-900 text-white p-6">
      {/* Title */}
      <h1 className="text-3xl font-bold text-center mb-4">Kinoprompt.bklt.ai</h1>

      {/* Work Panel */}
      <div className="w-full max-w-5xl bg-gray-800 p-6 rounded-lg grid grid-cols-2 gap-4">
        {/* Left Side - Inputs */}
        <div className="space-y-4">
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white" value={firstImagePrompt} onChange={(e) => setFirstImagePrompt(e.target.value)} placeholder="First Frame Description" />
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white" value={lastImagePrompt} onChange={(e) => setLastImagePrompt(e.target.value)} placeholder="Last Frame Description" />
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white" value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} placeholder="Camera Move / Shot Action" />
          <button className="w-full p-3 bg-blue-600 rounded-lg" onClick={startImageGeneration} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>

        {/* Right Side - Output Display (Images & Video) */}
        <div className="flex flex-col items-center space-y-4">
          {firstImageUrl && <img src={firstImageUrl} alt="First Image" className="w-full rounded-lg" />}
          {lastImageUrl && <img src={lastImageUrl} alt="Last Image" className="w-full rounded-lg" />}
          {muxPlaybackUrl && <VideoPlayer playbackId={muxPlaybackId} />}
        </div>
      </div>
    </div>
  );
                                     
  // ✅ Render UI
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-900 text-white p-6">
      {/* Title */}
      <h1 className="text-3xl font-bold text-center mb-4">Kinoprompt.bklt.ai</h1>

      {/* Work Panel */}
      <div className="w-full max-w-5xl bg-gray-800 p-6 rounded-lg grid grid-cols-2 gap-4">
        {/* Left Side - Inputs */}
        <div className="space-y-4">
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white" value={firstImagePrompt} onChange={(e) => setFirstImagePrompt(e.target.value)} placeholder="First Frame Description" />
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white" value={lastImagePrompt} onChange={(e) => setLastImagePrompt(e.target.value)} placeholder="Last Frame Description" />
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white" value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} placeholder="Camera Move / Shot Action" />
          <button className="w-full p-3 bg-blue-600 rounded-lg" onClick={startImageGeneration} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>

        {/* Right Side - Output Display (Images & Video) */}
        <div className="flex flex-col items-center space-y-4">
          {firstImageUrl && <img src={firstImageUrl} alt="First Image" className="w-full rounded-lg" />}
          {lastImageUrl && <img src={lastImageUrl} alt="Last Image" className="w-full rounded-lg" />}
          {muxPlaybackUrl && <VideoPlayer playbackId={muxPlaybackId} />}
        </div>
      </div>

      {/* ✅ GALLERY SECTION - Displays all past entries */}
      <div className="w-full max-w-5xl mt-6 space-y-6">
        {gallery.slice().reverse().map((entry) => (
          <div key={entry.id} className="bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-400">{entry.first_image_prompt}</p>
            {entry.first_image_url && <img src={entry.first_image_url} alt="First Image" className="w-full rounded-lg mt-2" />}
            <p className="text-sm text-gray-400 mt-2">{entry.last_image_prompt}</p>
            {entry.last_image_url && <img src={entry.last_image_url} alt="Last Image" className="w-full rounded-lg mt-2" />}
            {entry.mux_playback_url && (
              <div className="mt-4">
                <VideoPlayer playbackId={entry.mux_playback_id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
                                    
