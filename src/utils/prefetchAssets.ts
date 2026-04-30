import { STICKER_LIB } from './stickers';

/** 꾸미기 페이지에서 사용되는 배경 이미지 목록 — DefaultDecorate.tsx와 동기화 유지 */
export const FRAME_BG_IMAGES: string[] = [
  '/image1.jpg',
  '/image2.jpg',
  '/image3.webp',
  '/image4.jpg',
  '/image5.jpg',
  '/image6.jpg',
  '/image7.webp',
  '/image8.jpg',
  '/image9.jpg',
  '/image10.png',
  '/image11.png',
  '/image12.jpg',
  '/image13.jpg',
  '/image14.webp',
  '/image15.jpg',
  '/image16.jpg',
  '/image17.webp',
  '/image18.jpg',
  '/image19.webp',
];

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}

type RIC = (cb: (deadline: IdleDeadline) => void, opts?: { timeout?: number }) => number;
type CIC = (handle: number) => void;

const ric: RIC =
  (typeof window !== 'undefined' &&
    (window as unknown as { requestIdleCallback?: RIC }).requestIdleCallback) ||
  ((cb) =>
    window.setTimeout(
      () => cb({ didTimeout: false, timeRemaining: () => 12 }),
      80
    ) as unknown as number);

const cic: CIC =
  (typeof window !== 'undefined' &&
    (window as unknown as { cancelIdleCallback?: CIC }).cancelIdleCallback) ||
  ((id) => window.clearTimeout(id));

/**
 * 스티커·배경을 백그라운드 idle 시간에 점진적으로 prefetch.
 * 5장씩 배치로 받음 — 한 번에 60+개 fetch 폭주 방지.
 *
 * 카메라 페이지처럼 사용자가 한참 idle한 동안 호출하면 꾸미기 시트 열림 시 즉시 표시됨.
 *
 * @returns cancel 함수. 페이지 unmount 등에서 호출하면 남은 prefetch 중단.
 */
export function prefetchDecorateAssets(): () => void {
  if (typeof window === 'undefined') return () => {};

  const urls: string[] = [
    ...FRAME_BG_IMAGES,
    ...STICKER_LIB.map((s) => s.image),
  ];

  let cancelled = false;
  let idleId: number | null = null;
  const inFlight: HTMLImageElement[] = [];

  let cursor = 0;
  const BATCH_SIZE = 5;

  const tick = () => {
    if (cancelled) return;
    if (cursor >= urls.length) return;
    const batch = urls.slice(cursor, cursor + BATCH_SIZE);
    cursor += BATCH_SIZE;

    for (const url of batch) {
      const img = new Image();
      // 이미지 로드/실패시 자체 정리 — onload/onerror가 inflight에서 빼지 않아도 GC됨
      img.decoding = 'async';
      // crossOrigin: 동일 origin이라 불필요하지만 안전상 anonymous로
      img.src = url;
      inFlight.push(img);
    }

    // 다음 배치는 다시 idle 시간에
    idleId = ric(tick, { timeout: 2000 });
  };

  // 진입 직후 바로 한 배치, 나머지는 idle 누적
  idleId = ric(tick, { timeout: 2000 });

  return () => {
    cancelled = true;
    if (idleId != null) cic(idleId);
    // 진행 중인 이미지 fetch 중단 — src 비우면 브라우저가 abort
    for (const img of inFlight) {
      img.src = '';
    }
  };
}
