import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { useProject } from '../store/ProjectContext';
import type { FavoriteOverlay } from '../types';
import styles from './FavoriteArrange.module.css';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v: number) => clamp(v, 0, 1);

const SCALE_MIN = 0.3;
const SCALE_MAX = 3.5;

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

type DragState =
  | { kind: 'move'; slotIndex: number; pointerId: number; offsetX: number; offsetY: number }
  | {
      kind: 'resize';
      slotIndex: number;
      pointerId: number;
      cx: number;
      cy: number;
      d0: number;
      initialScale: number;
    }
  | {
      kind: 'rotate';
      slotIndex: number;
      pointerId: number;
      cx: number;
      cy: number;
      angle0: number;
      initialRotation: number;
    };

export default function FavoriteArrange() {
  const { project, setSlotFavorite } = useProject();
  const navigate = useNavigate();

  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const update = (slotIndex: number, patch: Partial<FavoriteOverlay>) => {
    const current = project.slots[slotIndex]?.favorite;
    if (!current) return;
    setSlotFavorite(slotIndex, { ...current, ...patch });
  };

  const startMove = (slotIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    const fav = project.slots[slotIndex]?.favorite;
    if (!fav) return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedSlot(slotIndex);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const rect = slotRefs.current[slotIndex]?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    dragRef.current = {
      kind: 'move',
      slotIndex,
      pointerId: e.pointerId,
      offsetX: fav.x - px,
      offsetY: fav.y - py,
    };
  };

  const moveBody = (slotIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== 'move' || d.slotIndex !== slotIndex) return;
    const rect = slotRefs.current[slotIndex]?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    update(slotIndex, {
      x: clamp01(px + d.offsetX),
      y: clamp01(py + d.offsetY),
    });
  };

  const startResize = (slotIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    const fav = project.slots[slotIndex]?.favorite;
    if (!fav) return;
    e.stopPropagation();
    e.preventDefault();
    if (!slotRefs.current[slotIndex]) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const rect = slotRefs.current[slotIndex]!.getBoundingClientRect();
    const cx = rect.left + fav.x * rect.width;
    const cy = rect.top + fav.y * rect.height;
    const d0 = Math.hypot(e.clientX - cx, e.clientY - cy);
    dragRef.current = {
      kind: 'resize',
      slotIndex,
      pointerId: e.pointerId,
      cx,
      cy,
      d0: d0 || 1,
      initialScale: fav.scale,
    };
  };

  const moveResize = (slotIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== 'resize' || d.slotIndex !== slotIndex) return;
    const newD = Math.hypot(e.clientX - d.cx, e.clientY - d.cy);
    const next = clamp(d.initialScale * (newD / d.d0), SCALE_MIN, SCALE_MAX);
    update(slotIndex, { scale: next });
  };

  const startRotate = (slotIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    const fav = project.slots[slotIndex]?.favorite;
    if (!fav) return;
    e.stopPropagation();
    e.preventDefault();
    if (!slotRefs.current[slotIndex]) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    const rect = slotRefs.current[slotIndex]!.getBoundingClientRect();
    const cx = rect.left + fav.x * rect.width;
    const cy = rect.top + fav.y * rect.height;
    const angle0 = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    dragRef.current = {
      kind: 'rotate',
      slotIndex,
      pointerId: e.pointerId,
      cx,
      cy,
      angle0,
      initialRotation: fav.rotation,
    };
  };

  const moveRotate = (slotIndex: number, e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.kind !== 'rotate' || d.slotIndex !== slotIndex) return;
    const angle = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI;
    update(slotIndex, { rotation: d.initialRotation + (angle - d.angle0) });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = null;
  };

  const handleRemove = (slotIndex: number) => {
    setSlotFavorite(slotIndex, null);
    setSelectedSlot(null);
  };

  const handleCardPointerDown = () => {
    setSelectedSlot(null);
  };

  const handleNext = () => {
    navigate('/default/capture');
  };

  type AlignPreset = 'center' | 'left' | 'right' | 'zigzag';
  const applyAlign = (preset: AlignPreset) => {
    project.slots.forEach((slot, i) => {
      if (!slot.favorite) return;
      let x = 0.5;
      if (preset === 'left') x = 0.3;
      else if (preset === 'right') x = 0.7;
      else if (preset === 'zigzag') x = i % 2 === 0 ? 0.3 : 0.7;
      setSlotFavorite(i, { ...slot.favorite, x, y: 0.5, rotation: 0 });
    });
    setSelectedSlot(null);
  };

  type SizePreset = 'small' | 'medium' | 'large' | 'fill';
  const applySize = (preset: SizePreset) => {
    let scale = 0.7;
    if (preset === 'small') scale = 0.5;
    else if (preset === 'medium') scale = 0.7;
    else if (preset === 'large') scale = 0.9;
    else if (preset === 'fill') scale = 1;
    project.slots.forEach((slot, i) => {
      if (!slot.favorite) return;
      setSlotFavorite(i, { ...slot.favorite, scale });
    });
    setSelectedSlot(null);
  };

  const hasAnyFavorite = project.slots.some((s) => s.favorite);

  const eq = (a: number, b: number) => Math.abs(a - b) < 0.01;

  const detectActiveAlign = (): AlignPreset | null => {
    const favs = project.slots
      .map((s, i) => ({ fav: s.favorite, i }))
      .filter((s): s is { fav: FavoriteOverlay; i: number } => Boolean(s.fav));
    if (favs.length === 0) return null;
    if (favs.every(({ fav }) => eq(fav.x, 0.5))) return 'center';
    if (favs.every(({ fav }) => eq(fav.x, 0.3))) return 'left';
    if (favs.every(({ fav }) => eq(fav.x, 0.7))) return 'right';
    if (favs.every(({ fav, i }) => eq(fav.x, i % 2 === 0 ? 0.3 : 0.7)))
      return 'zigzag';
    return null;
  };

  const detectActiveSize = (): SizePreset | null => {
    const favs = project.slots
      .map((s) => s.favorite)
      .filter((f): f is FavoriteOverlay => Boolean(f));
    if (favs.length === 0) return null;
    const first = favs[0].scale;
    if (!favs.every((f) => eq(f.scale, first))) return null;
    if (eq(first, 0.5)) return 'small';
    if (eq(first, 0.7)) return 'medium';
    if (eq(first, 0.9)) return 'large';
    if (eq(first, 1)) return 'fill';
    return null;
  };

  const activeAlign = detectActiveAlign();
  const activeSize = detectActiveSize();
  const alignBtnClass = (p: AlignPreset) =>
    `${styles.presetBtn} ${activeAlign === p ? styles.presetBtnActive : ''}`;
  const sizeBtnClass = (p: SizePreset) =>
    `${styles.presetBtn} ${activeSize === p ? styles.presetBtnActive : ''}`;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <BackButton to="/favorite" />
          <span className={styles.title}>최애 사진 배치</span>
          <button type="button" className={styles.nextBtn} onClick={handleNext}>
            다음 →
          </button>
        </div>

        <p className={styles.hint}>
          사진을 탭하면 핸들이 나와요 · 드래그 이동 · 모서리 크기 · 위 회전 · ✕ 삭제
        </p>

        <div className={styles.presetGroup}>
          <div className={styles.presetRow}>
            <span className={styles.presetLabel}>자동 정렬</span>
            <div className={styles.presetButtons}>
              <button
                type="button"
                className={alignBtnClass('center')}
                onClick={() => applyAlign('center')}
                disabled={!hasAnyFavorite}
              >
                가운데
              </button>
              <button
                type="button"
                className={alignBtnClass('left')}
                onClick={() => applyAlign('left')}
                disabled={!hasAnyFavorite}
              >
                왼쪽
              </button>
              <button
                type="button"
                className={alignBtnClass('right')}
                onClick={() => applyAlign('right')}
                disabled={!hasAnyFavorite}
              >
                오른쪽
              </button>
              <button
                type="button"
                className={alignBtnClass('zigzag')}
                onClick={() => applyAlign('zigzag')}
                disabled={!hasAnyFavorite}
              >
                지그재그
              </button>
            </div>
          </div>
          <div className={styles.presetRow}>
            <span className={styles.presetLabel}>이미지 크기</span>
            <div className={styles.presetButtons}>
              <button
                type="button"
                className={sizeBtnClass('small')}
                onClick={() => applySize('small')}
                disabled={!hasAnyFavorite}
              >
                작게
              </button>
              <button
                type="button"
                className={sizeBtnClass('medium')}
                onClick={() => applySize('medium')}
                disabled={!hasAnyFavorite}
              >
                보통
              </button>
              <button
                type="button"
                className={sizeBtnClass('large')}
                onClick={() => applySize('large')}
                disabled={!hasAnyFavorite}
              >
                크게
              </button>
              <button
                type="button"
                className={sizeBtnClass('fill')}
                onClick={() => applySize('fill')}
                disabled={!hasAnyFavorite}
              >
                꽉채움
              </button>
            </div>
          </div>
        </div>

        <div className={styles.frameCard} onPointerDown={handleCardPointerDown}>
          {project.slots.map((slot, i) => {
            const fav = slot.favorite;
            const isSelected = selectedSlot === i;
            return (
              <div
                key={slot.index}
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                className={styles.slot}
              >
                <span className={styles.slotIndex}>{i + 1}</span>
                {fav ? (
                  <>
                    {/* 이미지 + 셀렉션을 한 wrapper에 두고 scale/rotate를 wrapper에 적용 → 핸들이 이미지 가장자리와 정확히 매치 */}
                    <div
                      className={styles.favoriteHit}
                      style={{
                        left: `${fav.x * 100}%`,
                        top: `${fav.y * 100}%`,
                        width: '100%',
                        height: '100%',
                        transform: `translate(-50%, -50%) scale(${fav.scale}) rotate(${fav.rotation}deg)`,
                        opacity: fav.opacity,
                      }}
                      onPointerDown={(e) => startMove(i, e)}
                      onPointerMove={(e) => moveBody(i, e)}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                    >
                      <img
                        src={fav.src}
                        alt=""
                        className={styles.favorite}
                        draggable={false}
                      />
                      {isSelected && (
                        <>
                          <div className={styles.selectionBorder} />
                          {HANDLES.map((h) => (
                            <div
                              key={h.id}
                              className={styles.handle}
                              style={{
                                left: `${h.x * 100}%`,
                                top: `${h.y * 100}%`,
                                cursor: h.cursor,
                              }}
                              onPointerDown={(e) => startResize(i, e)}
                              onPointerMove={(e) => moveResize(i, e)}
                              onPointerUp={endDrag}
                              onPointerCancel={endDrag}
                            />
                          ))}
                          <div className={styles.rotateLine} />
                          <div
                            className={styles.rotateHandle}
                            onPointerDown={(e) => startRotate(i, e)}
                            onPointerMove={(e) => moveRotate(i, e)}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
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
                              handleRemove(i);
                            }}
                            aria-label="삭제"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <span className={styles.slotEmpty}>(비움)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
