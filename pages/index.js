import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  const defaultWorkPanel = {
    firstImagePrompt: 'A fashion show for clowns, on the runway. Everyone in the audience is not a clown.',
    lastImagePrompt: 'Holding a hand mirror up and seeing that you are a clown.',
    videoPrompt: 'Looking down from the fashion runway while holding a hand mirror up and seeing that you are a clown.',
  };

  const [firstImagePrompt, setFirstImagePrompt] = useState(defaultWorkPanel.firstImagePrompt);
  const [lastImagePrompt, setLastImagePrompt] = useState(defaultWorkPanel.lastImagePrompt);
  const [videoPrompt, setVideoPrompt] = useState(defaultWorkPanel.videoPrompt);
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);

  // ✅ Load gallery from backend on mount
  useEffect(() => {
    async function fetchGallery() {
      try {
        const response = await fetch('/api/gallery');
        const data = await response.json();
        setGallery(data.gallery || []);
      } catch (error) {
        console.error("❌ Failed to fetch gallery:", error);
        setGallery([]);
      }
    }
    fetchGallery();
  }, []);

  async function generateMedia() {
    setIsGenerating(true);
    setMuxPlaybackId(null);
    setFirstImageUrl('https://via.placeholder.com/300x200?text=Generating+First+Image');
    setLastImageUrl('https://via.placeholder.com/300x200?text=Generating+Last+Image');

    console.log('🚀 Generating media...');

    const newEntry = {
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

      if (data.firstImageUrl) {
        galleryEntry.firstImageUrl = data.firstImageUrl;
        setFirstImageUrl(data.firstImageUrl);
      }
      if (data.lastImageUrl) {
        galleryEntry.lastImageUrl = data.lastImageUrl;
        setLastImageUrl(data.lastImageUrl);
      }

      setGallery((prevGallery) =>
        prevGallery.map((entry) => (entry === galleryEntry ? { ...galleryEntry } : entry))
      );

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
    console.log("🚀 Uploading video to Mux:", videoUrl);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl }),
    });

    const data = await response.json();
    if (data.playbackId) {
      setGallery((prevGallery) =>
        prevGallery.map((entry) =>
          entry === galleryEntry ? { ...entry, muxPlaybackId: data.playbackId } : entry
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
      <h1 className="text-3xl font-bold">Kinoprompt.bklt.ai</h1>

      <button className="p-3 bg-blue-600 rounded-lg mt-4" onClick={generateMedia} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate"}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {gallery.map((entry, index) => (
          <div key={index} className="bg-gray-800 p-4 rounded-lg">
            <p className="text-sm">{entry.firstImagePrompt}</p>
            <img src={entry.firstImageUrl} alt="First Image" />
            <p className="text-sm">{entry.lastImagePrompt}</p>
            <img src={entry.lastImageUrl} alt="Last Image" />
            {entry.muxPlaybackId !== "waiting" && <VideoPlayer playbackId={entry.muxPlaybackId} />}
          </div>
        ))}
      </div>
    </div>
  );
}
