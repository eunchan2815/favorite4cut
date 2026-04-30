import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { useCamera, captureFrame } from '../hooks/useCamera';
import { useProject } from '../store/ProjectContext';
import { CAPTURE_TARGET } from '../types';
import { prefetchDecorateAssets } from '../utils/prefetchAssets';
import styles from './DefaultCapture.module.css';

const COUNTDOWN_SEC = 10;

export default function DefaultCapture() {
  const { project, frame, addCapture, removeCapture, clearCaptures, clearStickers } =
    useProject();
  // 슬롯 한 칸의 실제 비율(W/H) — 카메라 박스를 이 비율로 맞춰서 WYSIWYG
  const slotAspect = (frame.aspect * frame.rows) / frame.cols;
  const { videoRef, ready, error } = useCamera();
  const navigate = useNavigate();

  // 다시 촬영부터 시작하는 경로(완전 뒤로) → 이전 꾸미기 흔적 제거
  useEffect(() => {
    clearStickers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카메라 페이지 = idle 시간 (사용자가 카운트다운 기다림). 그동안 꾸미기 페이지의
  // 스티커·배경을 백그라운드로 점진적 prefetch → 꾸미기 시트 열자마자 즉시 표시.
  useEffect(() => {
    const cancel = prefetchDecorateAssets();
    return cancel;
  }, []);

  const taken = project.captures.length;
  const allDone = taken >= CAPTURE_TARGET;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [flashKey, setFlashKey] = useState(0);

  const addCaptureRef = useRef(addCapture);
  addCaptureRef.current = addCapture;

  // 현재 슬롯의 favorite (favorite 모드에서 카메라에 비치는 것 → 캡처에도 합성)
  const currentSlotFavorite =
    project.mode === 'favorite'
      ? project.slots[taken % project.slots.length]?.favorite
      : null;

  useEffect(() => {
    if (!ready || allDone || error) return;
    const start = performance.now();
    setElapsedMs(0);
    let raf = 0;
    let fired = false;

    const tick = (now: number) => {
      const ms = now - start;
      setElapsedMs(ms);
      if (ms >= COUNTDOWN_SEC * 1000) {
        if (!fired && videoRef.current) {
          fired = true;
          captureFrame(videoRef.current, {
            mirrored: true,
            slotAspect,
            favorite: currentSlotFavorite ?? null,
          })
            .then((url) => {
              if (url) {
                addCaptureRef.current(url);
                setFlashKey((k) => k + 1);
              }
            })
            .catch(() => {});
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, allDone, error, taken, videoRef, slotAspect, currentSlotFavorite]);

  const secondsLeft = allDone
    ? 0
    : Math.max(1, Math.ceil(COUNTDOWN_SEC - elapsedMs / 1000));

  const handleShoot = async () => {
    if (!videoRef.current || !ready || allDone) return;
    const url = await captureFrame(videoRef.current, {
      mirrored: true,
      slotAspect,
      favorite: currentSlotFavorite ?? null,
    });
    if (url) {
      addCapture(url);
      setFlashKey((k) => k + 1);
    }
  };

  const handleNext = () => {
    navigate('/default/arrange');
  };

  const slots = Array.from({ length: CAPTURE_TARGET }, (_, i) => i);
  const lastShot = project.captures[taken - 1];
  const showBigCountdown = ready && !error && !allDone && secondsLeft <= 3;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <BackButton
            to={project.mode === 'favorite' ? '/favorite/arrange' : '/default'}
          />
          <span className={styles.titleLabel}>
            {project.mode === 'favorite' && !allDone
              ? `${(taken % project.slots.length) + 1}번 슬롯 · 10초 뒤 자동 촬영`
              : '10초 뒤에 사진이 자동으로 찍혀요'}
          </span>
          <span className={styles.counter}>
            {taken} / {CAPTURE_TARGET}
          </span>
        </div>

        <div
          className={styles.videoWrap}
          style={{
            aspectRatio: slotAspect,
            ['--slot-aspect' as string]: slotAspect,
          }}
        >
          <video
            ref={videoRef}
            className={styles.video}
            playsInline
            muted
          />

          {/* favorite 모드: 1→2→3→4 순환으로 현재 슬롯 최애 사진 오버레이 */}
          {project.mode === 'favorite' && !allDone && (() => {
            const slotIdx = taken % project.slots.length;
            const fav = project.slots[slotIdx]?.favorite;
            if (!fav) return null;
            return (
              <img
                src={fav.src}
                alt=""
                className={styles.favoriteCameraOverlay}
                style={{
                  opacity: fav.opacity * 0.85,
                  transform: `translate(-50%, -50%) translate(${(fav.x - 0.5) * 100}%, ${(fav.y - 0.5) * 100}%) scale(${fav.scale}) rotate(${fav.rotation}deg)`,
                }}
                draggable={false}
              />
            );
          })()}

          {!error && <div className={styles.gridLines} />}

          {ready && !error && !allDone && (
            <div className={styles.timerBadge}>
              <span className={styles.timerDot} />
              {secondsLeft}s
            </div>
          )}

          {showBigCountdown && (
            <div key={`cd-${secondsLeft}`} className={styles.bigCountdown}>
              {secondsLeft}
            </div>
          )}

          {flashKey > 0 && (
            <div key={flashKey} className={styles.flash} />
          )}

          {error && (
            <div className={styles.errorOverlay}>
              <div>카메라를 사용할 수 없어요.</div>
              <div>브라우저 권한을 허용해주세요.</div>
              <small style={{ opacity: 0.7 }}>{error}</small>
            </div>
          )}
        </div>

        <div className={styles.shutterRow}>
          <button
            type="button"
            className={styles.thumbPreview}
            onClick={handleNext}
            disabled={!allDone}
            aria-label="결과 미리보기"
          >
            {lastShot ? (
              <img src={lastShot} alt="최근 컷" />
            ) : (
              <span className={styles.thumbEmpty}>{taken}/{CAPTURE_TARGET}</span>
            )}
          </button>

          <button
            type="button"
            className={styles.shutter}
            onClick={handleShoot}
            disabled={!ready || allDone || !!error}
            aria-label="촬영"
          >
            <span className={styles.shutterInner} />
          </button>

          <button
            type="button"
            className={styles.nextBtn}
            onClick={handleNext}
            disabled={!allDone}
          >
            다음 →
          </button>
        </div>

        <div className={styles.thumbStrip}>
          {slots.map((i) => {
            const src = project.captures[i];
            if (!src) {
              return (
                <div key={i} className={`${styles.thumb} ${styles.empty}`}>
                  {i + 1}
                </div>
              );
            }
            return (
              <div key={i} className={`${styles.thumb} ${styles.filled}`}>
                <img src={src} alt={`captured ${i + 1}`} />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeCapture(i)}
                  aria-label="이 사진 삭제"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.clearLink}
          onClick={clearCaptures}
          disabled={taken === 0}
        >
          모두 지우기
        </button>
      </div>
    </div>
  );
}
