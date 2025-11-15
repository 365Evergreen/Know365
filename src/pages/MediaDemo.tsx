import React from 'react';
import { Stack, PrimaryButton } from '@fluentui/react';
import AudioPlayer from '../components/AudioPlayer';
import VideoPlayer from '../components/VideoPlayer';

const MediaDemo: React.FC = () => {
  // public sample sources for testing streaming/demo purposes
  const sampleAudio = 'https://www.w3schools.com/html/horse.mp3';
  const sampleVideo = 'https://www.w3schools.com/html/mov_bbb.mp4';

  return (
    <div style={{ padding: 20 }}>
      <h2>Media Demo</h2>
      <p>Use these players to test audio and video streaming. These are placeholder sources; replace them with your CDN/Blob URLs for real tests.</p>

      <Stack tokens={{ childrenGap: 16 }}>
        <div>
          <h3>Audio Player</h3>
          <AudioPlayer src={sampleAudio} preload="auto" />
        </div>

        <div>
          <h3>Video Player</h3>
          <VideoPlayer src={sampleVideo} preload="metadata" poster="" />
        </div>

        <div>
          <PrimaryButton href="/admin/icons" text="Open Icon Manager" />
        </div>
      </Stack>
    </div>
  );
};

export default MediaDemo;
