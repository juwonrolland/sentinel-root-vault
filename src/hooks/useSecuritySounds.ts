import { useCallback, useRef } from "react";

interface SoundOptions {
  enabled: boolean;
}

const SOUND_PATTERNS = {
  attack_detected: [
    { frequency: 800, duration: 0.1, type: "square" as OscillatorType },
    { frequency: 600, duration: 0.1, type: "square" as OscillatorType },
    { frequency: 800, duration: 0.15, type: "square" as OscillatorType },
  ],
  attack_blocked: [
    { frequency: 440, duration: 0.15, type: "sine" as OscillatorType },
    { frequency: 880, duration: 0.2, type: "sine" as OscillatorType },
  ],
  node_spawned: [
    { frequency: 523, duration: 0.1, type: "sine" as OscillatorType },
    { frequency: 659, duration: 0.1, type: "sine" as OscillatorType },
    { frequency: 784, duration: 0.15, type: "sine" as OscillatorType },
  ],
  node_destroyed: [
    { frequency: 300, duration: 0.2, type: "sawtooth" as OscillatorType },
    { frequency: 200, duration: 0.3, type: "sawtooth" as OscillatorType },
  ],
  critical_alert: [
    { frequency: 880, duration: 0.15, type: "square" as OscillatorType },
    { frequency: 0, duration: 0.05, type: "sine" as OscillatorType },
    { frequency: 880, duration: 0.15, type: "square" as OscillatorType },
    { frequency: 0, duration: 0.05, type: "sine" as OscillatorType },
    { frequency: 880, duration: 0.15, type: "square" as OscillatorType },
  ],
  threat_mitigated: [
    { frequency: 400, duration: 0.1, type: "triangle" as OscillatorType },
    { frequency: 500, duration: 0.1, type: "triangle" as OscillatorType },
    { frequency: 600, duration: 0.15, type: "triangle" as OscillatorType },
  ],
};

export type SoundType = keyof typeof SOUND_PATTERNS;

export const useSecuritySounds = (options: SoundOptions = { enabled: true }) => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(
    (soundType: SoundType) => {
      if (!options.enabled) return;

      try {
        const ctx = getAudioContext();
        const pattern = SOUND_PATTERNS[soundType];
        let time = ctx.currentTime;

        pattern.forEach(({ frequency, duration, type }) => {
          if (frequency === 0) {
            time += duration;
            return;
          }

          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.frequency.value = frequency;
          oscillator.type = type;

          gainNode.gain.setValueAtTime(0.2, time);
          gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);

          oscillator.start(time);
          oscillator.stop(time + duration);

          time += duration;
        });
      } catch (error) {
        console.error("Error playing sound:", error);
      }
    },
    [options.enabled, getAudioContext]
  );

  const cleanup = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return { playSound, cleanup };
};
