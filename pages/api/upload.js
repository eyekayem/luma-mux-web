import { uploadToMux } from '../../utils/mux';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { videoUrl } = req.body;

  if (!videoUrl) {
    return res.status(400).json({ error: 'Missing video URL' });
  }

  try {
    console.log('🚀 Uploading video to Mux:', videoUrl);
    const playbackId = await uploadToMux(videoUrl);

    console.log("✅ Mux Upload Successful, Playback ID:", playbackId);
    res.status(200).json({ playbackId });

  } catch (error) {
    console.error("❌ Error uploading video to Mux:", error);
    res.status(500).json({ error: error.message });
  }
}
