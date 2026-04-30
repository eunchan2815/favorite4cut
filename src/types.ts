export type Mode = 'default' | 'favorite';

export type FrameLayoutId =
  | '2-vertical'
  | '2-horizontal'
  | '3-vertical'
  | '3-horizontal'
  | '4-vertical'
  | '4-horizontal'
  | '4-square'
  | '6-vertical'
  | '6-horizontal';

export type CaptionPosition = 'bottom' | 'right';

export type PhotoFilter = 'none' | 'bw' | 'sepia' | 'vivid' | 'warm' | 'cool';

export interface FrameDef {
  id: FrameLayoutId;
  label: string;
  count: number;
  rows: number;
  cols: number;
  /** width / height ratio of the whole card */
  aspect: number;
  captionPosition: CaptionPosition;
}

export interface FavoriteOverlay {
  src: string;        // dataURL
  x: number;          // 0~1 normalized within slot
  y: number;          // 0~1
  scale: number;      // 0.2~3
  rotation: number;   // degrees
  opacity: number;    // 0~1
  flipped: boolean;
  onTop: boolean;
}

export interface PlacedSticker {
  id: string;
  /** Reference into STICKER_LIB */
  stickerId: string;
  /** 0~1 within the frame card */
  x: number;
  y: number;
  /** size multiplier; 1 = base size */
  scale: number;
  /** rotation in degrees, clockwise */
  rotation: number;
}

export interface Slot {
  index: number;
  photo: string | null;     // dataURL
  captureIdx?: number | null; // 어느 capture에서 왔는지 (중복 URL일 때도 정확한 매칭)
  favorite?: FavoriteOverlay;
}

export interface Project {
  mode: Mode;
  layoutId: FrameLayoutId;
  caption: string;
  slots: Slot[];
  /** Raw photos captured by camera (regardless of frame). User picks N of these to fill slots later. */
  captures: string[];
  frameBg: string;
  /** Optional background image URL (overrides solid color visually). */
  frameBgImage: string | null;
  filter: PhotoFilter;
  stickers: PlacedSticker[];
}

export const CAPTURE_TARGET = 8;
