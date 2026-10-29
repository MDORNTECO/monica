import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

export type SeasonalMode = 'mixed' | 'christmas' | 'newyear' | 'off';

export interface SeasonalSettings {
  mode: SeasonalMode;
  snowEnabled: boolean;
  lightsEnabled: boolean;
  bannerEnabled: boolean;
  soundEnabled: boolean;
  intensity: 'gentle' | 'festive';
}

interface SeasonalContextType {
  settings: SeasonalSettings;
  updateSettings: (partial: Partial<SeasonalSettings>) => void;
  setMode: (mode: SeasonalMode) => void;
  triggerCelebration: (type?: 'christmas' | 'newyear' | 'auto') => void;
  playHolidayBell: () => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  getDaysUntilChristmas: () => number;
  getDaysUntilNewYear: () => number;
  targetNewYear: number;
}

const STORAGE_KEY = 'agenda_seasonal_customization_v2';

const defaultSettings: SeasonalSettings = {
  mode: 'mixed',
  snowEnabled: true,
  lightsEnabled: true,
  bannerEnabled: true,
  soundEnabled: false,
  intensity: 'festive',
};

const SeasonalContext = createContext<SeasonalContextType | undefined>(undefined);

export function SeasonalProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SeasonalSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return defaultSettings;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore write errors
    }
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<SeasonalSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const setMode = useCallback((mode: SeasonalMode) => {
    setSettings((prev) => ({ ...prev, mode }));
  }, []);

  // Web Audio API Holiday Jingle Bell synthesizer
  const playHolidayBell = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Play a lovely double bell chime (E6 and G6 harmonic chords)
      const now = ctx.currentTime;
      const chords = [
        { time: 0, freqs: [1318.51, 1975.53, 2637.02] }, // E6 + B6 + E7
        { time: 0.18, freqs: [1567.98, 2093.00, 3135.96] }, // G6 + C7 + G7
      ];

      chords.forEach(({ time, freqs }) => {
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          const vol = 0.08 / (idx + 1);
          gain.gain.setValueAtTime(0.001, now + time);
          gain.gain.exponentialRampToValueAtTime(vol, now + time + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + time + 0.9);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + 1.0);
        });
      });
    } catch (e) {
      console.warn('Audio not allowed yet by user interaction', e);
    }
  }, []);

  // Calculate days remaining dynamically based on current year
  const getNextChristmas = () => {
    const now = new Date();
    const year = now.getFullYear();
    const christmasThisYear = new Date(year, 11, 25); // Dec 25
    if (now.getTime() > christmasThisYear.getTime() + 86400000) {
      return new Date(year + 1, 11, 25);
    }
    return christmasThisYear;
  };

  const getNextNewYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    return new Date(year + 1, 0, 1); // Jan 1
  };

  const getDaysUntilChristmas = useCallback(() => {
    const now = new Date();
    const target = getNextChristmas();
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, []);

  const getDaysUntilNewYear = useCallback(() => {
    const now = new Date();
    const target = getNextNewYear();
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, []);

  const targetNewYear = new Date().getFullYear() + 1;

  // Celebration Fireworks / Confetti
  const triggerCelebration = useCallback((type: 'christmas' | 'newyear' | 'auto' = 'auto') => {
    const resolvedType = type === 'auto' 
      ? (settings.mode === 'newyear' ? 'newyear' : 'christmas')
      : type;

    if (settings.soundEnabled) {
      playHolidayBell();
    }

    if (resolvedType === 'christmas') {
      // Christmas festive burst: Holly green, Santa red, snow white, and gold stars
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#ef4444', '#10b981', '#f59e0b', '#ffffff', '#dc2626'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ef4444', '#10b981', '#fcd34d'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#ef4444', '#10b981', '#fcd34d'],
        });
      }, 250);
    } else {
      // New Year fireworks burst: Luxury gold, silver, champagne, royal purple, cyan
      confetti({
        particleCount: 110,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#fef08a', '#e2e8f0', '#c084fc', '#38bdf8', '#f59e0b'],
      });
      // Second salvo (simulating real fireworks bursts)
      setTimeout(() => {
        confetti({
          particleCount: 75,
          spread: 100,
          origin: { x: 0.25, y: 0.4 },
          colors: ['#fbbf24', '#f59e0b', '#ffffff'],
        });
      }, 350);
      setTimeout(() => {
        confetti({
          particleCount: 75,
          spread: 100,
          origin: { x: 0.75, y: 0.4 },
          colors: ['#38bdf8', '#c084fc', '#fbbf24'],
        });
      }, 650);
    }
  }, [settings.mode, settings.soundEnabled, playHolidayBell]);

  return (
    <SeasonalContext.Provider
      value={{
        settings,
        updateSettings,
        setMode,
        triggerCelebration,
        playHolidayBell,
        isModalOpen,
        setIsModalOpen,
        getDaysUntilChristmas,
        getDaysUntilNewYear,
        targetNewYear,
      }}
    >
      {children}
    </SeasonalContext.Provider>
  );
}

export function useSeasonal() {
  const context = useContext(SeasonalContext);
  if (!context) {
    throw new Error('useSeasonal must be used within a SeasonalProvider');
  }
  return context;
}
