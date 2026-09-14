import { useEffect, useState } from "react";

/** @param track 当前麦克风轨道。@param enabled 是否检测。@returns 0–100 的相对音量，不播放本地声音。 */
export function useAudioLevel(track: MediaStreamTrack | undefined, enabled: boolean): number {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    setLevel(0);
    if (!track || !enabled || track.readyState === "ended") return;
    const context = new AudioContext();
    const source = context.createMediaStreamSource(new MediaStream([track]));
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const timer = window.setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      const energy = samples.reduce((total, sample) => total + ((sample - 128) / 128) ** 2, 0);
      setLevel(Math.min(100, Math.round(Math.sqrt(energy / samples.length) * 350)));
    }, 100);
    void context.resume().catch(() => undefined);
    return () => { window.clearInterval(timer); source.disconnect(); analyser.disconnect(); void context.close(); };
  }, [track, enabled]);
  return level;
}
