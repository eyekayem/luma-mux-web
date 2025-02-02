import { useEffect, useState } from "react";

export default function PollImages({ firstImageJobId, lastImageJobId, videoPrompt, onVideoStart }) {
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!firstImageJobId || !lastImageJobId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status?firstImageJobId=${firstImageJobId}&lastImageJobId=${lastImageJobId}`);
        const data = await response.json();

        if (data.firstImageUrl) {
          setFirstImageUrl(data.firstImageUrl);
        }
        if (data.lastImageUrl) {
          setLastImageUrl(data.lastImageUrl);
        }

        if (data.firstImageUrl && data.lastImageUrl) {
          console.log("✅ Both images are ready. Starting video generation...");
          setPolling(false); // Stop polling
          onVideoStart(data.firstImageUrl, data.lastImageUrl, videoPrompt);
        } else {
          console.log("🔄 Polling for images...");
        }
      } catch (error) {
        console.error("❌ Error polling images:", error);
      }
    };

    if (polling) {
      const interval = setInterval(pollStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [firstImageJobId, lastImageJobId, polling, videoPrompt, onVideoStart]);

  return (
    <div>
      {firstImageUrl && <img src={firstImageUrl} alt="First Image" />}
      {lastImageUrl && <img src={lastImageUrl} alt="Last Image" />}
    </div>
  );
}
