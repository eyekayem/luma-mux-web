import { useState, useEffect } from 'react';

export default function StatusPoller({ firstImageJobId, lastImageJobId, videoJobId, onUpdate }) {
  useEffect(() => {
    if (!firstImageJobId || !lastImageJobId) return;

    const interval = setInterval(async () => {
      console.log('🔄 Checking job status...');
      const response = await fetch(`/api/status?firstImageJobId=${firstImageJobId}&lastImageJobId=${lastImageJobId}&videoJobId=${videoJobId}`);
      const data = await response.json();

      if (data.status === 'ready') {
        console.log('✅ Media is ready!');
        onUpdate(data);
        clearInterval(interval);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [firstImageJobId, lastImageJobId, videoJobId]);

  return null; // No UI, just logic
}

