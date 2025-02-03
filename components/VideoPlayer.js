import MuxPlayer from "@mux/mux-player-react";

export default function VideoPlayer({ playbackId }) {
  if (!playbackId) return <p>Loading video...</p>;

  return (
    <div style={{ maxWidth: "100%", textAlign: "center", marginTop: "20px" }}>
      <MuxPlayer
        playbackId={playbackId}
        metadataVideoTitle="Generated Video"
        metadata-viewer-user-id="User123"
        primaryColor="#785ae2"
        secondaryColor="#000000"
        accentColor="#4a02cf"
        streamType="on-demand"
        autoPlay
        loop
        muted
        style={{ width: "100%", maxWidth: "800px", borderRadius: "10px" }}
      />
    </div>
  );
}
