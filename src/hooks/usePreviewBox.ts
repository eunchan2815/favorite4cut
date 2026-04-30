import { useEffect, useState } from 'react';

export interface BoxSize {
  w: number;
  h: number;
}

export function getPreviewBoxForViewport(): BoxSize {
  if (typeof window === 'undefined') return { w: 460, h: 700 };
  const ww = window.innerWidth;
  const vh = window.innerHeight;

  // 데스크톱 / 태블릿
  if (ww >= 880) return { w: 460, h: vh * 0.86 };
  if (ww >= 720) return { w: 440, h: vh * 0.82 };

  // 모바일 — frameCard padding(좌우 28~32px) + page padding(좌우 24~32px) 까지 고려한 보수적 padding
  // 즉 viewport에서 약 56~72px 빼야 카드 내부에 안전하게 fit
  const safeH = vh < 700 ? vh * 0.68 : vh * 0.72;
  const wPad = ww >= 430 ? 72 : ww >= 380 ? 64 : ww >= 340 ? 56 : 48;
  const w = Math.max(240, ww - wPad);

  return { w, h: safeH };
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
