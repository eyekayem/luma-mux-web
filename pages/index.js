import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  console.log("🟢 App Loaded: Initializing States...");

  // Default Work Panel Data
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

  // ✅ Load Gallery & Work Panel on Page Load
  useEffect(() => {
    console.log("📂 Loading gallery and work panel...");
    async function fetchGallery() {
      try {
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

    // Load Work Panel State
    const storedWorkPanel = JSON.parse(localStorage.getItem('workPanel')) || defaultWorkPanel;
    setFirstImagePrompt(storedWorkPanel.firstImagePrompt);
    setLastImagePrompt(storedWorkPanel.lastImagePrompt);
    setVideoPrompt(storedWorkPanel.videoPrompt);
  }, []);

  // ✅ Save Gallery to Local Storage
  useEffect(() => {
    console.log("💾 Saving gallery to local storage...");
    localStorage.setItem('gallery', JSON.stringify(gallery));
  }, [gallery]);

  // ✅ Save Work Panel State to Local Storage
  useEffect(() => {
    localStorage.setItem('workPanel', JSON.stringify({ firstImagePrompt, lastImagePrompt, videoPrompt }));
  }, [firstImagePrompt, lastImagePrompt, videoPrompt]);

  // ✅ Handle "Generate Media" Button Click
  async function generateMedia() {
    setIsGenerating(true);
    setMuxPlaybackId(null);
    setFirstImageUrl(null);
    setLastImageUrl(null);

    console.log('🚀 Generating media...');

    // ✅ Create Placeholder Entry in Gallery
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

  // ✅ Polling for Image Completion
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

  // ✅ Start Video Generation
  async function startVideoGeneration(firstImageUrl, lastImageUrl, galleryEntry) {
    console.log("🎬 Starting video generation...");

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

  // ✅ Polling for Video Completion
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

  // ✅ Upload Video to Mux
  async function startMuxUpload(videoUrl, galleryEntry) {
    console.log("🚀 Uploading video to Mux:", videoUrl);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl }),
    });

    const data = await response.json();
    if (data.playbackId) {
      console.log("✅ Mux Upload Successful, Playback ID:", data.playbackId);

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
    <div>
      <h1>Kinoprompt.bklt.ai</h1>
      <button onClick={generateMedia} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate"}
      </button>
      <div>
        {gallery.map((entry, index) => (
          <div key={index}>
            <p>{entry.firstImagePrompt}</p>
            <p>{entry.lastImagePrompt}</p>
            {entry.muxPlaybackId && <VideoPlayer playbackId={entry.muxPlaybackId} />}
          </div>
        ))}
      </div>
    </div>
  );
}
