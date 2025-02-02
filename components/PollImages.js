import { useState, useEffect } from "react";

export default function PollImages({ firstImageJobId, lastImageJobId, onImagesReady }) {
  const [firstImage, setFirstImage] = useState(null);
  const [lastImage, setLastImage] = useState(null);
  const [loading, setLoading] = useState(true);

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

        if (firstImage && lastImage) {
          console.log("✅ Both images are ready!");
          setLoading(false);
          onImagesReady({ firstImage, lastImage });
        }
      } catch (error) {
        console.error("❌ Error polling image status:", error);
      }
    };

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [firstImageJobId, lastImageJobId, firstImage, lastImage]);

  return (
    <div>
      {loading && <p>⏳ Waiting for images...</p>}
      {firstImage && <img src={firstImage} alt="First Image" width={400} />}
      {lastImage && <img src={lastImage} alt="Last Image" width={400} />}
    </div>
  );
}
