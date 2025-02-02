import { createLumaImage } from '../../utils/luma';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('🟢 Starting media generation process');
  const { firstImagePrompt, lastImagePrompt } = req.body;

  try {
    console.log('📸 Creating First Image...');
    const firstImageJobId = await createLumaImage(firstImagePrompt);

    console.log('📸 Creating Last Image...');
    const lastImageJobId = await createLumaImage(lastImagePrompt);

    console.log('✅ Image jobs created successfully!');
    res.status(200).json({ firstImageJobId, lastImageJobId });
  } catch (error) {
    console.error('❌ Error generating media:', error);
    res.status(500).json({ error: error.message });
  }
}
