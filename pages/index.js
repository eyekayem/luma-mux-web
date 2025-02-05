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
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);

  // ✅ Fetch Shared Gallery & Load Work Panel State on Page Load
  useEffect(() => {
    async function fetchGallery() {
      try {
        console.log("📡 Fetching shared gallery...");
        const response = await fetch('/api/gallery');
        const data = await response.json();
        setGallery(data.gallery || []);
      } catch (error) {
        console.error("❌ Failed to fetch gallery:", error);
        setGallery([]);
      }
    }

    fetchGallery();

    // ✅ Load Work Panel from Local Storage
    const storedWorkPanel = JSON.parse(localStorage.getItem('workPanel')) || defaultWorkPanel;
    setFirstImagePrompt(storedWorkPanel.firstImagePrompt);
    setLastImagePrompt(storedWorkPanel.lastImagePrompt);
    setVideoPrompt(storedWorkPanel.videoPrompt);
  }, []);

  // ✅ Save Work Panel to Local Storage (Debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('workPanel', JSON.stringify({ firstImagePrompt, lastImagePrompt, videoPrompt }));
    }, 500);

    return () => clearTimeout(timeout);
  }, [firstImagePrompt, lastImagePrompt, videoPrompt]);

  // ✅ Handle "Generate Media" Button Click
  async function generateMedia() {
    setIsGenerating(true);
    setMuxPlaybackId(null);
    setFirstImageUrl(null);
    setLastImageUrl(null);

    console.log('🚀 Generating media...');

    const entryId = Date.now().toString(); // 🔥 Unique ID for this entry

    const newEntry = {
      id: entryId,
      firstImagePrompt,
      firstImageUrl: 'https://via.placeholder.com/300x200?text=Generating+First+Image',
      lastImagePrompt,
      lastImageUrl: 'https://via.placeholder.com/300x200?text=Generating+Last+Image',
      videoPrompt,
      muxPlaybackId: 'waiting',
    };

    setGallery((prevGallery) => [newEntry, ...prevGallery]);

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstImagePrompt, lastImagePrompt }),
    });

    const data = await response.json();
    if (data.firstImageJobId && data.lastImageJobId) {
      pollForImages(data.firstImageJobId, data.lastImageJobId, entryId);
    } else {
      console.error('❌ Error generating images:', data.error);
      setIsGenerating(false);
    }
  }

  // ✅ Polls Luma AI API for image updates and updates gallery
  async function pollForImages(firstJobId, lastJobId, entryId) {
    console.log('🔄 Polling for image completion...', { entryId });

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?firstImageJobId=${firstJobId}&lastImageJobId=${lastJobId}`);
      const data = await response.json();

      console.log("📡 Poll Response:", data);

      let updated = false;

      setGallery((prevGallery) =>
        prevGallery.map((entry) => {
          if (entry.id !== entryId) return entry;

          const updatedEntry = { ...entry };

          if (data.firstImageUrl && data.firstImageUrl !== entry.firstImageUrl) {
            updatedEntry.firstImageUrl = data.firstImageUrl;
            setFirstImageUrl(data.firstImageUrl);
            updated = true;
          }

          if (data.lastImageUrl && data.lastImageUrl !== entry.lastImageUrl) {
            updatedEntry.lastImageUrl = data.lastImageUrl;
            setLastImageUrl(data.lastImageUrl);
            updated = true;
          }

          return updatedEntry;
        })
      );

      if (data.firstImageUrl && data.lastImageUrl) {
        console.log("✅ Both images ready, stopping polling and starting video generation.");
        clearInterval(pollInterval);
        startVideoGeneration(data.firstImageUrl, data.lastImageUrl, entryId);
      }
    }, 2000);
  }
  
  // ✅ Starts video generation after both images are ready
  async function startVideoGeneration(firstImageUrl, lastImageUrl, entryId) {
    console.log("🎬 Starting Video Generation...");
  
    if (!firstImageUrl || !lastImageUrl) {
      console.error("❌ Missing image URLs. Video generation aborted.");
      return;
    }
  
    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstImageUrl, lastImageUrl, videoPrompt }),
    });
  
    const data = await response.json();
    console.log("📡 Video Generation Response:", data);
  
    if (data.videoJobId) {
      pollForVideo(data.videoJobId, entryId);
    } else {
      console.error("❌ Video generation failed:", data.error);
      setIsGenerating(false);
    }
  }

  // ✅ Polls the status of the video job until the video is ready
  async function pollForVideo(videoJobId, entryId) {
    console.log('🔄 Polling for video completion...');
  
    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?videoJobId=${videoJobId}`);
      const data = await response.json();
  
      console.log("📡 Poll Response (Video):", data);
  
      if (data.videoUrl) {
        clearInterval(pollInterval);
        startMuxUpload(data.videoUrl, entryId);
      }
    }, 2000);
  }


  // ✅ Uploads video to Mux & Updates Shared Gallery
  async function startMuxUpload(videoUrl, entryId) {
    console.log("🚀 Uploading video to Mux:", videoUrl);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl }),
    });

    const data = await response.json();
    console.log("📡 Mux Upload Response:", data);

    if (data.playbackId) {
      console.log("✅ Mux Upload Successful, Playback ID:", data.playbackId);

      setGallery((prevGallery) =>
        prevGallery.map((entry) =>
          entry.id === entryId ? { ...entry, muxPlaybackId: data.playbackId } : entry
        )
      );

      setMuxPlaybackId(data.playbackId);
      setIsGenerating(false);
    } else {
      console.error("❌ Error uploading video to Mux:", data.error);
      setIsGenerating(false);
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
            onClick={generateMedia} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
