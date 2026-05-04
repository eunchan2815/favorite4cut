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

  // project 또는 frame이 바뀌면 재시도 — 첫 mount 시 stale project closure 방지
  // (스티커 추가 직후 navigate, "다음" 직후 mount 시점 project가 fresh 아닐 수 있음)
  // 한 번 성공해서 blob이 생기면 더 이상 재호출 안 함.
  useEffect(() => {
    if (blob) return;
    let cancelled = false;
    let url: string | null = null;
    let retryTimerId: number | null = null;

    const isMobile =
      typeof window !== 'undefined' && window.innerWidth < 600;
    // 모바일은 처음부터 작게 시작 (CPU 부담 / 메모리 한계 회피)
    const ATTEMPTS: number[] = isMobile ? [720, 540] : [1080, 720];
    const run = async () => {
      // 첫 시도 전 한 프레임 양보 — 라우트 전환 직후 image/font 디코딩이 아직 안 끝났을 가능성
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      if (cancelled) return;

      for (let i = 0; i < ATTEMPTS.length; i++) {
        if (cancelled) return;
        try {
          const b = await composeFrame(project, frame, { width: ATTEMPTS[i] });
          if (cancelled) return;
          url = URL.createObjectURL(b);
          setBlob(b);
          setPreviewUrl(url);
          setError(null);
          return;
        } catch (e) {
          if (cancelled) return;
          if (i === ATTEMPTS.length - 1) {
            setError(e instanceof Error ? e.message : String(e));
          } else {
            await new Promise((r) => {
              retryTimerId = window.setTimeout(() => r(undefined), 600);
            });
          }
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      if (retryTimerId != null) window.clearTimeout(retryTimerId);
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    };
  }, [project, frame, blob]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  };

  const buildFile = (): File | null => {
    if (!blob) return null;
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return new File([blob], `favorite4cut-${ymd}.png`, { type: 'image/png' });
  };

  const isIOS = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  };

  const handleDownload = async () => {
    const file = buildFile();
    if (!file || !previewUrl) return;

    // 모바일 — Web Share API 우선 (공유 시트에서 "이미지 저장" 선택 → 사진 앱)
    const navAny = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (navAny.canShare?.({ files: [file] }) && typeof navigator.share === 'function') {
      try {
        setBusy(true);
        await navigator.share({ files: [file] });
        showToast('공유 시트에서 "이미지 저장"을 선택해주세요');
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
        // share 실패면 anchor download 폴백
      } finally {
        setBusy(false);
      }
    }

    // 데스크톱 (또는 share 미지원) — anchor download
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('다운로드 폴더에 저장됐어요');
  };

  const handleShareInstagram = async () => {
    const file = buildFile();
    if (!file) return;

    // Web Share API — 파일 첨부 가능한 경우 (iOS Safari · Android Chrome 모두 지원)
    const navAny = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (navAny.canShare?.({ files: [file] }) && typeof navigator.share === 'function') {
      try {
        setBusy(true);
        await navigator.share({ files: [file], title: '최애네컷' });
        showToast('공유 시트에서 Instagram → 스토리를 선택해주세요');
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
      } finally {
        setBusy(false);
      }
    }

    // iOS 폴백 — instagram-stories:// deep link (단, 이미지를 자동 첨부 못함, Android는 미동작)
    if (isIOS()) {
      await handleDownload();
      showToast('내려받은 후 인스타그램 스토리에 올려주세요');
      setTimeout(() => {
        const link = `instagram-stories://share?source_application=${META_APP_ID}`;
        window.location.href = link;
      }, 600);
      return;
    }

    // 그 외(Android Web Share 안 되는 경우 / 데스크톱) — 그냥 다운로드
    await handleDownload();
    showToast('내려받은 후 인스타그램 앱에서 직접 스토리에 올려주세요');
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
            이미지 내려받기
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
          모바일은 공유 시트에서 <strong>"이미지 저장"</strong>을 선택하면 사진 앱에 저장돼요.<br />
          인스타 스토리는 같은 시트에서 <strong>Instagram → 스토리</strong>를 선택해주세요.
        </p>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
