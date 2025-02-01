// /pages/api/status.js

import { fetchLumaJobStatus } from "../../utils/luma";
import { uploadToMux } from "../../utils/mux";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { firstImageJobId, lastImageJobId, videoJobId, videoPrompt } = req.query;

    if (!firstImageJobId || !lastImageJobId) {
      return res.status(400).json({ error: "Missing required job IDs" });
    }

    console.log("Checking Luma job statuses...");
    
    const firstImageStatus = await fetchLumaJobStatus(firstImageJobId);
    const lastImageStatus = await fetchLumaJobStatus(lastImageJobId);

    if (!firstImageStatus || !lastImageStatus) {
      return res.status(500).json({ error: "Failed to fetch Luma job status" });
    }

    if (firstImageStatus.status !== "completed" || lastImageStatus.status !== "completed") {
      return res.json({ status: "image_processing" });
    }

    const firstImage = firstImageStatus.result.image_url;
    const lastImage = lastImageStatus.result.image_url;

    let video = null;
    
    if (videoJobId) {
      const videoStatus = await fetchLumaJobStatus(videoJobId);

      if (!videoStatus) {
        return res.status(500).json({ error: "Failed to fetch Luma video job status" });
      }

      if (videoStatus.status === "completed") {
        video = videoStatus.result.video_url;

        console.log("Uploading to Mux:", video);
        const muxPlaybackId = await uploadToMux(video);

        if (muxPlaybackId) {
          video = `https://stream.mux.com/${muxPlaybackId}.m3u8`;
        }
      } else {
        return res.json({ status: "video_processing", firstImage, lastImage });
      }
    }

    return res.json({ status: "completed", firstImage, lastImage, video });

  } catch (error) {
    console.error("Error in status API:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
