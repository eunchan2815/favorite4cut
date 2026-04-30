import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { todayDate } from '../frames/frames';
import { useProject } from '../store/ProjectContext';
import { composeFrame } from '../utils/composeFrame';
import styles from './DefaultSave.module.css';

const META_APP_ID = '826905676417975';

export default function DefaultSave() {
  const { project, frame, reset } = useProject();
  const navigate = useNavigate();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;

    // 자동 재시도 — 첫 시도 1080, 실패시 720으로 한 번 더 (메모리/타이밍 회피)
    const ATTEMPTS: number[] = [1080, 720];
    const run = async () => {
      for (let i = 0; i < ATTEMPTS.length; i++) {
        if (cancelled) return;
        try {
          const b = await composeFrame(project, frame, { width: ATTEMPTS[i] });
          if (cancelled) return;
          url = URL.createObjectURL(b);
          setBlob(b);
          setPreviewUrl(url);
          return;
        } catch (e) {
          if (cancelled) return;
          // 마지막 시도까지 실패하면 에러 표시
          if (i === ATTEMPTS.length - 1) {
            setError(e instanceof Error ? e.message : String(e));
          } else {
            // 다음 시도 전 짧게 대기 (이미지·폰트 캐시 안정화)
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    a.download = `favorite4cut-${ymd}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('이미지를 저장했어요');
  };

  const handleShareInstagram = async () => {
    if (!blob) return;
    const file = new File([blob], 'favorite4cut.png', { type: 'image/png' });

    // 1) Web Share API (iOS Safari · Android Chrome)
    const navAny = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };
    if (navAny.canShare?.({ files: [file] }) && typeof navigator.share === 'function') {
      try {
        setBusy(true);
        await navigator.share({ files: [file], title: '인생네컷' });
        showToast('공유 시트에서 인스타그램 → 스토리를 선택해주세요');
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
      } finally {
        setBusy(false);
      }
    }

    // 2) Fallback — auto-download then open Instagram Stories deep link
    handleDownload();
    showToast('인스타그램 앱이 열리면 스토리에 직접 올려주세요');
    setTimeout(() => {
      const link = `instagram-stories://share?source_application=${META_APP_ID}`;
      window.location.href = link;
    }, 600);
  };

  const handleHome = () => {
    reset();
    navigate('/');
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <BackButton to="/default/decorate" />
          <span className={styles.title}>저장 / 공유</span>
          <button type="button" className={styles.homeBtn} onClick={handleHome}>
            홈으로
          </button>
        </div>

        <div className={styles.previewCard}>
          {previewUrl ? (
            <img src={previewUrl} alt="완성된 프레임" className={styles.image} />
          ) : error ? (
            <div className={styles.errorBox}>
              <div className={styles.errorIcon} aria-hidden>↻</div>
              <div className={styles.errorTitle}>이미지를 만들지 못했어요</div>
              <p className={styles.errorDesc}>
                일시적인 오류일 수 있어요.
                <br />
                <strong>이전</strong> 버튼을 눌러 다시 시도해주세요.
              </p>
              <div className={styles.errorActions}>
                <button
                  type="button"
                  className={styles.errorBackBtn}
                  onClick={() => navigate('/default/decorate')}
                >
                  ← 이전으로
                </button>
                <button
                  type="button"
                  className={styles.errorRetryBtn}
                  onClick={() => window.location.reload()}
                >
                  다시 시도
                </button>
              </div>
            </div>
          ) : (
            <div
              className={styles.skeletonCard}
              style={{
                width: `min(100%, calc(70vh * ${frame.aspect}))`,
                aspectRatio: frame.aspect,
                gridTemplateColumns: '1fr',
                gridTemplateRows: '1fr auto',
              }}
              aria-label="이미지 만드는 중"
            >
              <div
                className={styles.skeletonGrid}
                style={{
                  gridTemplateRows: `repeat(${frame.rows}, 1fr)`,
                  gridTemplateColumns: `repeat(${frame.cols}, 1fr)`,
                }}
              >
                {Array.from({ length: frame.count }).map((_, i) => (
                  <div key={i} className={styles.skeletonSlot} />
                ))}
              </div>
              <span
                className={`${styles.skeletonCaption} ${frame.captionPosition === 'right' ? styles.skeletonCaptionCorner : ''}`}
                aria-hidden
              >
                {frame.captionPosition === 'right' ? todayDate() : project.caption}
              </span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={handleDownload}
            disabled={!blob}
          >
            이미지 저장
          </button>
          <button
            type="button"
            className={styles.instagram}
            onClick={handleShareInstagram}
            disabled={!blob || busy}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
            </svg>
            인스타 스토리에 올리기
          </button>
        </div>

        <p className={styles.note}>
          모바일에서는 <strong>공유 시트로 인스타 → 스토리</strong>를 선택할 수 있어요.<br />
          데스크톱은 이미지 저장 후 폰으로 옮겨 올려주세요.
        </p>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
