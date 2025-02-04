import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  const [firstImagePrompt, setFirstImagePrompt] = useState(
    "A fashion show for clowns, on the runway. Everyone in the audience is not a clown."
  );
  const [lastImagePrompt, setLastImagePrompt] = useState(
    "Holding a hand mirror up and seeing that you are a clown."
  );
  const [videoPrompt, setVideoPrompt] = useState(
    "Looking down from the fashion runway while holding a hand mirror up and seeing that you are a clown."
  );

  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);

  // Load gallery from localStorage on mount
  useEffect(() => {
    const storedGallery = localStorage.getItem("gallery");
    if (storedGallery) {
      setGallery(JSON.parse(storedGallery));
    }
  }, []);

  async function generateMedia() {
    setIsGenerating(true);
    setMuxPlaybackId(""); // Reset video player
    setFirstImageUrl(null); // Reset images
    setLastImageUrl(null);

    console.log('🚀 Sending request to generate images...');

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstImagePrompt, lastImagePrompt }),
    });

    const data = await response.json();
    if (data.firstImageJobId && data.lastImageJobId) {
      console.log('✅ Image jobs created:', data);
      pollForImages(data.firstImageJobId, data.lastImageJobId);
    } else {
      console.error('❌ Error creating images:', data.error);
      setIsGenerating(false);
    }
  }

  async function pollForImages(firstJobId, lastJobId) {
    console.log('🔄 Polling for image completion...');

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?firstImageJobId=${firstJobId}&lastImageJobId=${lastJobId}`);
      const data = await response.json();
      console.log("📊 Status Update:", data);

      if (data.firstImageUrl && !firstImageUrl) {
        console.log("✅ First Image Ready:", data.firstImageUrl);
        setFirstImageUrl(data.firstImageUrl);
      }
      if (data.lastImageUrl && !lastImageUrl) {
        console.log("✅ Last Image Ready:", data.lastImageUrl);
        setLastImageUrl(data.lastImageUrl);
      }

      if (data.readyForVideo) {
        clearInterval(pollInterval);
        console.log('🎬 Images ready, starting video generation...');
        startVideoGeneration(data.firstImageUrl, data.lastImageUrl);
      }
    }, 2000);
  }

  async function startVideoGeneration(firstImageUrl, lastImageUrl) {
    console.log("🎬 Starting video generation...");

    if (!firstImageUrl || !lastImageUrl) {
      console.error("❌ Image URLs are missing before sending request.");
      return;
    }

    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstImageUrl, lastImageUrl, videoPrompt }),
    });

    const data = await response.json();
    console.log("🎥 Video Generation Response:", data);

    if (data.videoJobId) {
      pollForVideo(data.videoJobId);
    } else {
      console.error("❌ Error creating video:", data.error);
      setIsGenerating(false);
    }
  }

  async function pollForVideo(videoJobId) {
    console.log('🔄 Polling for video completion...');

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?videoJobId=${videoJobId}`);
      const data = await response.json();
      console.log('📊 Video Status Update:', data);

      if (data.videoUrl) {
        clearInterval(pollInterval);
        console.log('✅ Video ready:', data.videoUrl);
        startMuxUpload(data.videoUrl);
      }
    }, 2000);
  }

  async function startMuxUpload(videoUrl) {
    console.log("🚀 Uploading video to Mux:", videoUrl);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl }),
    });

    const data = await response.json();
    console.log("📡 Mux Upload Response:", data);

    if (data.playbackId) {
      console.log("✅ Video successfully uploaded to Mux:", data.playbackId);
      setMuxPlaybackId(data.playbackId);

      // ✅ Update gallery and save to localStorage
      setGallery((prevGallery) => {
        const updatedGallery = [
          { firstImagePrompt, firstImageUrl, lastImagePrompt, lastImageUrl, videoPrompt, muxPlaybackId: data.playbackId },
          ...prevGallery,
        ];
        localStorage.setItem("gallery", JSON.stringify(updatedGallery)); // Save to localStorage
        return updatedGallery;
      });

      setIsGenerating(false);
    } else {
      console.error("❌ Error uploading video to Mux:", data.error);
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-6">kinoprompt.bklt.al</h1>

      <div className="w-full max-w-xl space-y-4">
        <textarea className="input" value={firstImagePrompt} onChange={(e) => setFirstImagePrompt(e.target.value)} placeholder="First Frame Description" />
        <textarea className="input" value={lastImagePrompt} onChange={(e) => setLastImagePrompt(e.target.value)} placeholder="Last Frame Description" />
        <textarea className="input" value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} placeholder="Camera Move / Shot Action" />
        <button className="button w-full" onClick={generateMedia} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate Media"}
        </button>
        <button className="button w-full bg-red-600 mt-2" onClick={() => { localStorage.removeItem("gallery"); setGallery([]); }}>
          Clear Gallery
        </button>
      </div>

      {/* Image Preview */}
      <div className="flex gap-4 mt-6">
        {firstImageUrl && <img src={firstImageUrl} alt="First Image" className="rounded-lg w-1/2" />}
        {lastImageUrl && <img src={lastImageUrl} alt="Last Image" className="rounded-lg w-1/2" />}
      </div>

      {/* Video Preview */}
      {muxPlaybackId ? <VideoPlayer playbackId={muxPlaybackId} className="mt-6" /> : <p className="mt-6">No video available</p>}

      {/* Gallery */}
      <div className="gallery mt-8">
        {gallery.map((entry, index) => (
          <div key={index} className="gallery-item p-4 border border-gray-700 rounded-lg my-4">
            <p><strong>First Image Prompt:</strong> {entry.firstImagePrompt}</p>
            <img src={entry.firstImageUrl} alt="First Image" className="rounded-lg w-full" />
            <p><strong>Last Image Prompt:</strong> {entry.lastImagePrompt}</p>
            <img src={entry.lastImageUrl} alt="Last Image" className="rounded-lg w-full" />
            <p><strong>Action / Camera Prompt:</strong> {entry.videoPrompt}</p>
            <VideoPlayer playbackId={entry.muxPlaybackId} />
          </div>
        ))}
      </div>
    </div>
  );
}
