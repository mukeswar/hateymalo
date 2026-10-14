import React, { useEffect, useRef, useState } from 'react';

// Shared, dependency-free motion helpers. Every effect is skipped when the
// visitor has asked the OS for reduced motion, and tilt is skipped on touch.

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

// Fades/slides children in the first time they scroll into view.
export const Reveal = ({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${shown ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : undefined }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

// Subtle pointer-follow 3D tilt with a soft moving highlight.
export const Tilt = ({ as: Tag = 'div', max = 6, className = '', children, ...rest }) => {
  const ref = useRef(null);
  const frame = useRef(0);

  const onMove = (e) => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || !canHover()) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--tilt-x', `${(0.5 - py) * max}deg`);
      el.style.setProperty('--tilt-y', `${(px - 0.5) * max}deg`);
      el.style.setProperty('--glare-x', `${px * 100}%`);
      el.style.setProperty('--glare-y', `${py * 100}%`);
    });
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <Tag ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`tilt ${className}`} {...rest}>
      {children}
    </Tag>
  );
};

// Counts a real number up from 0 once visible. Renders the final value
// immediately for reduced motion, and "—" while the value is unknown.
export const CountUp = ({ value, duration = 1400, format = (n) => n.toLocaleString() }) => {
  const ref = useRef(null);
  const [display, setDisplay] = useState(null);

  useEffect(() => {
    if (value === null || value === undefined) return;
    const el = ref.current;
    if (!el || prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(value * eased));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {value === null || value === undefined ? '—' : format(display ?? 0)}
    </span>
  );
};

// Small scroll-linked parallax offset (px) for decorative layers.
export const useParallax = (strength = 0.08) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -strength;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [strength]);
  return ref;
};
