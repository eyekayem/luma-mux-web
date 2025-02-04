import { useState } from "react";
import VideoPlayer from "../components/VideoPlayer";

export default function Home() {
  const [firstImagePrompt, setFirstImagePrompt] = useState("A futuristic city skyline");
  const [lastImagePrompt, setLastImagePrompt] = useState("The same city but in ruins");
  const [videoPrompt, setVideoPrompt] = useState("A smooth cinematic transition");
  
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [firstImageJobId, setFirstImageJobId] = useState("");
  const [lastImageJobId, setLastImageJobId] = useState("");
  const [videoJobId, setVideoJobId] = useState("");
  const [muxPlaybackId, setMuxPlaybackId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateMedia() {
    setIsGenerating(true);
    console.log("🚀 Sending request to generate images...");

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstImagePrompt, lastImagePrompt }),
    });

    const data = await response.json();
    if (data.firstImageJobId && data.lastImageJobId) {
      console.log("✅ Image jobs created:", data);
      setFirstImageJobId(data.firstImageJobId);
      setLastImageJobId(data.lastImageJobId);
      pollForImages(data.firstImageJobId, data.lastImageJobId);
    } else {
      console.error("❌ Error creating images:", data.error);
      setIsGenerating(false);
    }
  }

  async function pollForImages(firstJobId, lastJobId) {
    console.log("🔄 Polling for image completion...");

    const pollInterval = setInterval(async () => {
      const response = await fetch(
        `/api/status?firstImageJobId=${firstJobId}&lastImageJobId=${lastJobId}`
      );
      const data = await response.json();
      console.log("📊 Status Update:", data);

      if (data.firstImageUrl) {
        console.log("✅ First Image Ready:", data.firstImageUrl);
        setFirstImageUrl(data.firstImageUrl);
      }
      if (data.lastImageUrl) {
        console.log("✅ Last Image Ready:", data.lastImageUrl);
        setLastImageUrl(data.lastImageUrl);
      }

      if (data.readyForVideo) {
        clearInterval(pollInterval);
        console.log("🎬 Images ready, starting video generation...");
        startVideoGeneration(data.firstImageUrl, data.lastImageUrl);
      }
    }, 5000);
  }

  async function startVideoGeneration(firstImageUrl, lastImageUrl) {
    console.log("🎬 Preparing to start video generation...");
    
    if (!firstImageUrl || !lastImageUrl) {
      console.error("❌ Image URLs are missing before sending request.");
      return;
    }

    const response = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstImageUrl, lastImageUrl, videoPrompt }),
    });

    const data = await response.json();
    console.log("🎥 Video Generation Response:", data);

    if (data.videoJobId) {
      console.log("🎬 Video job created successfully:", data.videoJobId);
      setVideoJobId(data.videoJobId);
      pollForVideo(data.videoJobId);
    } else {
      console.error("❌ Error creating video:", data.error);
      setIsGenerating(false);
    }
  }

  async function pollForVideo(videoJobId) {
    console.log("🔄 Polling for video completion...");

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?videoJobId=${videoJobId}`);
      const data = await response.json();
      console.log("📊 Video Status Update:", data);

      if (data.videoUrl) {
        clearInterval(pollInterval);
        console.log("✅ Video ready:", data.videoUrl);
        startMuxUpload(data.videoUrl);
      }
    }, 5000);
  }

  async function startMuxUpload(videoUrl) {
    console.log("🚀 Uploading video to Mux:", videoUrl);

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrl }),
    });

    const data = await response.json();
    console.log("📡 Mux Upload Response:", data);

    if (data.playbackId) {
      console.log("✅ Video successfully uploaded to Mux:", data.playbackId);
      setMuxPlaybackId(data.playbackId);
    } else if (data.muxAssetId) {
      console.log("⏳ Mux processing started. Polling for readiness...");
      pollMuxStatus(data.muxAssetId);
    } else {
      console.error("❌ Error uploading video to Mux:", data.error);
    }
  }

  async function pollMuxStatus(assetId) {
    console.log("🔄 Polling Mux for video readiness...");

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/upload?assetId=${assetId}`);
      const data = await response.json();

      console.log("📊 Mux Status Update:", data);

      if (data.status === "ready" && data.playbackId) {
        clearInterval(pollInterval);
        console.log("✅ Mux Video Ready! Playback ID:", data.playbackId);
        setTimeout(() => setMuxPlaybackId(data.playbackId), 2500);
      }
    }, 1000);
  }

  return (
    <div className="container">
      <h1>kinoprompt.bklt.al</h1>

      <div className="form">
        <textarea
          value={firstImagePrompt}
          onChange={(e) => setFirstImagePrompt(e.target.value)}
          placeholder="First Frame Description"
        />
        <textarea
          value={lastImagePrompt}
          onChange={(e) => setLastImagePrompt(e.target.value)}
          placeholder="Last Frame Description"
        />
        <textarea
          value={videoPrompt}
          onChange={(e) => setVideoPrompt(e.target.value)}
          placeholder="Camera Move / Shot Action"
        />
        <button onClick={generateMedia} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Media"}
        </button>
      </div>

      <div className="media-grid">
        {firstImageUrl && <img src={firstImageUrl} className="image-preview" />}
        {lastImageUrl && <img src={lastImageUrl} className="image-preview" />}
      </div>

      {muxPlaybackId && <VideoPlayer playbackId={muxPlaybackId} className="video-container" />}

      <style jsx>{`
        .container {
          text-align: center;
          padding: 20px;
          background-color: #121212;
          color: white;
          font-family: Arial, sans-serif;
        }
        .form {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        textarea {
          width: 80%;
          height: 60px;
          padding: 10px;
          border-radius: 8px;
          border: none;
          font-size: 16px;
          background: #222;
          color: white;
        }
        .media-grid {
          display: flex;
          justify-content: center;
          gap: 10px;
          max-width: 800px;
          margin: auto;
        }
        .image-preview {
          width: 48%;
          border-radius: 8px;
        }
        .video-container {
          width: 100%;
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}
