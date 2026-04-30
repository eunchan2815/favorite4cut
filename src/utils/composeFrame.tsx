import { toBlob } from 'html-to-image';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import FramePreview from '../components/FramePreview';
import { getPreviewBoxForViewport } from '../hooks/usePreviewBox';
import type { FrameDef, Project } from '../types';

export interface ComposeOptions {
  /** Output width in pixels. Height is derived from frame.aspect. */
  width?: number;
}

// Render the offscreen FramePreview at the same DOM size that the on-screen
// preview is currently using (responsive to viewport), then upscale via
// pixelRatio. This keeps padding/gap/font-size proportions visually identical
// between preview and PNG result regardless of viewport size.
function renderedWidth(frame: FrameDef, boxW: number, boxH: number): number {
  const widthByH = boxH * frame.aspect;
  return widthByH <= boxW ? widthByH : boxW;
}

export async function composeFrame(
  project: Project,
  frame: FrameDef,
  opts: ComposeOptions = {}
): Promise<Blob> {
  const isMobile =
    typeof window !== 'undefined' && window.innerWidth < 600;
  // 모바일은 default도 작게 — single-core CPU에서 큰 캔버스 + html-to-image 변환은 매우 느림
  const targetW = opts.width ?? (isMobile ? 720 : 1080);
  const { w: boxW, h: boxH } = getPreviewBoxForViewport();
  const previewW = renderedWidth(frame, boxW, boxH);
  // pixelRatio cap — 모바일은 2 이하로 강제. 모바일 viewport가 작아 비율이 5+로 치솟던 거 차단
  const rawRatio = targetW / previewW;
  const pixelRatio = Math.min(rawRatio, isMobile ? 2 : 3);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-100000px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.style.pointerEvents = 'none';
  container.style.contain = 'layout style';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    root.render(
      createElement(FramePreview, {
        frame,
        slots: project.slots,
        caption: project.caption,
        boxWidth: boxW,
        boxHeight: boxH,
        bg: project.frameBg,
        bgImage: project.frameBgImage,
        filter: project.filter,
        stickers: project.stickers,
      })
    );

    // Wait for React commit
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    // Wait for web fonts (Black Han Sans, etc.) to be ready before snapshot
    if (typeof document !== 'undefined' && (document as Document & { fonts?: FontFaceSet }).fonts) {
      try {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      } catch {
        // ignore
      }
    }

    // Wait for all <img> to load — decode wait는 모바일에서 메인 쓰레드 점유라 제거
    const imgs = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise<void>((res) => {
          img.addEventListener('load', () => res(), { once: true });
          img.addEventListener('error', () => res(), { once: true });
        });
      })
    );

    // Preload CSS background image
    if (project.frameBgImage) {
      await new Promise<void>((res) => {
        const pre = new Image();
        pre.onload = () => res();
        pre.onerror = () => res();
        pre.src = project.frameBgImage!;
      });
    }

    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    const node = container.firstElementChild as HTMLElement | null;
    if (!node) throw new Error('FramePreview did not render');

    const blob = await toBlob(node, {
      pixelRatio,
      cacheBust: false,
      // Embed @font-face rules so Black Han Sans etc. render in the snapshot
      skipFonts: false,
    });
    if (!blob) throw new Error('html-to-image returned null');
    return blob;
  } finally {
    setTimeout(() => {
      root.unmount();
      container.remove();
    }, 0);
  }
}
