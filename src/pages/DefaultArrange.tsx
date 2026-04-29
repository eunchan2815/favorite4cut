import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import FramePreview from '../components/FramePreview';
import { usePreviewBox } from '../hooks/usePreviewBox';
import { useProject } from '../store/ProjectContext';
import styles from './DefaultArrange.module.css';

export default function DefaultArrange() {
  const { project, frame, setSlotPhoto } = useProject();
  const navigate = useNavigate();
  const previewBox = usePreviewBox();

  type SheetState = 'closed' | 'half' | 'expanded';
  const [sheetState, setSheetState] = useState<SheetState>('closed');
  const dragStartY = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const focusedSlot = project.slots.findIndex((s) => !s.photo);
  const filledCount = project.slots.filter((s) => s.photo).length;
  const allFilled = filledCount >= frame.count;

  const usedUrls = new Set(
    project.slots.map((s) => s.photo).filter((p): p is string => Boolean(p))
  );

  const handleCaptureClick = (i: number) => {
    if (focusedSlot < 0) return;
    const url = project.captures[i];
    if (!url) return;
    if (usedUrls.has(url)) return;
    setSlotPhoto(focusedSlot, url);
  };

  const handleSlotClick = (slotIndex: number) => {
    const slot = project.slots[slotIndex];
    if (slot.photo) {
      setSlotPhoto(slotIndex, null);
    }
  };

  const handleResetSlots = () => {
    project.slots.forEach((s) => {
      if (s.photo) setSlotPhoto(s.index, null);
    });
  };

  // Sheet drag handlers
  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    dragStartY.current = e.clientY;
  };

  const onHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null) return;
    const dy = e.clientY - dragStartY.current;
    dragStartY.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (dy < -20) {
      // 위로 드래그: closed → half → expanded
      setSheetState((s) => (s === 'closed' ? 'half' : 'expanded'));
    } else if (dy > 20) {
      // 아래로 드래그: expanded → half → closed
      setSheetState((s) => (s === 'expanded' ? 'half' : 'closed'));
    }
  };

  const onContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop > 30 && sheetState === 'half') {
      setSheetState('expanded');
    }
  };

  const onContentWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && e.deltaY < -20 && sheetState === 'expanded') {
      setSheetState('half');
    }
  };

  const onContentTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onContentTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current == null) return;
    if (e.currentTarget.scrollTop !== 0) return;
    const dy = (e.touches[0]?.clientY ?? 0) - touchStartY.current;
    if (dy > 30 && sheetState === 'expanded') {
      setSheetState('half');
    } else if (dy < -30 && sheetState === 'half') {
      setSheetState('expanded');
    }
  };

  const onContentTouchEnd = () => {
    touchStartY.current = null;
  };

  const renderPoolBody = () => (
    <>
      <div className={styles.poolHeader}>
        <div className={styles.poolHeaderLeft}>
          <span className={styles.poolTitle}>
            찍은 사진 {project.captures.length}장
          </span>
          <span className={styles.poolHint}>탭하면 현재 슬롯에 들어가요</span>
        </div>
        {renderResetBtn()}
      </div>
      <div className={styles.captureGrid}>
        {project.captures.map((src, i) => {
          const used = usedUrls.has(src);
          // favorite 모드: 이 capture는 (i % 4)번 슬롯에서 찍힘 → 해당 슬롯의 최애 오버레이 표시
          const slotForCapture = i % project.slots.length;
          const fav =
            project.mode === 'favorite'
              ? project.slots[slotForCapture]?.favorite
              : undefined;
          return (
            <button
              key={i}
              type="button"
              className={`${styles.captureItem} ${used ? styles.used : ''}`}
              onClick={() => handleCaptureClick(i)}
              disabled={allFilled || used}
              aria-label={used ? '이미 사용 중' : `사진 ${i + 1} 선택`}
            >
              <img src={src} alt={`captured ${i + 1}`} />
              {fav && (
                <img
                  src={fav.src}
                  alt=""
                  className={styles.captureFavoriteOverlay}
                  style={{
                    opacity: fav.opacity,
                    transform: `translate(-50%, -50%) translate(${(fav.x - 0.5) * 100}%, ${(fav.y - 0.5) * 100}%) scale(${fav.scale}) rotate(${fav.rotation}deg)`,
                  }}
                  draggable={false}
                />
              )}
              {used && <span className={styles.usedBadge}>사용중</span>}
            </button>
          );
        })}
      </div>
    </>
  );

  const renderTopNext = () => (
    <button
      type="button"
      className={styles.nextBtn}
      disabled={!allFilled}
      onClick={() => navigate('/default/decorate')}
    >
      다음 →
    </button>
  );

  const renderResetBtn = () => (
    <button
      type="button"
      className={styles.resetBtn}
      onClick={handleResetSlots}
      disabled={filledCount === 0}
    >
      모두 비우기
    </button>
  );

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <BackButton to="/default/capture" />
          <span className={styles.title}>사진 선택</span>
          <div className={styles.topRightGroup}>
            <span className={styles.topCounter}>
              <strong>{filledCount}</strong> / {frame.count}
            </span>
            {renderTopNext()}
          </div>
        </div>

        <div className={styles.split}>
          <div className={styles.frameCard}>
            <div className={styles.frameTitle}>{frame.label}</div>
            <FramePreview
              frame={frame}
              slots={project.slots}
              caption={project.caption}
              boxWidth={previewBox.w}
              boxHeight={previewBox.h}
              focusedSlot={focusedSlot >= 0 ? focusedSlot : null}
              onSlotClick={handleSlotClick}
            />
            <div className={styles.focusHint}>
              {allFilled ? (
                <>모두 채웠어요. 오른쪽 아래 <strong>다음</strong>을 눌러주세요.</>
              ) : (
                <>
                  지금 채울 칸 → <strong>{focusedSlot + 1}번</strong> 슬롯
                </>
              )}
            </div>
          </div>

          {/* Desktop pool — hidden on mobile via CSS */}
          <div className={styles.poolCard}>{renderPoolBody()}</div>
        </div>
      </div>

      {/* Mobile sheet backdrop — 빈 영역 클릭하면 닫힘 */}
      {sheetState !== 'closed' && (
        <div
          className={styles.sheetBackdrop}
          onClick={() => setSheetState('closed')}
        />
      )}

      {/* Mobile sheet — hidden on desktop via CSS */}
      <div
        className={`${styles.mobileSheet} ${sheetState === 'half' ? styles.mobileSheetHalf : ''} ${sheetState === 'expanded' ? styles.mobileSheetExpanded : ''}`}
        onClick={() => {
          if (sheetState === 'closed') setSheetState('half');
        }}
      >
        <div
          className={styles.sheetHandleArea}
          onPointerDown={onHandlePointerDown}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          aria-label="시트 확장/축소"
          role="button"
        >
          <div className={styles.sheetHandle} />
        </div>
        <div
          className={styles.sheetContent}
          onScroll={onContentScroll}
          onWheel={onContentWheel}
          onTouchStart={onContentTouchStart}
          onTouchMove={onContentTouchMove}
          onTouchEnd={onContentTouchEnd}
        >
          {renderPoolBody()}
        </div>
      </div>
    </div>
  );
}
