import { useEffect, useRef } from 'react';
import { useSeasonal } from '../../contexts/SeasonalContext';

interface Particle {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  speedX: number;
  opacity: number;
  swingOffset: number;
  swingSpeed: number;
  type: 'snowflake' | 'star' | 'gold_sparkle';
  rotation: number;
  rotationSpeed: number;
}

export function SeasonalSnow() {
  const { settings } = useSeasonal();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isEnabled = settings.mode !== 'off' && settings.snowEnabled;

  useEffect(() => {
    if (!isEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle count: gentle (24), festive (42) - lightweight for high performance
    const count = settings.intensity === 'gentle' ? 24 : 42;
    const particles: Particle[] = [];

    const mode = settings.mode;

    for (let i = 0; i < count; i++) {
      let type: 'snowflake' | 'star' | 'gold_sparkle' = 'snowflake';
      if (mode === 'newyear') {
        type = Math.random() > 0.4 ? 'gold_sparkle' : 'star';
      } else if (mode === 'mixed') {
        const rand = Math.random();
        if (rand < 0.6) type = 'snowflake';
        else if (rand < 0.85) type = 'gold_sparkle';
        else type = 'star';
      }

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: type === 'snowflake' ? Math.random() * 2.5 + 1.2 : Math.random() * 2 + 1,
        speedY: type === 'snowflake' ? Math.random() * 0.9 + 0.4 : Math.random() * 0.7 + 0.3,
        speedX: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.6 + 0.3,
        swingOffset: Math.random() * Math.PI * 2,
        swingSpeed: Math.random() * 0.02 + 0.01,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    let isTabVisible = true;
    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const drawStar = (x: number, y: number, r: number, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
      ctx.shadowColor = 'rgba(250, 204, 21, 0.8)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      // 4-pointed sparkle star
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(Math.cos((i * Math.PI) / 2) * (r * 2.2), Math.sin((i * Math.PI) / 2) * (r * 2.2));
        ctx.lineTo(Math.cos(((i + 0.5) * Math.PI) / 2) * (r * 0.5), Math.sin(((i + 0.5) * Math.PI) / 2) * (r * 0.5));
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      if (!isTabVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.swingOffset += p.swingSpeed;
        p.rotation += p.rotationSpeed;
        const currentSpeedX = p.speedX + Math.sin(p.swingOffset) * 0.35;
        p.x += currentSpeedX;
        p.y += p.speedY;

        // Wrap around borders
        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x > width + 10) p.x = -10;
        if (p.x < -10) p.x = width + 10;

        if (p.type === 'snowflake') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.85})`;
          ctx.shadowColor = 'rgba(224, 242, 254, 0.6)';
          ctx.shadowBlur = 3;
          ctx.fill();
        } else if (p.type === 'star') {
          drawStar(p.x, p.y, p.radius, p.opacity);
        } else {
          // Gold sparkle particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(251, 191, 36, ${p.opacity * 0.9})`;
          ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
          ctx.shadowBlur = 4;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isEnabled, settings.mode, settings.intensity]);

  if (!isEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden"
      style={{ opacity: 0.9 }}
      aria-hidden="true"
    />
  );
}
