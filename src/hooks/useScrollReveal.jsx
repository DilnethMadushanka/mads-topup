import { useEffect, useRef, useState } from 'react';

/**
 * useScrollReveal — lightweight IntersectionObserver-based scroll animation hook
 */
export const useScrollReveal = ({ threshold = 0.12, rootMargin = '0px 0px -60px 0px', once = true } = {}) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isVisible];
};

/**
 * ScrollReveal — wrapper component for scroll animations
 * animation: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale-in' | 'fade-in' | 'zoom-up'
 */
export const ScrollReveal = ({ children, animation = 'fade-up', delay = 0, duration = 600, className = '', threshold = 0.12 }) => {
  const [ref, isVisible] = useScrollReveal({ threshold });
  const delayStyle = delay ? { transitionDelay: `${delay}ms` } : {};

  const states = {
    'fade-up':    { hidden: { opacity: 0, transform: 'translateY(40px)' },    visible: { opacity: 1, transform: 'translateY(0)' } },
    'fade-down':  { hidden: { opacity: 0, transform: 'translateY(-40px)' },   visible: { opacity: 1, transform: 'translateY(0)' } },
    'fade-left':  { hidden: { opacity: 0, transform: 'translateX(50px)' },    visible: { opacity: 1, transform: 'translateX(0)' } },
    'fade-right': { hidden: { opacity: 0, transform: 'translateX(-50px)' },   visible: { opacity: 1, transform: 'translateX(0)' } },
    'scale-in':   { hidden: { opacity: 0, transform: 'scale(0.88)' },         visible: { opacity: 1, transform: 'scale(1)' } },
    'zoom-up':    { hidden: { opacity: 0, transform: 'scale(0.93) translateY(24px)' }, visible: { opacity: 1, transform: 'scale(1) translateY(0)' } },
    'fade-in':    { hidden: { opacity: 0 },                                    visible: { opacity: 1 } },
  };

  const state = states[animation] || states['fade-up'];

  return (
    <div
      ref={ref}
      style={{
        transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1), transform ${duration}ms cubic-bezier(0.22,1,0.36,1)`,
        willChange: 'opacity, transform',
        ...(isVisible ? state.visible : state.hidden),
        ...delayStyle,
      }}
      className={className}
    >
      {children}
    </div>
  );
};
