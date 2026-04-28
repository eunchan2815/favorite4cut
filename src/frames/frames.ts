import type { FrameDef, FrameLayoutId } from '../types';

export const FRAMES: FrameDef[] = [
  // 2컷
  { id: '2-vertical',   label: '2컷 · 세로', count: 2, rows: 2, cols: 1, aspect: 0.55, captionPosition: 'bottom' },
  { id: '2-horizontal', label: '2컷 · 가로', count: 2, rows: 1, cols: 2, aspect: 1.85, captionPosition: 'right' },

  // 3컷
  { id: '3-vertical',   label: '3컷 · 세로', count: 3, rows: 3, cols: 1, aspect: 0.45, captionPosition: 'bottom' },
  { id: '3-horizontal', label: '3컷 · 가로', count: 3, rows: 1, cols: 3, aspect: 2.4,  captionPosition: 'right' },

  // 4컷
  { id: '4-vertical',   label: '4컷 · 세로 (인생네컷)', count: 4, rows: 4, cols: 1, aspect: 0.36, captionPosition: 'bottom' },
  { id: '4-horizontal', label: '4컷 · 가로',          count: 4, rows: 1, cols: 4, aspect: 2.9,  captionPosition: 'right' },
  { id: '4-square',     label: '4컷 · 2×2',           count: 4, rows: 2, cols: 2, aspect: 0.95, captionPosition: 'bottom' },

  // 6컷
  { id: '6-vertical',   label: '6컷 · 세로 (2×3)', count: 6, rows: 3, cols: 2, aspect: 0.78, captionPosition: 'bottom' },
  { id: '6-horizontal', label: '6컷 · 가로 (3×2)', count: 6, rows: 2, cols: 3, aspect: 1.55, captionPosition: 'bottom' },
];

export function getFrame(id: FrameLayoutId): FrameDef {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0];
}

export const DEFAULT_LAYOUT: FrameLayoutId = '4-vertical';
export const DEFAULT_FRAME_BG = '#ffffff';

export function todayCaption(): string {
  return '최애네컷';
}
