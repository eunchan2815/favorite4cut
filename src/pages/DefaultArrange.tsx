import { useEffect, useRef, useState } from 'react';
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

  // 시트가 닫혀 있을 때 페이지 어디서든 위로 스크롤/드래그 → 시트 자동 오픈
  useEffect(() => {
    if (sheetState !== 'closed') return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < -10) setSheetState('half');
    };
    let ts: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      ts = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (ts == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - ts;
      if (dy < -30) {
        setSheetState('half');
        ts = null;
      } else if (Math.abs(dy) > 60) {
        ts = null;
      }
    };
    const onTouchEnd = () => {
      ts = null;
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [sheetState]);
  // 슬롯-first UX: 사용자가 직접 선택한 슬롯 → 사진 클릭 시 그 슬롯에 즉시 들어감
  const [focusedSlotIdx, setFocusedSlotIdx] = useState<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartState = useRef<SheetState | null>(null);

  const firstEmpty = project.slots.findIndex((s) => !s.photo);
  const filledCount = project.slots.filter((s) => s.photo).length;
  const allFilled = filledCount >= frame.count;

  // 실제로 사진이 들어갈 타겟 슬롯 — 사용자가 직접 고른 게 우선, 아니면 첫 빈 슬롯
  const targetSlotIdx =
    focusedSlotIdx != null && focusedSlotIdx >= 0 ? focusedSlotIdx : firstEmpty;

  // 어느 capture 인덱스가 어느 슬롯에 들어갔는지 (중복 URL 무관, idx 기준)
  const usedCaptureIndices = new Set<number>(
    project.slots
      .map((s) => s.captureIdx)
      .filter((v): v is number => typeof v === 'number')
  );

  // 사진 클릭 = focused 슬롯(또는 첫 빈)에 즉시 배치 + 시트 닫기
  const handleCaptureClick = (idx: number) => {
    if (idx < 0 || idx >= project.captures.length) return;
    if (usedCaptureIndices.has(idx)) return;
    if (targetSlotIdx < 0) return;
    const url = project.captures[idx];
    if (!url) return;
    setSlotPhoto(targetSlotIdx, url, idx);
    // 다음 빈 슬롯으로 자동 focus 이동 (있으면)
    const nextEmpty = project.slots.findIndex(
      (s, i) => !s.photo && i !== targetSlotIdx
    );
    setFocusedSlotIdx(nextEmpty >= 0 ? nextEmpty : null);
    // 사진 선택 후엔 시트 닫아서 결과 보이게
    setSheetState('closed');
  };

  const handleCaptureButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const idxStr = e.currentTarget.dataset.idx;
    if (idxStr == null) return;
    const idx = Number(idxStr);
    if (Number.isNaN(idx)) return;
    handleCaptureClick(idx);
  };

  // 슬롯 클릭:
  //  - 빈 슬롯 → focus + 시트 열어서 사진 고르게
  //  - 차있는 슬롯 → 비우기 + 그 슬롯 focus (다시 채우거나 그대로 두거나)
  const handleSlotClick = (slotIndex: number) => {
    const slot = project.slots[slotIndex];
    if (slot?.photo) {
      setSlotPhoto(slotIndex, null);
      setFocusedSlotIdx(slotIndex);
    } else {
      setFocusedSlotIdx(slotIndex);
      setSheetState('half');
    }
  };

  const handleResetSlots = () => {
    project.slots.forEach((s) => {
      if (s.photo) setSlotPhoto(s.index, null);
    });
    setFocusedSlotIdx(null);
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
    touchStartState.current = sheetState;
  };

  const onContentTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current == null) return;
    if (e.currentTarget.scrollTop !== 0) return;
    const dy = (e.touches[0]?.clientY ?? 0) - touchStartY.current;
    // 한 swipe = 한 단계만 이동 (touchStart 시점의 상태 기준)
    const start = touchStartState.current;
    if (start == null) return;
    if (dy > 30) {
      if (start === 'expanded') setSheetState('half');
      else if (start === 'half') setSheetState('closed');
    } else if (dy < -30 && start === 'half') {
      setSheetState('expanded');
    }
  };

  const onContentTouchEnd = () => {
    touchStartY.current = null;
    touchStartState.current = null;
  };

  const renderPoolBody = () => (
    <>
      <div className={styles.poolHeader}>
        <div className={styles.poolHeaderLeft}>
          <span className={styles.poolTitle}>
            찍은 사진 {project.captures.length}장
          </span>
          <span className={styles.poolHint}>
            {targetSlotIdx >= 0
              ? `${targetSlotIdx + 1}번 슬롯에 들어갈 사진을 클릭하세요`
              : '슬롯이 모두 채워졌어요'}
          </span>
        </div>
        {renderResetBtn()}
      </div>
      <div className={styles.captureGrid}>
        {project.captures.map((src, i) => {
          const used = usedCaptureIndices.has(i);
          // captures 자체에 favorite이 합성되어 있으므로 별도 overlay 없음
          return (
            <button
              key={`${i}-${src.slice(-12)}`}
              type="button"
              data-idx={i}
              className={`${styles.captureItem} ${used ? styles.used : ''}`}
              onClick={handleCaptureButtonClick}
              disabled={used || targetSlotIdx < 0}
              aria-label={used ? '이미 사용 중' : `사진 ${i + 1}을 ${targetSlotIdx + 1}번 슬롯에 넣기`}
            >
              <span className={styles.captureNumBadge}>{i + 1}</span>
              <img src={src} alt={`captured ${i + 1}`} />
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
              captures={project.captures}
              caption={project.caption}
              boxWidth={previewBox.w}
              boxHeight={previewBox.h}
              focusedSlot={targetSlotIdx >= 0 ? targetSlotIdx : null}
              onSlotClick={handleSlotClick}
            />
            <div className={styles.focusHint}>
              {allFilled ? (
                <>모두 채웠어요. 오른쪽 아래 <strong>다음</strong>을 클릭해주세요.</>
              ) : targetSlotIdx >= 0 ? (
                <>지금 채울 칸 → <strong>{targetSlotIdx + 1}번 슬롯</strong></>
              ) : (
                <>슬롯을 클릭해 채울 칸을 고르세요</>
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

      {/* Mobile floating hint — 사진 선택 후 슬롯 누르라고 안내 (시트 위쪽에 떠있음) */}
      {targetSlotIdx >= 0 && sheetState === 'closed' && !allFilled && (
        <div
          className={styles.mobileSelectionHint}
          onClick={() => setSheetState('half')}
        >
          <span className={styles.mobileSelectionHintNum}>
            {targetSlotIdx + 1}
          </span>
          <span>이 슬롯에 넣을 사진 고르기</span>
        </div>
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
          style={
            sheetState === 'closed'
              ? { overflow: 'hidden', touchAction: 'none', pointerEvents: 'none' }
              : undefined
          }
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
