import { useState, useEffect } from "react";

export default function PollImages({ firstImageJobId, lastImageJobId, onVideoJobCreated }) {
  const [firstImage, setFirstImage] = useState(null);
  const [lastImage, setLastImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videoJobId, setVideoJobId] = useState(null);

  useEffect(() => {
    if (!firstImageJobId || !lastImageJobId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status?firstImageJobId=${firstImageJobId}&lastImageJobId=${lastImageJobId}`);
        const data = await response.json();

        if (data.firstImageStatus?.state === "completed" && data.firstImageStatus.assets) {
          setFirstImage(data.firstImageStatus.assets[0].url);
        }

        if (data.lastImageStatus?.state === "completed" && data.lastImageStatus.assets) {
          setLastImage(data.lastImageStatus.assets[0].url);
        }

        if (data.firstImageStatus?.state === "failed" || data.lastImageStatus?.state === "failed") {
          console.error("❌ Image generation failed.");
          setLoading(false);
          return;
        }

        if (firstImage && lastImage && !videoJobId) {
          console.log("✅ Both images are ready! Starting video generation...");
          setLoading(false);
          startVideoGeneration();
        }
      } catch (error) {
        console.error("❌ Error polling image status:", error);
      }
    };

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [firstImageJobId, lastImageJobId, firstImage, lastImage, videoJobId]);

  const startVideoGeneration = async () => {
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstImage, lastImage, videoPrompt: "Smooth cinematic transition" })
      });

      const data = await response.json();
      if (data.videoJobId) {
        console.log(`🎬 Video Job Created: ${data.videoJobId}`);
        setVideoJobId(data.videoJobId);
        onVideoJobCreated(data.videoJobId);
      }
    } catch (error) {
      console.error("❌ Error starting video generation:", error);
    }
  };

  return (
    <div>
      {loading && <p>⏳ Waiting for images...</p>}
      {firstImage && <img src={firstImage} alt="First Image" width={400} />}
      {lastImage && <img src={lastImage} alt="Last Image" width={400} />}
      {videoJobId && <p>🎬 Video is being generated...</p>}
    </div>
  );
}
