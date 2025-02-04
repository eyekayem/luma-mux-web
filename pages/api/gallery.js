let gallery = []; // Store gallery entries in memory

export default function handler(req, res) {
  if (req.method === 'GET') {
    // ✅ Return the gallery to the frontend
    return res.status(200).json({ gallery });
  }

  if (req.method === 'POST') {
    const { firstImagePrompt, firstImageUrl, lastImagePrompt, lastImageUrl, videoPrompt, muxPlaybackId } = req.body;

    if (!firstImageUrl || !lastImageUrl || !muxPlaybackId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ✅ Save the new entry
    const newEntry = { firstImagePrompt, firstImageUrl, lastImagePrompt, lastImageUrl, videoPrompt, muxPlaybackId };
    gallery.unshift(newEntry); // Add new entry at the start

    return res.status(201).json({ message: 'Gallery updated', gallery });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
