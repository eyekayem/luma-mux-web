// /pages/api/generate.js
import { fetchLumaJobStatus } from "../../utils/luma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { firstImagePrompt, lastImagePrompt, videoPrompt } = req.body;

    if (!firstImagePrompt || !lastImagePrompt || !videoPrompt) {
      return res.status(400).json({ error: "Missing required prompts" });
    }

    // Mock API call to Luma for job creation (replace with actual implementation)
    const jobResponse = await fetchLumaJobStatus("mock-job-id");
    
    return res.status(200).json({
      firstImageJobId: "mock-first-image-job-id",
      lastImageJobId: "mock-last-image-job-id",
      videoJobId: "mock-video-job-id",
      videoPrompt,
    });
  } catch (error) {
    console.error("Error in generate API:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
