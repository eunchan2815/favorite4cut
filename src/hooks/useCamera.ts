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

/**
 * video의 현재 프레임을 캡쳐해 dataURL(JPEG)로 반환.
 * mirrored=true면 좌우 반전해서 저장 (셀카 친숙).
 */
export function captureFrame(
  video: HTMLVideoElement,
  mirrored = true,
  quality = 0.92
): string {
  const canvas = document.createElement('canvas');
  const w = video.videoWidth;
  const h = video.videoHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  if (mirrored) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}
