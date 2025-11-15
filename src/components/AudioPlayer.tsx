import React, { useRef, useState, useEffect } from 'react';
import { Stack, IconButton, Slider } from '@fluentui/react';

interface AudioPlayerProps {
  src: string;
  preload?: 'auto' | 'metadata' | 'none';
  controls?: boolean; // whether to show built-in controls (we render custom controls by default)
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
}

const formatTime = (s: number) => {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, preload = 'metadata', autoPlay = false, loop = false, muted = false, className }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const el = audioRef.current;
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
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (value: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = value;
    setCurrent(value);
  };

  return (
    <div className={className}>
      <audio ref={audioRef} src={src} preload={preload} loop={loop} autoPlay={autoPlay} muted={muted} />

      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <IconButton iconProps={{ iconName: playing ? 'Pause' : 'Play' }} title={playing ? 'Pause' : 'Play'} onClick={togglePlay} />
        <div style={{ minWidth: 80 }}>{formatTime(current)} / {formatTime(duration)}</div>
        <div style={{ flex: 1 }}>
          <Slider
            min={0}
            max={Math.max(0, duration)}
            step={0.1}
            value={current}
            onChange={(v) => seek(v as number)}
          />
        </div>
        <div style={{ width: 140 }}>
          <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
            <div style={{ width: 60, fontSize: 12 }}>Volume</div>
            <Slider min={0} max={1} step={0.01} value={volume} onChange={(v) => setVolume(Number(v))} />
          </Stack>
        </div>
      </Stack>
    </div>
  );
};

export default AudioPlayer;
