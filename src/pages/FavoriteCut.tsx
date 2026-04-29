import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { useProject } from '../store/ProjectContext';
import type { FavoriteOverlay } from '../types';
import styles from './FavoriteCut.module.css';

const SLOT_COUNT = 4;

interface SlotData {
  src: string | null; // bg-removed (or original) data URL
  processing: boolean;
}

export default function FavoriteCut() {
  const { project, setLayout, setSlotFavorite } = useProject();
  const navigate = useNavigate();
  const [slots, setSlots] = useState<SlotData[]>(() =>
    Array.from({ length: SLOT_COUNT }, (_, i) => ({
      // 이전에 올렸던 사진이 있으면 복원
      src: project.slots[i]?.favorite?.src ?? null,
      processing: false,
    }))
  );
  const [removeBg, setRemoveBg] = useState(true);
  const fileInputs = useRef<(HTMLInputElement | null)[]>([]);

  // 모드/레이아웃을 favorite + 4-vertical 고정으로 셋업
  useEffect(() => {
    setLayout('4-vertical');
  }, [setLayout]);

  const filledCount = slots.filter((s) => s.src).length;
  const hasAny = filledCount > 0;

  const handleSlotClick = (i: number) => {
    if (slots[i].src) return; // 이미 차있으면 무시 (X 버튼으로 제거)
    fileInputs.current[i]?.click();
  };

  const handleFile = async (i: number, file: File) => {
    setSlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, processing: true } : s))
    );

    try {
      let blob: Blob = file;
      if (removeBg) {
        const { removeBackground } = await import('@imgly/background-removal');
        blob = await removeBackground(file);
      }

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      setSlots((prev) =>
        prev.map((s, idx) =>
          idx === i ? { src: dataUrl, processing: false } : s
        )
      );
    } catch (err) {
      console.error('Background removal failed:', err);
      // 실패 시 원본 그대로 사용
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setSlots((prev) =>
        prev.map((s, idx) =>
          idx === i ? { src: dataUrl, processing: false } : s
        )
      );
    }
  };

  const handleRemove = (i: number) => {
    setSlots((prev) =>
      prev.map((s, idx) => (idx === i ? { src: null, processing: false } : s))
    );
  };

  const handleNext = () => {
    if (!hasAny) return;
    // 슬롯별 기본 favorite 등록 → 배치 단계로
    slots.forEach((s, i) => {
      if (!s.src) {
        setSlotFavorite(i, null);
        return;
      }
      const overlay: FavoriteOverlay = {
        src: s.src,
        x: 0.5,
        y: 0.5,
        scale: 0.65,
        rotation: 0,
        opacity: 1,
        flipped: false,
        onTop: true,
      };
      setSlotFavorite(i, overlay);
    });
    navigate('/favorite/arrange');
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <BackButton to="/" />
          <span className={styles.title}>최애 사진 올리기</span>
          <button
            type="button"
            className={styles.nextBtn}
            onClick={handleNext}
            disabled={!hasAny}
          >
            다음 →
          </button>
        </div>

        <p className={styles.hint}>
          최애 사진을 <strong>최대 4장</strong>까지 올려 프레임을 만들어요.
          {' '}촬영 시 각 컷에 자동으로 합성됩니다.
        </p>

        <label className={styles.bgRemoveOption}>
          <input
            type="checkbox"
            checked={removeBg}
            onChange={(e) => setRemoveBg(e.target.checked)}
          />
          업로드 시 자동 배경 제거 (처음 한 번 5~10초 소요)
        </label>

        <div className={styles.slots}>
          {slots.map((slot, i) => (
            <div
              key={i}
              className={`${styles.slotCard} ${slot.src ? styles.filled : ''}`}
              onClick={() => handleSlotClick(i)}
              role="button"
              tabIndex={0}
            >
              <span className={styles.slotIndex}>{i + 1}</span>
              {slot.src ? (
                <>
                  <img src={slot.src} alt="" className={styles.slotPreview} />
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(i);
                    }}
                    aria-label="삭제"
                  >
                    ×
                  </button>
                </>
              ) : (
                <span className={styles.slotPlaceholder}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <path d="M12 8v8M8 12h8" />
                  </svg>
                  사진 추가
                </span>
              )}
              {slot.processing && (
                <div className={styles.slotProcessing}>
                  <div className={styles.spinner} />
                  배경 제거 중…
                </div>
              )}
              <input
                ref={(el) => {
                  fileInputs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) handleFile(i, f);
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
