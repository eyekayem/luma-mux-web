export default function DisplayImages({ firstImageUrl, lastImageUrl, videoUrl }) {
  return (
    <div>
      <h3>Generated Media:</h3>
      <div style={{ display: 'flex', gap: '20px' }}>
        {firstImageUrl && <img src={firstImageUrl} alt="First Image" style={{ width: '300px', borderRadius: '10px' }} />}
        {lastImageUrl && <img src={lastImageUrl} alt="Last Image" style={{ width: '300px', borderRadius: '10px' }} />}
      </div>
      {videoUrl && (
        <div style={{ marginTop: '20px' }}>
          <video src={videoUrl} controls style={{ width: '100%', maxWidth: '640px', borderRadius: '10px' }} />
        </div>
      )}
    </div>
  );
}

