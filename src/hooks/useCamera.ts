import { useEffect, useRef, useState } from 'react';

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  ready: boolean;
  error: string | null;
}

/**
 * getUserMedia로 후면 카메라 스트림을 받아 video 요소에 연결.
 * 언마운트 시 트랙을 멈춘다.
 */
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
          setReady(true);
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : '카메라를 사용할 수 없습니다.';
        setError(msg);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, []);

  return { videoRef, ready, error };
}

interface FavoriteOverlayInput {
  src: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  flipped?: boolean;
}

interface CaptureOptions {
  mirrored?: boolean;
  quality?: number;
  /** 슬롯 한 칸의 W/H 비율 — captures를 이 비율로 crop해서 슬롯과 1:1 매칭 */
  slotAspect?: number;
  /** 카메라 표시될 때 영상 위에 보이던 favorite overlay를 캔버스에도 함께 합성 */
  favorite?: FavoriteOverlayInput | null;
}

const loadedImageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = loadedImageCache.get(src);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      loadedImageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error('image load fail'));
    img.src = src;
  });
}

/**
 * video의 현재 프레임을 캡쳐해 dataURL(JPEG)로 반환.
 * favorite overlay를 함께 합성하면 captures 자체에 최애가 박혀서 나옴 → 추후 슬롯에서 추가 overlay 불필요.
 */
export async function captureFrame(
  video: HTMLVideoElement,
  options: boolean | CaptureOptions = true,
  qualityArg = 0.92
): Promise<string> {
  // 하위 호환: 두 번째 인자가 boolean이면 (mirrored)로 해석
  const opts: CaptureOptions =
    typeof options === 'boolean'
      ? { mirrored: options, quality: qualityArg }
      : options;
  const mirrored = opts.mirrored ?? true;
  const quality = opts.quality ?? 0.92;

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return '';

  // 슬롯 비율로 crop — slotAspect가 영상 비율보다 좁으면 좌우, 넓으면 상하 자름
  let cw = vw;
  let ch = vh;
  let cropX = 0;
  let cropY = 0;
  if (opts.slotAspect && opts.slotAspect > 0) {
    const videoAspect = vw / vh;
    if (opts.slotAspect > videoAspect) {
      // 슬롯이 더 가로 → 위/아래 자르기
      ch = Math.round(vw / opts.slotAspect);
      cropY = Math.floor((vh - ch) / 2);
    } else if (opts.slotAspect < videoAspect) {
      // 슬롯이 더 세로 → 좌/우 자르기
      cw = Math.round(vh * opts.slotAspect);
      cropX = Math.floor((vw - cw) / 2);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  if (mirrored) {
    ctx.translate(cw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, cropX, cropY, cw, ch, 0, 0, cw, ch);

  // 거울 좌표 해제 — 이후 그리기는 정상 좌표계
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // favorite overlay 합성 — 카메라에 보이던 그대로 캔버스에 박음
  if (opts.favorite && opts.favorite.src) {
    try {
      const img = await loadImage(opts.favorite.src);
      const f = opts.favorite;
      // 슬롯 박스 내에서 favorite의 컨테이너 크기 = 캔버스 크기
      const cx = cw * f.x;
      const cy = ch * f.y;
      // contain fit + scale: 박스 안에 fit되는 max 크기 × scale
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const boxAspect = cw / ch;
      let drawW: number;
      let drawH: number;
      if (imgAspect > boxAspect) {
        drawW = cw * f.scale;
        drawH = drawW / imgAspect;
      } else {
        drawH = ch * f.scale;
        drawW = drawH * imgAspect;
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((f.rotation * Math.PI) / 180);
      if (f.flipped) ctx.scale(-1, 1);
      ctx.globalAlpha = f.opacity;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } catch {
      // 이미지 로드 실패 시 overlay 생략
    }
  }

  // 같은 frame을 두 번 찍어도 dataURL이 강제 unique
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 1, 1);

  return canvas.toDataURL('image/jpeg', quality);
}
