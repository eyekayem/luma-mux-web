import { useState, useEffect } from 'react';
import VideoPlayer from '../components/VideoPlayer';

export default function Home() {
  const [firstImagePrompt, setFirstImagePrompt] = useState('A fashion show for clowns, on the runway. Everyone in the audience is not a clown.');
  const [lastImagePrompt, setLastImagePrompt] = useState('Holding a hand mirror up and seeing that you are a clown.');
  const [videoPrompt, setVideoPrompt] = useState('Looking down from the fashion runway while holding a hand mirror up and seeing that you are a clown.');

  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [muxPlaybackId, setMuxPlaybackId] = useState('');
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
    setFirstImageUrl('https://via.placeholder.com/300x200?text=First+Image');
    setLastImageUrl('https://via.placeholder.com/300x200?text=Last+Image');
    setMuxPlaybackId('placeholder');

    setTimeout(() => {
      const firstUrl = 'https://example.com/first.jpg';
      const lastUrl = 'https://example.com/last.jpg';
      const videoId = 'samplePlaybackId';
      setFirstImageUrl(firstUrl);
      setLastImageUrl(lastUrl);
      setMuxPlaybackId(videoId);
      
      setGallery([{ firstImagePrompt, firstImageUrl: firstUrl, lastImagePrompt, lastImageUrl: lastUrl, videoPrompt, muxPlaybackId: videoId }, ...gallery]);
    }, 2000);
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
          {muxPlaybackId && <VideoPlayer playbackId={muxPlaybackId} className="w-full" />}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 w-full max-w-6xl">
        {gallery.map((entry, index) => (
          <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col items-center text-center">
            <p className="text-sm text-gray-400">{entry.firstImagePrompt}</p>
            <img src={entry.firstImageUrl} alt="First" className="w-full rounded-lg" />
            <p className="text-sm text-gray-400">{entry.lastImagePrompt}</p>
            <img src={entry.lastImageUrl} alt="Last" className="w-full rounded-lg" />
            <p className="text-sm text-gray-400">{entry.videoPrompt}</p>
            <VideoPlayer playbackId={entry.muxPlaybackId} className="w-full" />
            <button className="mt-2 bg-blue-500 p-2 rounded-lg text-white" onClick={() => {
              setFirstImagePrompt(entry.firstImagePrompt);
              setLastImagePrompt(entry.lastImagePrompt);
              setVideoPrompt(entry.videoPrompt);
            }}>Reprompt</button>
          </div>
        ))}
      </div>
    </div>
  );
}
