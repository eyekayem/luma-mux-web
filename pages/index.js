import { useState } from "react";
import PollImages from "../components/PollImages";

export default function Home() {
  const [firstImageJobId, setFirstImageJobId] = useState(null);
  const [lastImageJobId, setLastImageJobId] = useState(null);
  const [videoJobId, setVideoJobId] = useState(null);
  const [videoPrompt, setVideoPrompt] = useState("");

  const handleGenerate = async () => {
    console.log("🎨 Sending request to generate images...");

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstImagePrompt: "A futuristic city skyline",
        lastImagePrompt: "The same city but in ruins",
        videoPrompt: "The city collapsing into the sea",
      }),
    });

    const data = await response.json();
    if (data.firstImageJobId && data.lastImageJobId) {
      console.log("✅ Image jobs created!", data);
      setFirstImageJobId(data.firstImageJobId);
      setLastImageJobId(data.lastImageJobId);
      setVideoPrompt("The city collapsing into the sea");
    } else {
      console.error("❌ Failed to start image jobs", data.error);
    }
  };

  const handleVideoStart = async (firstImageUrl, lastImageUrl, videoPrompt) => {
    console.log("🎬 Starting video generation...");

    const response = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstImageUrl, lastImageUrl, videoPrompt }),
    });

    const data = await response.json();
    if (data.videoJobId) {
      console.log("✅ Video job created successfully!", data.videoJobId);
      setVideoJobId(data.videoJobId);
    } else {
      console.error("❌ Error starting video job:", data.error);
    }
  };

  return (
    <div>
      <button onClick={handleGenerate}>Generate Media</button>

      {firstImageJobId && lastImageJobId && (
        <PollImages
          firstImageJobId={firstImageJobId}
          lastImageJobId={lastImageJobId}
          videoPrompt={videoPrompt}
          onVideoStart={handleVideoStart}
        />
      )}
    </div>
  );
}
