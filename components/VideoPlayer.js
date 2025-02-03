import { useEffect, useState } from 'react';
import MuxPlayer from "@mux/mux-player-react";

export default function VideoPlayer({ playbackId }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!playbackId) return;
    
    console.log("🔄 Checking Mux player readiness...");

    // Delay rendering to avoid 'not ready' error
    const checkMuxReady = setTimeout(() => {
      setIsReady(true);
    }, 5000);

    return () => clearTimeout(checkMuxReady);
  }, [playbackId]);

  if (!playbackId) return <p>⏳ Waiting for video...</p>;
  if (!isReady) return <p>🔄 Video is preparing...</p>;

  return (
    <MuxPlayer
      playbackId={playbackId}
      metadataVideoTitle="Generated Video"
      primaryColor="#785ae2"
      secondaryColor="#000000"
      accentColor="#4a02cf"
      streamType="on-demand"
      autoPlay
      controls
      loop
      muted
    />
  );
}
