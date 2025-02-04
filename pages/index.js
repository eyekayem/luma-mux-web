import { useState } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [firstImageJobId, setFirstImageJobId] = useState('');
  const [lastImageJobId, setLastImageJobId] = useState('');
  const [videoJobId, setVideoJobId] = useState('');
  const [muxPlaybackId, setMuxPlaybackId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);

  async function generateMedia() {
    setIsGenerating(true);
    console.log('🚀 Sending request to generate images...');

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        firstImagePrompt: "A fashion show for clowns, on the runway. Everyone in the audience is not a clown.",
        lastImagePrompt: "Holding a hand mirror up and seeing that you are a clown."
      })
    });

    const data = await response.json();
    if (data.firstImageJobId && data.lastImageJobId) {
      console.log('✅ Image jobs created:', data);
      setFirstImageJobId(data.firstImageJobId);
      setLastImageJobId(data.lastImageJobId);
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

      if (data.firstImageUrl) {
        console.log("✅ First Image Ready:", data.firstImageUrl);
        setFirstImageUrl(data.firstImageUrl);
      }
      if (data.lastImageUrl) {
        console.log("✅ Last Image Ready:", data.lastImageUrl);
        setLastImageUrl(data.lastImageUrl);
      }

      if (data.readyForVideo) {
        clearInterval(pollInterval);
        console.log('🎬 Images ready, starting video generation...');
        startVideoGeneration(data.firstImageUrl, data.lastImageUrl);
      }
    }, 5000);
  }

  async function startVideoGeneration(firstImageUrl, lastImageUrl) {
    console.log("🎬 Preparing to start video generation...");
    console.log("✅ First Image URL:", firstImageUrl);
    console.log("✅ Last Image URL:", lastImageUrl);

    if (!firstImageUrl || !lastImageUrl) {
      console.error("❌ Image URLs are missing before sending request.");
      return;
    }

    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstImageUrl, lastImageUrl, videoPrompt: "Looking down from the fashion runway while holding a hand mirror up and seeing that you are a clown." })
    });

    const data = await response.json();
    console.log("🎥 Video Generation Response:", data);

    if (data.videoJobId) {
      console.log("🎬 Video job created successfully:", data.videoJobId);
      setVideoJobId(data.videoJobId);
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
    }, 5000);
  }

  async function startMuxUpload(videoUrl) {
    console.log("🚀 Uploading video to Mux:", videoUrl);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoUrl })
    });

    const data = await response.json();
    console.log("📡 Mux Upload Response:", data);

    if (data.playbackId) {
      console.log("✅ Video successfully uploaded to Mux:", data.playbackId);
      setMuxPlaybackId(data.playbackId);
      setGallery((prevGallery) => [{ firstImagePrompt, firstImageUrl, lastImagePrompt, lastImageUrl, videoPrompt, muxPlaybackId: data.playbackId }, ...prevGallery]);
    }
  }

  return (
    <>
      <div>
        <h1>kinoprompt.bklt.al</h1>
        <button onClick={generateMedia} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Media'}
        </button>
      </div>
  
      {muxPlaybackId ? <VideoPlayer playbackId={muxPlaybackId} /> : <p>No video available</p>}
  
      <div className="gallery">
        {gallery.map((entry, index) => (
          <div key={index} className="gallery-item">
            <p><strong>First Image Prompt:</strong> {entry.firstImagePrompt}</p>
            <img src={entry.firstImageUrl} alt="First Image" />
            <p><strong>Last Image Prompt:</strong> {entry.lastImagePrompt}</p>
            <img src={entry.lastImageUrl} alt="Last Image" />
            <p><strong>Action / Camera Prompt:</strong> {entry.videoPrompt}</p>
            <VideoPlayer playbackId={entry.muxPlaybackId} />
            <button onClick={() => reloadGeneration(entry)}>Reload</button>
          </div>
        ))}
      </div>
    </>
  );


      {muxPlaybackId ? <VideoPlayer playbackId={muxPlaybackId} /> : <p>No video available</p>}
      <div className="gallery">
        {gallery.map((entry, index) => (
          <div key={index} className="gallery-item">
            <p><strong>First Image Prompt:</strong> {entry.firstImagePrompt}</p>
            <img src={entry.firstImageUrl} alt="First Image" />
            <p><strong>Last Image Prompt:</strong> {entry.lastImagePrompt}</p>
            <img src={entry.lastImageUrl} alt="Last Image" />
            <p><strong>Action / Camera Prompt:</strong> {entry.videoPrompt}</p>
            <VideoPlayer playbackId={entry.muxPlaybackId} />
            <button onClick={() => reloadGeneration(entry)}>Reload</button>
          </div>
        ))}
      </div>
    </div>
  );
}
 
