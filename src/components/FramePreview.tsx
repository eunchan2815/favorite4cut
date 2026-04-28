import { useEffect, useRef, useState } from 'react';
import { todayDate } from '../frames/frames';
import type {
  FrameDef,
  PhotoFilter,
  PlacedSticker,
  Slot,
} from '../types';
import { getSticker } from '../utils/stickers';
import styles from './FramePreview.module.css';

interface Props {
  frame: FrameDef;
  slots: Slot[];
  caption: string;
  width?: number;
  height?: number;
  boxWidth?: number;
  boxHeight?: number;
  compact?: boolean;
  bg?: string;
  bgImage?: string | null;
  filter?: PhotoFilter;
  stickers?: PlacedSticker[];
  focusedSlot?: number | null;
  onSlotClick?: (index: number) => void;
  onStickerMove?: (id: string, x: number, y: number) => void;
  onStickerScale?: (id: string, scale: number) => void;
  onStickerRotate?: (id: string, rotation: number) => void;
  onStickerRemove?: (id: string) => void;
  /** When this id changes to a non-null value, that sticker becomes selected. */
  autoSelectStickerId?: string | null;
}

const FILTER_CSS: Record<PhotoFilter, string> = {
  none: 'none',
  bw: 'grayscale(1) contrast(1.05)',
  sepia: 'sepia(0.6) saturate(1.1)',
  vivid: 'saturate(1.45) contrast(1.05)',
  warm: 'sepia(0.25) saturate(1.2) brightness(1.04)',
  cool: 'hue-rotate(-12deg) saturate(1.1) brightness(1.04)',
};

const HANDLES: Array<{ id: string; x: number; y: number; cursor: string }> = [
  { id: 'tl', x: 0, y: 0, cursor: 'nwse-resize' },
  { id: 'tc', x: 0.5, y: 0, cursor: 'ns-resize' },
  { id: 'tr', x: 1, y: 0, cursor: 'nesw-resize' },
  { id: 'rc', x: 1, y: 0.5, cursor: 'ew-resize' },
  { id: 'br', x: 1, y: 1, cursor: 'nwse-resize' },
  { id: 'bc', x: 0.5, y: 1, cursor: 'ns-resize' },
  { id: 'bl', x: 0, y: 1, cursor: 'nesw-resize' },
  { id: 'lc', x: 0, y: 0.5, cursor: 'ew-resize' },
];

const STICKER_BASE_FRACTION = 0.2;
const SCALE_MIN = 0.4;
const SCALE_MAX = 3.5;

