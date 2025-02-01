// /utils/luma.js
const LUMA_API_KEY = process.env.LUMA_API_KEY;

export async function fetchLumaJobStatus(jobId) {
  try {
    const response = await fetch(`https://cloud.luma-api.com/v1/job/${jobId}`, {
      headers: {
        Authorization: `Bearer ${LUMA_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`Luma API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching Luma job status:", error);
    return null;
  }
}
