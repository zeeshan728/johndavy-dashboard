import { useEffect, useRef, useState } from 'react';

// Animates a displayed number toward `value` whenever it changes — first render shows
// the real value immediately (no animating up from zero on page load), only later
// changes tween.
export function useCountUp(value: number, durationMs = 800): number {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      prevRef.current = to;
    };
  }, [value, durationMs]);

  return display;
}
