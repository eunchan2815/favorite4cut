import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
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
    composeFrame(project, frame, { width: 1080 })
      .then((b) => {
        if (cancelled) return;
        url = URL.createObjectURL(b);
        setBlob(b);
        setPreviewUrl(url);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      });
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
    a.download = `favoritecut-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('이미지를 저장했어요');
  };

  const handleShareInstagram = async () => {
    if (!blob) return;
    const file = new File([blob], 'favoritecut.png', { type: 'image/png' });

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
            <div className={styles.errorBox}>이미지 만들기 실패: {error}</div>
          ) : (
            <div
              className={styles.skeletonCard}
              style={{
                width: `min(100%, calc(70vh * ${frame.aspect}))`,
                aspectRatio: frame.aspect,
                gridTemplateColumns:
                  frame.captionPosition === 'right' ? '1fr auto' : '1fr',
                gridTemplateRows:
                  frame.captionPosition === 'right' ? '1fr' : '1fr auto',
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
              {frame.captionPosition === 'right' ? (
                <span className={styles.skeletonCaptionRight} aria-hidden>
                  {Array.from(project.caption).map((ch, i) => (
                    <span key={i}>{ch === ' ' ? ' ' : ch}</span>
                  ))}
                </span>
              ) : (
                <span className={styles.skeletonCaption} aria-hidden>
                  {project.caption}
                </span>
              )}
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
