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

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <BackButton to="/default/capture" />
          <span className={styles.topRight}>
            <strong>{filledCount}</strong> / {frame.count} 채움
          </span>
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

          <div className={styles.poolCard}>
            <div className={styles.poolHeader}>
              <span className={styles.poolTitle}>찍은 사진 {project.captures.length}장</span>
              <span className={styles.poolHint}>탭하면 현재 슬롯에 들어가요</span>
            </div>
            <div className={styles.captureGrid}>
              {project.captures.map((src, i) => {
                const used = usedUrls.has(src);
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
                    {used && <span className={styles.usedBadge}>사용중</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleResetSlots}
            disabled={filledCount === 0}
          >
            모두 비우기
          </button>
          <button
            type="button"
            className={styles.nextBtn}
            disabled={!allFilled}
            onClick={() => navigate('/default/decorate')}
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  );
}