function computeSize(
  frame: FrameDef,
  width: number | undefined,
  height: number | undefined,
  boxWidth: number | undefined,
  boxHeight: number | undefined
): { w: number; h: number } {
  if (boxWidth != null && boxHeight != null) {
    const widthByH = boxHeight * frame.aspect;
    if (widthByH <= boxWidth) return { w: widthByH, h: boxHeight };
    return { w: boxWidth, h: boxWidth / frame.aspect };
  }
  if (width != null) return { w: width, h: width / frame.aspect };
  if (height != null) return { w: height * frame.aspect, h: height };
  return { w: 200, h: 200 / frame.aspect };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

type DragState =
  | { kind: 'move'; id: string; pointerId: number }
  | {
      kind: 'resize';
      id: string;
      pointerId: number;
      cx: number;
      cy: number;
      d0: number;
      initialScale: number;
    }
  | {
      kind: 'rotate';
      id: string;
      pointerId: number;
      cx: number;
      cy: number;
      angle0: number;
      initialRotation: number;
    };

export default function FramePreview({
  frame,
  slots,
  width,
  height,
  boxWidth,
  boxHeight,
  compact = false,
  bg,
  bgImage,
  filter = 'none',
  stickers,
  focusedSlot,
  onSlotClick,
  onStickerMove,
  onStickerScale,
  onStickerRotate,
  onStickerRemove,
  autoSelectStickerId,
}: Props) {
  const { w, h } = computeSize(frame, width, height, boxWidth, boxHeight);
  const captionAtRight = frame.captionPosition === 'right';
  const interactive = Boolean(onSlotClick);

  const cardCls = `${styles.card} ${compact ? styles.cardCompact : ''}`;
  const gridCls = `${styles.grid} ${compact ? styles.gridCompact : ''}`;
  const slotClsBase = `${styles.slot} ${compact ? styles.slotCompact : ''}`;

  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);

  // 외부에서 새 스티커 추가 후 자동 선택 트리거
  useEffect(() => {
    if (autoSelectStickerId) {
      setSelectedSticker(autoSelectStickerId);
    }
  }, [autoSelectStickerId]);

  // 모든 프레임에 빈티지 톤으로 오늘 날짜만 표시
  const displayCaption = todayDate();

  const captionEl = (
    <div
      className={`${styles.captionBottom} ${captionAtRight ? styles.captionBottomRight : ''} ${compact ? styles.captionBottomCompact : ''}`}
    >
      {compact ? null : <span className={styles.captionInner}>{displayCaption}</span>}
    </div>
  );

  const handleCardPointerDown = () => {
    setSelectedSticker(null);
  };

  const stickerBasePx = w * STICKER_BASE_FRACTION;

  // Sticker body — pointerdown selects + starts move
  const startMove = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setSelectedSticker(id);
    dragRef.current = { kind: 'move', id, pointerId: e.pointerId };
  };

  const moveBody = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== 'move' || d.id !== id) return;
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = clamp01((e.clientX - rect.left) / rect.width);
    const y = clamp01((e.clientY - rect.top) / rect.height);
    onStickerMove?.(id, x, y);
  };

  const endBody = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = null;
  };

  // Handle — pointerdown starts uniform-scale drag from center
  const startResize = (
    sticker: PlacedSticker,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!cardRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + sticker.x * rect.width;
    const cy = rect.top + sticker.y * rect.height;
    const d0 = Math.hypot(e.clientX - cx, e.clientY - cy);
    dragRef.current = {
      kind: 'resize',
      id: sticker.id,
      pointerId: e.pointerId,
      cx,
      cy,
      d0: d0 || 1,
      initialScale: sticker.scale,
    };
  };

  const moveResize = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== 'resize' || d.id !== id) return;
    const newD = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
    const newScale = clamp(d.initialScale * (newD / d.d0), SCALE_MIN, SCALE_MAX);
    onStickerScale?.(id, newScale);
  };

  // Rotation handle — drag around center
  const startRotate = (
    sticker: PlacedSticker,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!cardRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + sticker.x * rect.width;
    const cy = rect.top + sticker.y * rect.height;
    const angle0 = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    dragRef.current = {
      kind: 'rotate',
      id: sticker.id,
      pointerId: e.pointerId,
      cx,
      cy,
      angle0,
      initialRotation: sticker.rotation,
    };
  };

  const moveRotate = (id: string, e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== 'rotate' || d.id !== id) return;
    const angle = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
    const delta = angle - d.angle0;
    onStickerRotate?.(id, d.initialRotation + delta);
  };

  const handleDeleteSticker = (id: string) => {
    setSelectedSticker(null);
    onStickerRemove?.(id);
  };

  const cardStyle: React.CSSProperties = {
    width: `${Math.round(w)}px`,
    height: `${Math.round(h)}px`,
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr auto',
    backgroundColor: bg ?? undefined,
    position: 'relative',
  };
  if (bgImage) {
    cardStyle.backgroundImage = `url("${bgImage}")`;
    cardStyle.backgroundRepeat = 'no-repeat';
    cardStyle.backgroundSize = 'cover';
    cardStyle.backgroundPosition = 'center';
  }

  return (
    <div
      ref={cardRef}
      className={cardCls}
      style={cardStyle}
      onPointerDown={handleCardPointerDown}
    >
      <div
        className={gridCls}
        style={{
          gridTemplateRows: `repeat(${frame.rows}, 1fr)`,
          gridTemplateColumns: `repeat(${frame.cols}, 1fr)`,
        }}
      >
        {slots.map((slot) => {
          const isFocused =
            focusedSlot != null && focusedSlot === slot.index && !slot.photo;
          const slotCls = `${slotClsBase} ${isFocused ? styles.slotFocused : ''}`;
          const photoStyle =
            filter !== 'none' ? { filter: FILTER_CSS[filter] } : undefined;
          const content = slot.photo ? (
            <img src={slot.photo} alt="" className={styles.photo} style={photoStyle} />
          ) : compact ? null : (
            <span className={styles.placeholderNum}>{slot.index + 1}</span>
          );
          return interactive ? (
            <button
              key={slot.index}
              type="button"
              className={slotCls}
              onClick={() => onSlotClick!(slot.index)}
              style={{ cursor: 'pointer' }}
            >
              {content}
            </button>
          ) : (
            <div key={slot.index} className={slotCls}>
              {content}
            </div>
          );
        })}
      </div>

      {captionEl}

      {stickers?.map((s) => {
        const isSelected = s.id === selectedSticker;
        const size = stickerBasePx * s.scale;
        const def = getSticker(s.stickerId);
        if (!def) return null;
        return (
          <div
            key={s.id}
            className={styles.stickerWrap}
            style={{
              left: `${s.x * 100}%`,
              top: `${s.y * 100}%`,
              width: `${size}px`,
              height: `${size}px`,
              transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
              zIndex: isSelected ? 3 : 2,
            }}
            onPointerDown={(e) => startMove(s.id, e)}
            onPointerMove={(e) => moveBody(s.id, e)}
            onPointerUp={endBody}
            onPointerCancel={endBody}
          >
            <img
              src={def.image}
              alt=""
              className={styles.stickerArt}
              draggable={false}
            />
            {isSelected && (
              <>
                <div className={styles.selectionBorder} />
                {HANDLES.map((h2) => (
                  <div
                    key={h2.id}
                    className={styles.handle}
                    style={{
                      left: `${h2.x * 100}%`,
                      top: `${h2.y * 100}%`,
                      cursor: h2.cursor,
                    }}
                    onPointerDown={(e) => startResize(s, e)}
                    onPointerMove={(e) => moveResize(s.id, e)}
                    onPointerUp={endBody}
                    onPointerCancel={endBody}
                  />
                ))}
                <div className={styles.rotateLine} />
                <div
                  className={styles.rotateHandle}
                  onPointerDown={(e) => startRotate(s, e)}
                  onPointerMove={(e) => moveRotate(s.id, e)}
                  onPointerUp={endBody}
                  onPointerCancel={endBody}
                  aria-label="스티커 회전"
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M13.5 8 a5.5 5.5 0 1 1 -1.6 -3.9" />
                    <path d="M14 2 v3 h-3" />
                  </svg>
                </div>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSticker(s.id);
                  }}
                  aria-label="스티커 삭제"
                >
                  ×
                </button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
