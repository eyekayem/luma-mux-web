import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';
import TextAreaAutosize from '../components/TextAreaAutosize';
import useMediaQuery from '../hooks/useMediaQuery';

export default function Home() {
  console.log("🟢 Honey I'm home...");

  // Default Work Panel State
  const defaultWorkPanel = {
    firstImagePrompt: 'A fashion show for clowns, on the runway. Everyone in the audience is not a clown.',
    lastImagePrompt: 'sitting in the front row of a fashion show for clowns, i hold up a makeup mirror and am totally suprised that I am a clown.',
    videoPrompt: 'Looking down from the fashion runway while holding a hand mirror up and seeing that you are a clown.',
  };
  
  // Custom hook to detect screen size
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Work Panel States
  const [firstImagePrompt, setFirstImagePrompt] = useState(defaultWorkPanel.firstImagePrompt);
  const [lastImagePrompt, setLastImagePrompt] = useState(defaultWorkPanel.lastImagePrompt);
  const [videoPrompt, setVideoPrompt] = useState(defaultWorkPanel.videoPrompt);
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState(null);
  const [muxPlaybackUrl, setMuxPlaybackUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [currentEntryId, setCurrentEntryId] = useState(null);

  // Define fetchGallery function
  async function fetchGallery() {
    try {
      console.log("📡 Fetching shared gallery...");
      const response = await fetch('/api/gallery?limit=6&featured=y');
      const data = await response.json();
      setGallery(data.gallery || []);
    } catch (error) {
      console.error("❌ Failed to fetch gallery:", error);
      setGallery([]);
    }
  }
  
  // Load Work Panel from Database when entryId changes
  useEffect(() => {
    async function fetchWorkPanel() {
      if (!currentEntryId) return;

      console.log(`📡 Fetching Work Panel Data for entryId: ${currentEntryId}`);
      try {
        const response = await fetch(`/api/status?entryId=${currentEntryId}`);
        const data = await response.json();

        setFirstImageUrl(data.firstImageUrl || null);
        setLastImageUrl(data.lastImageUrl || null);
        setMuxPlaybackId(data.muxPlaybackId || null);
        setMuxPlaybackUrl(data.muxPlaybackUrl || null);

        console.log("🎥 Mux Playback ID Set:", data.muxPlaybackId);
        console.log("🎞 Mux Playback URL Set:", data.muxPlaybackUrl);

      } catch (error) {
        console.error("❌ Failed to fetch Work Panel data:", error);
      }
    }

    fetchWorkPanel();
  }, [currentEntryId]);

  // Load Gallery from Database on start
  useEffect(() => {
    fetchGallery();
  }, []);

  // Start Image Generation
  async function startImageGeneration() {
    setIsGenerating(true);
    setMuxPlaybackId(null);
    setFirstImageUrl(null);
    setLastImageUrl(null);

    console.log('🚀 Creating new gallery entry or updating existing one...');

    try {
      const response = await fetch('/api/gallery/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: 0,
          firstImagePrompt,
          lastImagePrompt,
          videoPrompt,
        }),
      });

      const data = await response.json();
      if (!data.entryId) {
        console.error("❌ Error creating/updating gallery entry:", data.error);
        setIsGenerating(false);
        return;
      }

      console.log("✅ Entry ID assigned:", data.entryId);
      setCurrentEntryId(data.entryId);

      // Call Luma AI to Generate Images
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: data.entryId,
          firstImagePrompt,
          lastImagePrompt
        }),
      });

      const generateData = await generateResponse.json();
      if (generateData.firstImageJobId && generateData.lastImageJobId) {
        console.log("✅ Luma AI Generation Started!");
        pollForImages(data.entryId);
      } else {
        console.error("❌ Error starting Luma AI generation:", generateData.error);
        setIsGenerating(false);
      }
    } catch (error) {
      console.error("❌ Error during image generation:", error);
      setIsGenerating(false);
    }
  }

  // Poll for Image Completion
  async function pollForImages(entryId) {
    console.log('🔄 Polling for image completion...', { entryId });

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?entryId=${entryId}`);
      const data = await response.json();

      console.log("📡 Poll Response (Image):", data);

      if (data.firstImageUrl && data.firstImageUrl !== "pending") {
        setFirstImageUrl(data.firstImageUrl);
      }

      if (data.lastImageUrl && data.lastImageUrl !== "pending") {
        setLastImageUrl(data.lastImageUrl);
      }

      if (data.readyForVideo) {
        console.log("✅ Both images are ready! Stopping polling and starting video generation.");
        clearInterval(pollInterval);
        startVideoGeneration(entryId);
      }
    }, 2000);
  }

  // Start Video Generation
  async function startVideoGeneration(entryId) {
    console.log("🎬 Fetching latest image URLs before starting video generation...");

    const response = await fetch(`/api/status?entryId=${entryId}`);
    const data = await response.json();

    console.log("🔍 Confirming Image URLs Before Video Generation:", data);

    if (!data.readyForVideo) {
      console.error("❌ Missing or Pending Image URLs. Aborting video generation.");
      return;
    }

    const firstImageUrl = data.firstImageUrl;
    const lastImageUrl = data.lastImageUrl;

    if (!isValidUrl(firstImageUrl) || !isValidUrl(lastImageUrl)) {
      console.error("❌ Invalid Image URLs. Aborting video generation.");
      return;
    }

    console.log("📤 Sending video generation request with:", data);

    const videoResponse = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId, firstImageUrl, lastImageUrl, videoPrompt }),
    });

    const videoData = await videoResponse.json();
    console.log("📡 Video Generation API Response:", videoData);

    if (videoData.videoJobId) {
      console.log(`✅ Video job started! Polling for completion... Job ID: ${videoData.videoJobId}`);
      pollForVideo(videoData.videoJobId, entryId);
    } else {
      console.error("❌ Video generation failed:", videoData.error);
      setIsGenerating(false);
    }
  }

  // Poll for Video Completion
  async function pollForVideo(videoJobId, entryId) {
    console.log('🔄 Polling for video completion...');

    const pollInterval = setInterval(async () => {
      const response = await fetch(`/api/status?entryId=${entryId}`);
      const data = await response.json();

      console.log("📡 Poll Response (Video):", data);

      if (data.readyForMux) {
        clearInterval(pollInterval);
        startMuxUpload(data.videoUrl, entryId);
      }
    }, 2000);
  }

  // Uploads video to Mux & Updates Database
  async function startMuxUpload(videoUrl, entryId) {
    console.log("🚀 Uploading video to Mux:", videoUrl);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl }),
      });

      const data = await response.json();
      console.log("📡 Mux Upload Response:", data);

      if (!data.playbackId) {
        console.error("❌ Mux Upload Failed: No Playback ID Returned");
        setIsGenerating(false);
        return;
      }

      console.log("✅ Mux Upload Successful, Playback ID:", data.playbackId);

      // Construct Mux Playback URL
      const muxPlaybackUrl = `https://stream.mux.com/${data.playbackId}.m3u8`;

      if (!entryId) {
        console.error("❌ Missing entryId in startMuxUpload, cannot update DB.");
        setIsGenerating(false);
        return;
      }

      // Ensure correct data before making the request
      const updatePayload = {
        entryId,
        muxPlaybackId: data.playbackId,
        muxPlaybackUrl,
      };

      console.log("📡 Sending database update:", updatePayload);

      // Store the fetch response properly
      const update = await fetch('/api/gallery/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!update.ok) {
        console.error("❌ Database Update Failed:", await update.text());
        setIsGenerating(false);
        return;
      }

      const updateData = await update.json();
      console.log("✅ Database Updated Successfully:", updateData);

      // Update Work Panel State
      setMuxPlaybackId(data.playbackId);
      setMuxPlaybackUrl(muxPlaybackUrl);

      // Reset Generating State AFTER SUCCESS
      setIsGenerating(false);

      // Force Work Panel Refresh After Mux Upload
      setTimeout(() => {
        console.log("🔄 Refreshing Work Panel for Entry ID:", entryId);
        setCurrentEntryId(null);
        setTimeout(() => setCurrentEntryId(entryId), 500);
      }, 1000);

      // Refresh Gallery
      fetchGallery();

    } catch (error) {
      console.error("❌ Error in startMuxUpload:", error);
      setIsGenerating(false);
    }
  }

  // Function to validate URLs
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Function to handle tweak button click
  function handleTweak(entry) {
    setFirstImagePrompt(entry.first_image_prompt);
    setLastImagePrompt(entry.last_image_prompt);
    setVideoPrompt(entry.video_prompt);
  }

  // Render UI
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-900 text-white p-6">
      <div className="text-center mb-6">
        <p className="text-lg font-semibold">Prompt Trainer 0.5 - kenny@bklt.ai</p>
      </div>
      <div className="work-panel w-full max-w-5xl bg-gray-800 p-6 rounded-lg grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <label className="text-base font-medium text-gray-300">Begin Frame</label>
          <TextAreaAutosize
            value={firstImagePrompt}
            onChange={(e) => setFirstImagePrompt(e.target.value)}
            placeholder="First Frame Description"
            className="text-base p-2"
          />
          <div className="details">
            {firstImageUrl && <img src={firstImageUrl} alt="First Image" className="w-full rounded-lg mt-2" />}
          </div>

          <label className="text-base font-medium text-gray-300">End Frame</label>
          <TextAreaAutosize
            value={lastImagePrompt}
            onChange={(e) => setLastImagePrompt(e.target.value)}
            placeholder="Last Frame Description"
            className="text-base p-2"
          />
          <div className="details">
            {lastImageUrl && <img src={lastImageUrl} alt="Last Image" className="w-full rounded-lg mt-2" />}
          </div>

          <label className="text-base font-medium text-gray-300">Action and Camera Control</label>
          <TextAreaAutosize
            value={videoPrompt}
            onChange={(e) => setVideoPrompt(e.target.value)}
            placeholder="Camera Move / Shot Action"
            className="text-base p-2"
          />
          <div className="details">
            {muxPlaybackUrl && <VideoPlayer playbackId={muxPlaybackId} />}
          </div>

          <button className="button p-3 bg-blue-600 rounded-lg" onClick={startImageGeneration} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="gallery w-full max-w-5xl mt-6">
        {gallery.map((entry) => (
          <div key={entry.id} className="gallery-item">
            <VideoPlayer playbackId={entry.mux_playback_id} className="w-full" />
            <p className="text-sm text-gray-400">{entry.video_prompt}</p>
            <button className="w-full p-3 bg-blue-600 rounded-lg down-carat" onClick={toggleDetails}>▼</button>
            <div className="details hidden">
              {entry.first_image_url && <img src={entry.first_image_url} alt="First Image" className="w-full rounded-lg mt-2" />}
              <p>{entry.first_image_prompt}</p>
              {entry.last_image_url && <img src={entry.last_image_url} alt="Last Image" className="w-full rounded-lg mt-2" />}
              <p>{entry.last_image_prompt}</p>
              <button className="button p-2 bg-green-600 rounded-lg" onClick={() => handleTweak(entry)}>Tweak</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Add function to toggle details
  function toggleDetails(e) {
    const carat = e.target;
    const details = carat.nextElementSibling;
    carat.classList.toggle('active');
    details.classList.toggle('hidden');
  }
}
