// /utils/mux.js

import Mux from "@mux/mux-node";

const { MUX_ACCESS_TOKEN, MUX_SECRET_KEY } = process.env;

if (!MUX_ACCESS_TOKEN || !MUX_SECRET_KEY) {
  throw new Error("Mux API credentials are missing. Check your environment variables.");
}

const mux = new Mux(MUX_ACCESS_TOKEN, MUX_SECRET_KEY);
const { Video } = mux;

export async function uploadToMux(videoUrl) {
  try {
    const asset = await Video.Assets.create({
      input: videoUrl,
      playback_policy: ["public"],
      encoding_tier: "baseline",
    });

    console.log("Mux upload successful, Playback ID:", asset.playback_ids[0]?.id);
    return asset.playback_ids[0]?.id; // Return playback ID for streaming
  } catch (error) {
    console.error("Error uploading video to Mux:", error);
    return null;
  }
}
