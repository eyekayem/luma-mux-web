import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  const defaultWorkPanel = {
    firstImagePrompt: 'Describe the first scene...',
    lastImagePrompt: 'Describe the last scene...',
    videoPrompt: 'Describe the camera move or transition...',
    firstImageUrl: 'https://via.placeholder.com/300x200?text=First+Image',
    lastImageUrl: 'https://via.placeholder.com/300x200?text=Last+Image',
    muxPlaybackId: 'waiting',
  };

  const [firstImagePrompt, setFirstImagePrompt] = useState(defaultWorkPanel.firstImagePrompt);
  const [lastImagePrompt, setLastImagePrompt] = useState(defaultWorkPanel.lastImagePrompt);
  const [videoPrompt, setVideoPrompt] = useState(defaultWorkPanel.videoPrompt);
  const [firstImageUrl, setFirstImageUrl] = useState(defaultWorkPanel.firstImageUrl);
  const [lastImageUrl, setLastImageUrl] = useState(defaultWorkPanel.lastImageUrl);
  const [muxPlaybackId, setMuxPlaybackId] = useState(defaultWorkPanel.muxPlaybackId);
  const [gallery, setGallery] = useState([]);

  // ✅ Load Gallery and Work Panel State on Mount
  useEffect(() => {
    console.log("🚀 Initializing Work Panel...");

    // ✅ Load Work Panel Defaults or Stored State
    const storedWorkPanel = JSON.parse(localStorage.getItem('workPanel')) || defaultWorkPanel;
    setFirstImagePrompt(storedWorkPanel.firstImagePrompt);
    setLastImagePrompt(storedWorkPanel.lastImagePrompt);
    setVideoPrompt(storedWorkPanel.videoPrompt);
    setFirstImageUrl(storedWorkPanel.firstImageUrl || defaultWorkPanel.firstImageUrl);
    setLastImageUrl(storedWorkPanel.lastImageUrl || defaultWorkPanel.lastImageUrl);
    setMuxPlaybackId(storedWorkPanel.muxPlaybackId || 'waiting');

    console.log("✅ Work Panel Loaded:", storedWorkPanel);

    // ✅ Load Gallery from API or Storage
    async function fetchGallery() {
      try {
        console.log("📡 Fetching gallery...");
        const response = await fetch('/api/gallery');
        const data = await response.json();
        if (data.gallery && Array.isArray(data.gallery)) {
          setGallery(data.gallery);
          console.log("✅ Gallery Loaded:", data.gallery);
        } else {
          console.warn("📌 No gallery data found, setting default.");
          setGallery([]);
        }
      } catch (error) {
        console.error("❌ Failed to fetch gallery:", error);
        setGallery([]);
      }
    }

    fetchGallery();
  }, []);

  useEffect(() => {
    console.log("💾 Saving work panel to localStorage:", { firstImagePrompt, lastImagePrompt, videoPrompt });
    localStorage.setItem(
      'workPanel',
      JSON.stringify({ firstImagePrompt, lastImagePrompt, videoPrompt, firstImageUrl, lastImageUrl, muxPlaybackId })
    );
  }, [firstImagePrompt, lastImagePrompt, videoPrompt, firstImageUrl, lastImageUrl, muxPlaybackId]);

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
          <button className="w-full p-3 bg-blue-600 rounded-lg">Generate</button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <img src={firstImageUrl} className="w-full rounded-lg bg-gray-700" alt="First Image Placeholder" />
          <img src={lastImageUrl} className="w-full rounded-lg bg-gray-700" alt="Last Image Placeholder" />
          <div className="w-full h-40 bg-gray-700 flex items-center justify-center rounded-lg">
            {muxPlaybackId && muxPlaybackId !== "waiting" ? (
              <VideoPlayer playbackId={muxPlaybackId} className="w-full h-full rounded-lg" />
            ) : (
              <p className="text-center text-gray-400">Waiting for video...</p>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Gallery Section (Fixing Display Issue) */}
      <div className="w-full max-w-5xl mt-8">
        <h2 className="text-xl font-semibold mb-4">Generated Scenes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gallery.map((entry, index) => (
            <div key={index} className="bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-400"><strong>First Image Prompt:</strong> {entry.firstImagePrompt}</p>
              <img src={entry.firstImageUrl || 'https://via.placeholder.com/300x200?text=Image+Generating'} 
                className="w-full rounded-lg bg-gray-700" alt="First Image" 
              />
              <p className="text-sm text-gray-400 mt-2"><strong>Last Image Prompt:</strong> {entry.lastImagePrompt}</p>
              <img src={entry.lastImageUrl || 'https://via.placeholder.com/300x200?text=Image+Generating'} 
                className="w-full rounded-lg bg-gray-700" alt="Last Image" 
              />
              <p className="text-sm text-gray-400 mt-2"><strong>Action / Camera Prompt:</strong> {entry.videoPrompt}</p>
              <div className="w-full h-40 bg-gray-700 flex items-center justify-center rounded-lg">
                {entry.muxPlaybackId && entry.muxPlaybackId !== "waiting" ? (
                  <VideoPlayer playbackId={entry.muxPlaybackId} className="w-full h-full rounded-lg" />
                ) : (
                  <p className="text-center text-gray-400">Waiting for video...</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
