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

  // 진입 후 1초 뒤에 시트 자동 오픈 (사용자 시선 자연스럽게 유도)
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSheetState((s) => (s === 'closed' ? 'half' : s));
    }, 1000);
    return () => window.clearTimeout(id);
  }, []);
  // 인덱스로 추적 — 중복 URL이 있어도 정확히 매칭
  const [selectedCaptureIdx, setSelectedCaptureIdx] = useState<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const firstEmpty = project.slots.findIndex((s) => !s.photo);
  const filledCount = project.slots.filter((s) => s.photo).length;
  const allFilled = filledCount >= frame.count;

  // 어느 capture 인덱스가 어느 슬롯에 들어갔는지 (중복 URL 무관, idx 기준)
  const usedCaptureIndices = new Set<number>(
    project.slots
      .map((s) => s.captureIdx)
      .filter((v): v is number => typeof v === 'number')
  );

  const handleCaptureClick = (idx: number) => {
    if (idx < 0 || idx >= project.captures.length) return;
    if (usedCaptureIndices.has(idx)) return;
    setSelectedCaptureIdx((prev) => {
      if (prev === idx) return null; // 같은 사진 다시 누르면 해제 (시트 그대로)
      // 새 사진 선택 → 모바일이면 시트 닫고 슬롯 보이게
      setSheetState('closed');
      return idx;
    });
  };

  // 클로저 캡처 의심 완전 차단 — data-idx로 명시적 인덱스 전달
  const handleCaptureButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const idxStr = e.currentTarget.dataset.idx;
    if (idxStr == null) return;
    const idx = Number(idxStr);
    if (Number.isNaN(idx)) return;
    handleCaptureClick(idx);
  };

  const handleSlotClick = (slotIndex: number) => {
    if (selectedCaptureIdx != null) {
      const url = project.captures[selectedCaptureIdx];
      if (url) {
        setSlotPhoto(slotIndex, url, selectedCaptureIdx);
        setSelectedCaptureIdx(null);
        // 이번 배치로 채워질 개수 — 빈 슬롯 채우면 +1, 차있는 슬롯 덮어쓰면 그대로
        const wasEmpty = !project.slots[slotIndex]?.photo;
        const nextFilled = filledCount + (wasEmpty ? 1 : 0);
        if (nextFilled >= frame.count) {
          // 다 채웠으면 시트 닫기
          setSheetState('closed');
        } else {
          // 아직 남았으면 시트 다시 열어서 다음 사진 고르게
          setSheetState('half');
        }
      }
      return;
    }
    const slot = project.slots[slotIndex];
    if (slot.photo) {
      setSlotPhoto(slotIndex, null);
    }
  };

  const handleResetSlots = () => {
    project.slots.forEach((s) => {
      if (s.photo) setSlotPhoto(s.index, null);
    });
    setSelectedCaptureIdx(null);
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
          <span className={styles.poolHint}>
            {selectedCaptureIdx != null
              ? '슬롯을 눌러 이 사진을 넣으세요'
              : '사진을 누르고 → 슬롯을 누르면 거기 들어가요'}
          </span>
        </div>
        {renderResetBtn()}
      </div>
      <div className={styles.captureGrid}>
        {project.captures.map((src, i) => {
          const used = usedCaptureIndices.has(i);
          const isSelected = selectedCaptureIdx === i;
          // captures 자체에 favorite이 합성되어 있으므로 별도 overlay 없음
          return (
            <button
              key={`${i}-${src.slice(-12)}`}
              type="button"
              data-idx={i}
              className={`${styles.captureItem} ${used ? styles.used : ''} ${isSelected ? styles.captureItemSelected : ''}`}
              onClick={handleCaptureButtonClick}
              disabled={used}
              aria-label={used ? '이미 사용 중' : `사진 ${i + 1} 선택`}
            >
              <span className={styles.captureNumBadge}>{i + 1}</span>
              <img src={src} alt={`captured ${i + 1}`} />
              {used && <span className={styles.usedBadge}>사용중</span>}
              {isSelected && <span className={styles.selectedBadge}>선택됨</span>}
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
              focusedSlot={
                selectedCaptureIdx != null
                  ? null
                  : firstEmpty >= 0
                  ? firstEmpty
                  : null
              }
              onSlotClick={handleSlotClick}
            />
            <div className={styles.focusHint}>
              {allFilled ? (
                <>모두 채웠어요. 오른쪽 아래 <strong>다음</strong>을 눌러주세요.</>
              ) : selectedCaptureIdx != null ? (
                <>{selectedCaptureIdx + 1}번 사진 선택됨 → <strong>원하는 슬롯을 누르세요</strong></>
              ) : (
                <>채울 사진을 먼저 누르고, 넣을 슬롯을 누르세요</>
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
      {selectedCaptureIdx != null && sheetState === 'closed' && (
        <div
          className={styles.mobileSelectionHint}
          onClick={() => setSelectedCaptureIdx(null)}
        >
          <span className={styles.mobileSelectionHintNum}>
            {selectedCaptureIdx + 1}
          </span>
          <span>원하는 슬롯을 누르세요</span>
          <span className={styles.mobileSelectionHintCancel}>취소 ✕</span>
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
