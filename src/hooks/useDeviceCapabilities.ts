import { useState, useEffect } from 'react';

export function useDeviceCapabilities() {
  const [state, setState] = useState(() => compute());

  function compute() {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    return {
      isMobile: w < 768,
      isTablet: w >= 768 && w < 1024,
      isDesktop: w >= 1024,
      isTouchDevice: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
      isPWA: typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true),
    };
  }

  useEffect(() => {
    const onResize = () => setState(compute());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return state;
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export function getCurrentDeviceType(): DeviceType {
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}
