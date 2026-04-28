import { useEffect, useState } from 'react';

export interface BoxSize {
  w: number;
  h: number;
}

export function getPreviewBoxForViewport(): BoxSize {
  if (typeof window === 'undefined') return { w: 540, h: 700 };
  const ww = window.innerWidth;
  const vh = window.innerHeight;
  // 모바일에선 시트(닫힘 ~12vh)와 topBar 영역 빼고 78vh 정도가 안전
  const desktopH = vh * 0.86;
  const mobileH = vh * 0.78;
  if (ww >= 880) return { w: 460, h: desktopH };
  if (ww >= 600) return { w: 440, h: mobileH };
  if (ww >= 420) return { w: Math.min(400, ww - 20), h: mobileH };
  return { w: Math.max(300, ww - 20), h: mobileH };
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
