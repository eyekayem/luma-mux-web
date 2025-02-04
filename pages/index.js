import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  const [firstImagePrompt, setFirstImagePrompt] = useState('');
  const [lastImagePrompt, setLastImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');

  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);

  // ✅ Load gallery from backend on mount
  useEffect(() => {
    async function fetchGallery() {
      const response = await fetch('/api/gallery');
      const data = await response.json();
      setGallery(data.gallery || []);
    }
    fetchGallery();
  }, []);

  async function generateMedia() {
    setIsGenerating(true);

    // ✅ Add placeholder entry immediately
    const newEntry = {
      firstImagePrompt,
      firstImageUrl: 'https://via.placeholder.com/300x200?text=Generating+Image+1',
      lastImagePrompt,
      lastImageUrl: 'https://via.placeholder.com/300x200?text=Generating+Image+2',
      videoPrompt,
      muxPlaybackId: null
    };

    setGallery((prev) => [newEntry, ...prev]);

    console.log('🚀 Generating images...');

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstImagePrompt, lastImagePrompt }),
    });

    const data = await response.json();
    if (data.firstImageJobId && data.lastImageJobId) {
      pollForImages(data.firstImageJobId, data.lastImageJobId, newEntry);
    } else {
      console.error('❌ Error generating images:', data.error);
      setIsGenerating(false);
    }
  }

  async function pollForImages(firstJobId, lastJobId, galleryEntry) {
    console.log('🔄 Polling for image completion...');

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?firstImageJobId=${firstJobId}&lastImageJobId=${lastJobId}`);
      const data = await response.json();

      let updatedEntry = { ...galleryEntry };

      if (data.firstImageUrl) updatedEntry.firstImageUrl = data.firstImageUrl;
      if (data.lastImageUrl) updatedEntry.lastImageUrl = data.lastImageUrl;

      setGallery((prev) => prev.map((entry) => (entry === galleryEntry ? updatedEntry : entry)));

      if (data.firstImageUrl && data.lastImageUrl) {
        clearInterval(pollInterval);
        startVideoGeneration(data.firstImageUrl, data.lastImageUrl, updatedEntry);
      }
    }, 2000);
  }

  async function startVideoGeneration(firstImageUrl, lastImageUrl, galleryEntry) {
    if (!firstImageUrl || !lastImageUrl) {
      console.error("❌ Missing image URLs.");
      return;
    }

    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstImageUrl, lastImageUrl, videoPrompt }),
    });

    const data = await response.json();
    if (data.videoJobId) {
      pollForVideo(data.videoJobId, galleryEntry);
    } else {
      console.error("❌ Error creating video:", data.error);
      setIsGenerating(false);
    }
  }

  async function pollForVideo(videoJobId, galleryEntry) {
    console.log('🔄 Polling for video completion...');

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?videoJobId=${videoJobId}`);
      const data = await response.json();

      if (data.videoUrl) {
        clearInterval(pollInterval);
        startMuxUpload(data.videoUrl, galleryEntry);
      }
    }, 2000);
  }

  async function startMuxUpload(videoUrl, galleryEntry) {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl }),
    });

    const data = await response.json();
    if (data.playbackId) {
      let updatedEntry = { ...galleryEntry, muxPlaybackId: data.playbackId };

      setGallery((prev) => prev.map((entry) => (entry === galleryEntry ? updatedEntry : entry)));
      setIsGenerating(false);
    } else {
      console.error("❌ Error uploading video to Mux:", data.error);
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-900 text-white p-6">
      <div className="w-full max-w-5xl bg-gray-800 p-6 rounded-lg grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-center">Magic Cinema Playground</h1>
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white" value={firstImagePrompt} onChange={(e) => setFirstImagePrompt(e.target.value)} placeholder="First Frame Description" />
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white" value={lastImagePrompt} onChange={(e) => setLastImagePrompt(e.target.value)} placeholder="Last Frame Description" />
          <textarea className="w-full p-3 rounded-lg bg-gray-700 text-white" value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} placeholder="Camera Move / Shot Action" />
          <button className="w-full p-3 bg-blue-600 rounded-lg" onClick={generateMedia} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <img src={firstImageUrl || 'https://via.placeholder.com/300x200?text=First+Image'} className="w-full rounded-lg" alt="First Image" />
          <img src={lastImageUrl || 'https://via.placeholder.com/300x200?text=Last+Image'} className="w-full rounded-lg" alt="Last Image" />
          {muxPlaybackId && <VideoPlayer playbackId={muxPlaybackId} className="w-full" />}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 w-full max-w-6xl">
        {gallery.map((entry, index) => (
          <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col items-center text-left">
            <p className="text-sm text-gray-400">{entry.firstImagePrompt}</p>
            <img src={entry.firstImageUrl} alt="First" className="w-full rounded-lg" />
            <p className="text-sm text-gray-400">{entry.lastImagePrompt}</p>
            <img src={entry.lastImageUrl} alt="Last" className="w-full rounded-lg" />
            <p className="text-sm text-gray-400">{entry.videoPrompt}</p>
            <VideoPlayer playbackId={entry.muxPlaybackId} className="w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
