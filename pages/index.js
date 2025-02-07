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
  const [muxPlaybackUrl, setMuxPlaybackUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [currentEntryId, setCurrentEntryId] = useState(null);

  // ✅ Load Work Panel from Database when entryId changes
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

  // ✅ Load Gallery from Database on start
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
  }, []);

  // ✅ Uploads video to Mux & Updates Database
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

      const muxPlaybackUrl = `https://stream.mux.com/${data.playbackId}.m3u8`;

      if (!entryId) {
        console.error("❌ Missing entryId in startMuxUpload, cannot update DB.");
        setIsGenerating(false);
        return;
      }

      const updatePayload = {
        entryId,
        muxPlaybackId: data.playbackId,
        muxPlaybackUrl,
      };

      console.log("📡 Sending database update:", updatePayload);

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

      setMuxPlaybackId(data.playbackId);
      setMuxPlaybackUrl(muxPlaybackUrl);
      setIsGenerating(false);

      setTimeout(() => {
        console.log("🔄 Refreshing Work Panel for Entry ID:", entryId);
        setCurrentEntryId(null);
        setTimeout(() => setCurrentEntryId(entryId), 500);
      }, 1000);

    } catch (error) {
      console.error("❌ Error in startMuxUpload:", error);
      setIsGenerating(false);
    }
  }

  // ✅ Render UI
  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-gray-900 text-white p-6">
      
      {/* Title */}
      <h1 className="text-3xl font-bold text-center mb-4">Kinoprompt.bklt.ai</h1>

      {/* Work Panel */}
      <div className="w-full max-w-5xl bg-gray-800 p-6 rounded-lg grid grid-cols-2 gap-4">
        
        {/* Left Side - Inputs */}
        <div className="space-y-4">
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
            onClick={startImageGeneration} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>

        {/* Right Side - Output Display (Images & Video) */}
        <div className="flex flex-col items-center space-y-4">
          {firstImageUrl && <img src={firstImageUrl} alt="First Image" className="w-full rounded-lg" />}
          {lastImageUrl && <img src={lastImageUrl} alt="Last Image" className="w-full rounded-lg" />}
          {muxPlaybackUrl && <VideoPlayer playbackId={muxPlaybackId} />}
        </div>
      </div>

      {/* ✅ GALLERY SECTION - Displays all past entries */}
      <div className="w-full max-w-5xl mt-6 space-y-6">
        {gallery.slice().reverse().map((entry) => (
          <div key={entry.id} className="bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-400">{entry.first_image_prompt}</p>
            {entry.first_image_url && <img src={entry.first_image_url} alt="First Image" className="w-full rounded-lg mt-2" />}
            <p className="text-sm text-gray-400 mt-2">{entry.last_image_prompt}</p>
            {entry.last_image_url && <img src={entry.last_image_url} alt="Last Image" className="w-full rounded-lg mt-2" />}
            {entry.mux_playback_url && (
              <div className="mt-4">
                <VideoPlayer playbackId={entry.mux_playback_id} />
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
