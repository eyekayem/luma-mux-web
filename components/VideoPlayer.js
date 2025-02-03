import MuxPlayer from "@mux/mux-player-react";

export default function VideoPlayer({ playbackId }) {
  if (!playbackId) return <p>Loading video...</p>;

  return (
    <MuxPlayer
      playbackId={playbackId}
      metadataVideoTitle="Generated Video"
      metadataViewerUserId="User123"
      primaryColor="#785ae2"
      secondaryColor="#000000"
      accentColor="#4a02cf"
      streamType="on-demand"
      autoPlay
      loop
      muted
    />
  );
}
