import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { useCamera, captureFrame } from '../hooks/useCamera';
import { useProject } from '../store/ProjectContext';
import { CAPTURE_TARGET } from '../types';
import styles from './DefaultCapture.module.css';

const COUNTDOWN_SEC = 10;

export default function DefaultCapture() {
  const { project, addCapture, removeCapture, clearCaptures, clearStickers } =
    useProject();
  const { videoRef, ready, error } = useCamera();
  const navigate = useNavigate();

  // 다시 촬영부터 시작하는 경로(완전 뒤로) → 이전 꾸미기 흔적 제거
  useEffect(() => {
    clearStickers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taken = project.captures.length;
  const allDone = taken >= CAPTURE_TARGET;

  const [elapsedMs, setElapsedMs] = useState(0);
  const [flashKey, setFlashKey] = useState(0);

  const addCaptureRef = useRef(addCapture);
  addCaptureRef.current = addCapture;

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
          const url = captureFrame(videoRef.current, true);
          if (url) {
            addCaptureRef.current(url);
            setFlashKey((k) => k + 1);
          }
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, allDone, error, taken, videoRef]);

  const secondsLeft = allDone
    ? 0
    : Math.max(1, Math.ceil(COUNTDOWN_SEC - elapsedMs / 1000));

  const handleShoot = () => {
    if (!videoRef.current || !ready || allDone) return;
    const url = captureFrame(videoRef.current, true);
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
          <BackButton to="/default" />
          <span className={styles.titleLabel}>10초 뒤에 사진이 자동으로 찍혀요</span>
          <span className={styles.counter}>
            {taken} / {CAPTURE_TARGET}
          </span>
        </div>

        <div className={styles.videoWrap}>
          <video
            ref={videoRef}
            className={styles.video}
            playsInline
            muted
          />

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
