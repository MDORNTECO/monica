import { useSeasonal } from '../../contexts/SeasonalContext';

export function SeasonalLights() {
  const { settings } = useSeasonal();

  if (settings.mode === 'off' || !settings.lightsEnabled) {
    return null;
  }

  const isChristmas = settings.mode === 'christmas' || settings.mode === 'mixed';
  const isNewYear = settings.mode === 'newyear';

  // Palette definition
  const christmasBulbs = [
    { bg: '#ef4444', glow: 'rgba(239, 68, 68, 0.8)', delay: '0s' },     // Ruby
    { bg: '#10b981', glow: 'rgba(16, 185, 129, 0.8)', delay: '0.4s' },  // Emerald
    { bg: '#f59e0b', glow: 'rgba(245, 158, 11, 0.85)', delay: '0.8s' }, // Gold
    { bg: '#3b82f6', glow: 'rgba(59, 130, 246, 0.8)', delay: '1.2s' },  // Sapphire
    { bg: '#ec4899', glow: 'rgba(236, 72, 153, 0.8)', delay: '0.2s' },  // Magenta
    { bg: '#10b981', glow: 'rgba(16, 185, 129, 0.8)', delay: '1.0s' },  // Emerald
    { bg: '#ef4444', glow: 'rgba(239, 68, 68, 0.8)', delay: '0.6s' },   // Ruby
    { bg: '#f59e0b', glow: 'rgba(245, 158, 11, 0.85)', delay: '1.4s' }, // Gold
  ];

  const newYearBulbs = [
    { bg: '#f59e0b', glow: 'rgba(245, 158, 11, 0.9)', delay: '0s' },     // Warm Amber
    { bg: '#fef08a', glow: 'rgba(254, 240, 138, 0.95)', delay: '0.5s' }, // Champagne White
    { bg: '#fbbf24', glow: 'rgba(251, 191, 36, 0.9)', delay: '1.0s' },   // Royal Gold
    { bg: '#e0f2fe', glow: 'rgba(224, 242, 254, 0.85)', delay: '0.3s' }, // Diamond Silver
    { bg: '#c084fc', glow: 'rgba(192, 132, 252, 0.75)', delay: '0.8s' }, // Amethyst Celebration
    { bg: '#fef08a', glow: 'rgba(254, 240, 138, 0.95)', delay: '1.2s' }, // Champagne
  ];

  const bulbs = isNewYear ? newYearBulbs : christmasBulbs;
  // Generate 24 bulbs spanning across the top
  const count = 28;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 pointer-events-none flex justify-between items-start px-2 overflow-hidden h-7"
      aria-hidden="true"
    >
      {/* Decorative dark green / gold garland wire line */}
      <svg
        className="absolute top-0 left-0 w-full h-4 text-emerald-950/40 dark:text-emerald-900/40 stroke-current fill-none"
        preserveAspectRatio="none"
        viewBox="0 0 1000 20"
      >
        <path
          d="M0,2 Q40,16 80,4 Q120,16 160,4 Q200,16 240,4 Q280,16 320,4 Q360,16 400,4 Q440,16 480,4 Q520,16 560,4 Q600,16 640,4 Q680,16 720,4 Q760,16 800,4 Q840,16 880,4 Q920,16 960,4 Q1000,16 1040,4"
          strokeWidth="1.2"
        />
      </svg>

      {Array.from({ length: count }).map((_, index) => {
        const bulb = bulbs[index % bulbs.length];
        return (
          <div
            key={index}
            className="flex flex-col items-center relative"
            style={{ marginTop: (index % 2 === 0 ? '1px' : '4px') }}
          >
            {/* Socket cap */}
            <div className="w-1.5 h-1.5 bg-slate-700/80 rounded-t-xs" />
            {/* Bulb with glow */}
            <div
              className="w-2.5 h-3.5 rounded-full seasonal-bulb transition-transform"
              style={{
                backgroundColor: bulb.bg,
                boxShadow: `0 0 8px 2px ${bulb.glow}, inset 0 1px 2px rgba(255,255,255,0.7)`,
                animation: `twinkleBulb 1.8s infinite alternate ease-in-out`,
                animationDelay: bulb.delay,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
