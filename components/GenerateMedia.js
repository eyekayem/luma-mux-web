import { useState } from 'react';
import StatusPoller from './StatusPoller';

export default function GenerateMedia() {
  const [firstImageJobId, setFirstImageJobId] = useState(null);
  const [lastImageJobId, setLastImageJobId] = useState(null);
  const [videoJobId, setVideoJobId] = useState(null);
  const [firstImageUrl, setFirstImageUrl] = useState(null);
  const [lastImageUrl, setLastImageUrl] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [status, setStatus] = useState('idle');

  const handleUpdate = (data) => {
    setFirstImageUrl(data.firstImageUrl);
    setLastImageUrl(data.lastImageUrl);
    setVideoUrl(data.videoUrl);
    setStatus('ready');
  };

  const generateMedia = async () => {
    console.log('📸 Requesting media generation...');
    setStatus('generating');

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstImagePrompt: "A futuristic city at sunset",
        lastImagePrompt: "The same city but fully cyberpunk at night",
        videoPrompt: "Camera zooms into the city skyline"
      })
    });

    const data = await response.json();
    if (data.firstImageJobId && data.lastImageJobId) {
      console.log('✅ Image jobs created, starting polling...');
      setFirstImageJobId(data.firstImageJobId);
      setLastImageJobId(data.lastImageJobId);
      setVideoJobId(data.videoJobId); // Will be set later
    } else {
      console.error('❌ Error generating media', data.error);
      setStatus('error');
    }
  };

  return (
    <div>
      <button onClick={generateMedia} disabled={status === 'generating'}>
        {status === 'generating' ? 'Generating...' : 'Generate Media'}
      </button>

      {firstImageJobId && lastImageJobId && (
        <StatusPoller firstImageJobId={firstImageJobId} lastImageJobId={lastImageJobId} videoJobId={videoJobId} onUpdate={handleUpdate} />
      )}

      {status === 'ready' && (
        <div>
          <h3>Generated Media:</h3>
          <img src={firstImageUrl} alt="First Image" />
          <img src={lastImageUrl} alt="Last Image" />
          {videoUrl && <video src={videoUrl} controls />}
        </div>
      )}
    </div>
  );
}

