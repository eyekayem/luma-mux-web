import { useEffect, useState } from 'react';
import MuxPlayer from "@mux/mux-player-react";

export default function VideoPlayer({ playbackId }) {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!playbackId) return;

    console.log("🔄 Checking Mux player readiness...");

    // Delay rendering to avoid 'not ready' error
    const checkMuxReady = setTimeout(() => {
      setIsReady(true);
    }, 5000);

    return () => clearTimeout(checkMuxReady);
  }, [playbackId]);

  const handlePlay = () => {
    const videoElement = document.getElementById(`mux-player-${playbackId}`);
    if (videoElement) {
      videoElement.play();
      setIsPlaying(true);
    }
  };

  if (!playbackId) return <p>⏳ Waiting for video...</p>;
  if (!isReady) return <p>🔄 Video is preparing...</p>;

  return (
    <div className="video-container relative">
      <MuxPlayer
        id={`mux-player-${playbackId}`}
        playbackId={playbackId}
        metadataVideoTitle="Generated Video"
        primaryColor="#785ae2"
        secondaryColor="#000000"
        accentColor="#4a02cf"
        streamType="on-demand"
        autoPlay={false}
        controls={false}
        loop
        muted
        className="w-full h-full"
      />
      {!isPlaying && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white text-2xl"
        >
          ▶
        </button>
      )}
    </div>
  );
}
