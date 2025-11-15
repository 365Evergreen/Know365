import React, { useRef, useState, useEffect } from 'react';
import { Stack, IconButton, Slider } from '@fluentui/react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  preload?: 'auto' | 'metadata' | 'none';
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
}

const fmtTime = (s: number) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, preload = 'metadata', autoPlay = false, loop = false, muted = false, className }) => {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onLoaded = () => setDuration(el.duration || 0);
    const onTime = () => setCurrent(el.currentTime || 0);
    const onEnded = () => setPlaying(false);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnded);
    };
  }, [src]);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
  }, [volume]);

  const togglePlay = () => {
    const el = ref.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (v: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = v;
    setCurrent(v);
  };

  const goFullscreen = () => {
    const el = ref.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
  };

  return (
    <div className={className}>
      <video ref={ref} src={src} poster={poster} preload={preload} muted={muted} autoPlay={autoPlay} loop={loop} style={{ width: '100%', maxHeight: 480 }} />

      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 8 } }}>
        <IconButton iconProps={{ iconName: playing ? 'Pause' : 'Play' }} title={playing ? 'Pause' : 'Play'} onClick={togglePlay} />
        <div style={{ minWidth: 80 }}>{fmtTime(current)} / {fmtTime(duration)}</div>
        <div style={{ flex: 1 }}>
          <Slider min={0} max={Math.max(0, duration)} step={0.1} value={current} onChange={(v) => seek(Number(v))} />
        </div>
        <div style={{ width: 120 }}>
          <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
            <div style={{ width: 60, fontSize: 12 }}>Vol</div>
            <Slider min={0} max={1} step={0.01} value={volume} onChange={(v) => setVolume(Number(v))} />
          </Stack>
        </div>
        <IconButton iconProps={{ iconName: 'FullScreen' }} title="Fullscreen" onClick={goFullscreen} />
      </Stack>
    </div>
  );
};

export default VideoPlayer;
