import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  const [firstImagePrompt, setFirstImagePrompt] = useState('');
  const [lastImagePrompt, setLastImagePrompt] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');

  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState('waiting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);

  // ✅ Load stored gallery on mount
  useEffect(() => {
    const storedGallery = JSON.parse(localStorage.getItem('gallery')) || [];
    setGallery(storedGallery);
  }, []);

  useEffect(() => {
    localStorage.setItem('gallery', JSON.stringify(gallery));
  }, [gallery]);

  async function generateMedia() {
    setIsGenerating(true);
    setMuxPlaybackId('waiting');
    setFirstImageUrl(null);
    setLastImageUrl(null);

    const newEntry = {
      firstImagePrompt,
      firstImageUrl: 'https://via.placeholder.com/300x200?text=First+Image',
      lastImagePrompt,
      lastImageUrl: 'https://via.placeholder.com/300x200?text=Last+Image',
      videoPrompt,
      muxPlaybackId: 'waiting'
    };

    setGallery(prevGallery => [newEntry, ...prevGallery]);

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

      if (data.firstImageUrl) galleryEntry.firstImageUrl = data.firstImageUrl;
      if (data.lastImageUrl) galleryEntry.lastImageUrl = data.lastImageUrl;

      setGallery(prevGallery => prevGallery.map(entry => 
        entry === galleryEntry ? { ...galleryEntry } : entry
      ));

      if (data.firstImageUrl && data.lastImageUrl) {
        clearInterval(pollInterval);
        startVideoGeneration(data.firstImageUrl, data.lastImageUrl, galleryEntry);
      }
    }, 3000);
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
    }, 3000);
  }

  async function startMuxUpload(videoUrl, galleryEntry) {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl }),
    });
  
    const data = await response.json();
    if (data.playbackId) {
      console.log("✅ Mux Upload Successful, Playback ID:", data.playbackId);
  
      // ✅ Delay setting Mux Playback ID to prevent premature errors
      setTimeout(() => {
        galleryEntry.muxPlaybackId = data.playbackId;
        setGallery(prevGallery =>
          prevGallery.map(entry => entry === galleryEntry ? { ...galleryEntry } : entry)
        );
      }, 3000); // Give Mux time to confirm readiness
    } else {
      console.error("❌ Error uploading video to Mux:", data.error);
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
          {muxPlaybackId !== 'waiting' ? <VideoPlayer playbackId={muxPlaybackId} className="w-full" /> : <p>Waiting for video...</p>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-5xl">
        {gallery.map((entry, index) => (
        <div key={index} className="gallery-item p-4 border border-gray-700 rounded-lg my-4">
          <p><strong>First Image Prompt:</strong> {entry.firstImagePrompt}</p>
          <img src={entry.firstImageUrl} alt="First Image" className="rounded-lg w-full" />
          <p><strong>Last Image Prompt:</strong> {entry.lastImagePrompt}</p>
          <img src={entry.lastImageUrl} alt="Last Image" className="rounded-lg w-full" />
          <p><strong>Action / Camera Prompt:</strong> {entry.videoPrompt}</p>
      
          {entry.muxPlaybackId && entry.muxPlaybackId !== 'waiting' ? (
            <VideoPlayer playbackId={entry.muxPlaybackId} />
          ) : (
            <p>Waiting for video...</p>
          )}
        </div>
      ))}

      </div>
    </div>
  );
}
