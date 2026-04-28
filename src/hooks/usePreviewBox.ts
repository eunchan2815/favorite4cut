import { useEffect, useState } from 'react';

export interface BoxSize {
  w: number;
  h: number;
}

export function getPreviewBoxForViewport(): BoxSize {
  if (typeof window === 'undefined') return { w: 460, h: 580 };
  const ww = window.innerWidth;
  if (ww >= 880) return { w: 460, h: 580 };
  if (ww >= 600) return { w: 380, h: 500 };
  if (ww >= 420) return { w: 300, h: 420 };
  return { w: Math.max(220, ww - 56), h: Math.max(300, ww - 56 + 100) };
}

const getBoxFromViewport = getPreviewBoxForViewport;

/** Viewport-aware box size for FramePreview. Updates on window resize. */
export function usePreviewBox(): BoxSize {
  const [box, setBox] = useState<BoxSize>(getBoxFromViewport);
  useEffect(() => {
    const onResize = () => setBox(getBoxFromViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return box;
}
