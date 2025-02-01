// /pages/api/upload.js

import { uploadToMux } from "../../utils/mux";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: "Missing video URL" });
    }

    console.log("Uploading video to Mux:", videoUrl);
    
    const muxPlaybackId = await uploadToMux(videoUrl);

    if (!muxPlaybackId) {
      return res.status(500).json({ error: "Failed to upload video to Mux" });
    }

    return res.json({ status: "success", playbackId: muxPlaybackId });

  } catch (error) {
    console.error("Error in upload API:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
