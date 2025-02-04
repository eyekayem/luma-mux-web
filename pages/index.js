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
  const [muxPlaybackId, setMuxPlaybackId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    const storedGallery = JSON.parse(localStorage.getItem('gallery')) || [];
    setGallery(storedGallery);
  }, []);

  function updateGallery(entry) {
    const newGallery = [entry, ...gallery];
    setGallery(newGallery);
    localStorage.setItem('gallery', JSON.stringify(newGallery));
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-6">kinoprompt.bklt.al</h1>
      
      {/* Working Panel */}
      <div className="w-full max-w-xl space-y-4">
        <textarea className="input" value={firstImagePrompt} onChange={(e) => setFirstImagePrompt(e.target.value)} placeholder="First Frame Description" />
        <textarea className="input" value={lastImagePrompt} onChange={(e) => setLastImagePrompt(e.target.value)} placeholder="Last Frame Description" />
        <textarea className="input" value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)} placeholder="Camera Move / Shot Action" />
        <button className="button w-full" disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate Media"}</button>
      </div>

      {/* Placeholder for Working Panel */}
      <div className="w-full max-w-3xl mt-6">
        <div className="flex justify-between gap-4">
          <div className="w-1/2 h-40 bg-gray-700 rounded-lg flex items-center justify-center">
            {firstImageUrl ? <img src={firstImageUrl} className="w-full rounded-lg" /> : <p>First Image Placeholder</p>}
          </div>
          <div className="w-1/2 h-40 bg-gray-700 rounded-lg flex items-center justify-center">
            {lastImageUrl ? <img src={lastImageUrl} className="w-full rounded-lg" /> : <p>Last Image Placeholder</p>}
          </div>
        </div>
        <div className="mt-4 h-60 bg-gray-800 rounded-lg flex items-center justify-center">
          {muxPlaybackId ? <VideoPlayer playbackId={muxPlaybackId} /> : <p>Video Placeholder</p>}
        </div>
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 w-full max-w-5xl">
        {gallery.map((entry, index) => (
          <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 text-center">
            <p className="text-sm font-bold">First Image Prompt</p>
            <div className="h-40 bg-gray-700 rounded-lg flex items-center justify-center">
              {entry.firstImageUrl ? <img src={entry.firstImageUrl} className="w-full rounded-lg" /> : <p>Placeholder</p>}
            </div>
            <p className="text-sm font-bold mt-2">Last Image Prompt</p>
            <div className="h-40 bg-gray-700 rounded-lg flex items-center justify-center">
              {entry.lastImageUrl ? <img src={entry.lastImageUrl} className="w-full rounded-lg" /> : <p>Placeholder</p>}
            </div>
            <p className="text-sm font-bold mt-2">Video</p>
            <div className="mt-2 h-60 bg-gray-800 rounded-lg flex items-center justify-center">
              {entry.muxPlaybackId ? <VideoPlayer playbackId={entry.muxPlaybackId} /> : <p>Video Placeholder</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
