import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  const [firstImagePrompt, setFirstImagePrompt] = useState('A fashion show for clowns, on the runway. Everyone in the audience is not a clown.');
  const [lastImagePrompt, setLastImagePrompt] = useState('Holding a hand mirror up and seeing that you are a clown.');
  const [videoPrompt, setVideoPrompt] = useState('Looking down from the fashion runway while holding a hand mirror up and seeing that you are a clown.');

  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState('waiting');
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    const storedGallery = JSON.parse(localStorage.getItem('gallery')) || [];
    setGallery(storedGallery);
  }, []);

  useEffect(() => {
    localStorage.setItem('gallery', JSON.stringify(gallery));
  }, [gallery]);

  async function generateMedia() {
    console.log('🚀 Generating media...');
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
      galleryEntry.muxPlaybackId = data.playbackId;
      setGallery(prevGallery => prevGallery.map(entry => 
        entry === galleryEntry ? { ...galleryEntry } : entry
      ));
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
          <button className="w-full p-3 bg-blue-600 rounded-lg" onClick={generateMedia}>Generate</button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <img src={firstImageUrl || 'https://via.placeholder.com/300x200?text=First+Image'} className="w-full rounded-lg" alt="First Image" />
          <img src={lastImageUrl || 'https://via.placeholder.com/300x200?text=Last+Image'} className="w-full rounded-lg" alt="Last Image" />
          {muxPlaybackId !== 'waiting' ? <VideoPlayer playbackId={muxPlaybackId} className="w-full" /> : <p>Waiting for video...</p>}
        </div>
      </div>
    </div>
  );
}
