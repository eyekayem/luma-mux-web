import { useState, useEffect } from "react";

export default function Home() {
  const [firstImagePrompt, setFirstImagePrompt] = useState("");
  const [lastImagePrompt, setLastImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
  const [media, setMedia] = useState({ firstImage: null, lastImage: null, video: null });
  const [loading, setLoading] = useState(false);
  const [jobIds, setJobIds] = useState(null);
  const [gallery, setGallery] = useState([]); // Stores generated items

  // Load gallery from localStorage when the page loads
  useEffect(() => {
    const storedGallery = JSON.parse(localStorage.getItem("gallery"));
    if (storedGallery) {
      setGallery(storedGallery);
    }
  }, []);

  // Polling for job status
  useEffect(() => {
    if (jobIds) {
      let attempts = 0;
      const interval = setInterval(async () => {
        if (attempts >= 30) {
          clearInterval(interval);
          return;
        }

        const response = await fetch(`/api/status?firstImageJobId=${jobIds.firstImageJobId}&lastImageJobId=${jobIds.lastImageJobId}&videoJobId=${jobIds.videoJobId || ""}&videoPrompt=${jobIds.videoPrompt}`);
        const data = await response.json();

        if (data.status === "video_processing") {
          setMedia({ firstImage: data.firstImage, lastImage: data.lastImage, video: null });

          if (!jobIds.videoJobId && data.videoJobId) {
            setJobIds((prevJobIds) => ({ ...prevJobIds, videoJobId: data.videoJobId }));
          }
        } else if (data.status === "completed") {
          setMedia({ ...media, video: data.video });
          setJobIds(null);
          clearInterval(interval);

          // Add the result to the gallery
          const newEntry = {
            firstImagePrompt,
            lastImagePrompt,
            videoPrompt,
            firstImage: data.firstImage,
            lastImage: data.lastImage,
            video: data.video,
          };

          const updatedGallery = [newEntry, ...gallery];

          // Save updated gallery to localStorage
          setGallery(updatedGallery);
          localStorage.setItem("gallery", JSON.stringify(updatedGallery));
        }

        attempts++;
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [jobIds]);

  const generateMedia = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstImagePrompt, lastImagePrompt, videoPrompt }),
      });

      if (response.status === 402) {
        alert("🚨 Insufficient credits in Luma AI. Please check your account.");
        setLoading(false);
        return;
      }

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();

      setJobIds({
        firstImageJobId: data.firstImageJobId,
        lastImageJobId: data.lastImageJobId,
        videoPrompt: data.videoPrompt,
      });

    } catch (error) {
      console.error("API Error:", error);
      alert("Error generating media. Check console for details.");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-10">
      {/* Main Container */}
      <div className="flex flex-col w-full max-w-6xl bg-gray-800 shadow-lg rounded-lg p-8 space-y-8">
        <h1 className="text-3xl font-bold text-center">Magic Cinema Playground</h1>
        
        {/* Content Area */}
        <div className="flex flex-row space-x-8">
          {/* LEFT SIDE: INPUTS */}
          <div className="w-1/3 flex flex-col space-y-6">
            <textarea className="w-full p-4 rounded-lg bg-gray-700 text-white text-lg border border-gray-600 focus:border-blue-500 transition-all"
              rows="3"
              placeholder="First Image Prompt"
              value={firstImagePrompt}
              onChange={(e) => setFirstImagePrompt(e.target.value)}
              required
            />
            <textarea className="w-full p-4 rounded-lg bg-gray-700 text-white text-lg border border-gray-600 focus:border-blue-500 transition-all"
              rows="3"
              placeholder="Last Image Prompt"
              value={lastImagePrompt}
              onChange={(e) => setLastImagePrompt(e.target.value)}
              required
            />
            <textarea className="w-full p-4 rounded-lg bg-gray-700 text-white text-lg border border-gray-600 focus:border-blue-500 transition-all"
              rows="3"
              placeholder="Action & Camera Move Prompt"
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              required
            />
            <button type="submit"
              onClick={generateMedia}
              className="w-full p-4 bg-blue-600 rounded-lg text-lg font-semibold hover:bg-blue-700 disabled:bg-gray-600 transition-all"
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>

          {/* RIGHT SIDE: MEDIA PREVIEW */}
          <div className="w-2/3 flex flex-col space-y-6">
            {/* Image Previews */}
            <div className="flex justify-center space-x-4">
              {media.firstImage ? (
                <img src={media.firstImage} alt="First Image" className="w-1/2 rounded-lg shadow-lg border border-gray-700" />
              ) : (
                <div className="w-1/2 h-64 bg-gray-600 rounded-lg flex items-center justify-center text-gray-300">
                  First Image Preview
                </div>
              )}

              {media.lastImage ? (
                <img src={media.lastImage} alt="Last Image" className="w-1/2 rounded-lg shadow-lg border border-gray-700" />
              ) : (
                <div className="w-1/2 h-64 bg-gray-600 rounded-lg flex items-center justify-center text-gray-300">
                  Last Image Preview
                </div>
              )}
            </div>

            {/* Video Preview */}
            <div className="w-full">
              {media.video ? (
                <video controls className="w-full rounded-lg shadow-lg border border-gray-700">
                  <source src={media.video} type="video/mp4" />
                </video>
              ) : (
                <div className="w-full h-72 bg-gray-600 rounded-lg flex items-center justify-center text-gray-300">
                  Video Preview
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Gallery Section */}
      <div className="w-full max-w-6xl mt-10">
        <h2 className="text-2xl font-bold text-center mb-4">Gallery</h2>
        <div className="grid grid-cols-3 gap-6">
          {gallery.map((item, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-lg">
              {/* Prompt Title */}
              <p className="text-gray-400 text-sm">{item.firstImagePrompt} → {item.lastImagePrompt}</p>
              
              {/* First Image */}
              <img src={item.firstImage} alt="Gallery First" className="w-full rounded-lg mt-2" />

              {/* Last Image */}
              <img src={item.lastImage} alt="Gallery Last" className="w-full rounded-lg mt-2" />

              {/* Action Prompt */}
              {item.videoPrompt && <p className="text-gray-300 text-center italic my-2">"{item.videoPrompt}"</p>}

              {/* Video */}
              {item.video && <video controls className="w-full rounded-lg mt-2"><source src={item.video} type="video/mp4" /></video>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
