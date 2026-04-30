import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ColorPicker from '../components/ColorPicker';
import FramePreview from '../components/FramePreview';
import { usePreviewBox } from '../hooks/usePreviewBox';
import { useProject } from '../store/ProjectContext';
import type { PhotoFilter } from '../types';
import { CATEGORY_LABELS, CATEGORY_ORDER, STICKER_LIB, type StickerCategory, type StickerDef } from '../utils/stickers';
import styles from './DefaultDecorate.module.css';

// 카테고리별 스티커 사전 분류 — 매 렌더마다 filter() 돌지 않게
const STICKERS_BY_CATEGORY: Record<StickerCategory, StickerDef[]> = (() => {
  const map = {} as Record<StickerCategory, StickerDef[]>;
  for (const cat of CATEGORY_ORDER) map[cat] = [];
  for (const s of STICKER_LIB) {
    if (!map[s.category]) map[s.category] = [];
    map[s.category].push(s);
  }
  return map;
})();

const FRAME_COLORS = [
  '#ffffff',
  '#fff8ec',
  '#ffd6e0',
  '#ffe8b3',
  '#cfeee3',
  '#cfe6ff',
  '#e3d9ff',
  '#1a1a1a',
];

const FRAME_BG_IMAGES = [
  '/image1.jpg',
  '/image2.jpg',
  '/image3.webp',
  '/image4.jpg',
  '/image5.jpg',
  '/image6.jpg',
  '/image7.webp',
  '/image8.jpg',
  '/image9.jpg',
  '/image10.png',
  '/image11.png',
  '/image12.jpg',
  '/image13.jpg',
  '/image14.webp',
  '/image15.jpg',
  '/image16.jpg',
  '/image17.webp',
  '/image18.jpg',
  '/image19.webp',
];

const FILTERS: { id: PhotoFilter; label: string; css: string }[] = [
  { id: 'none', label: '원본', css: 'none' },
  { id: 'bw', label: '흑백', css: 'grayscale(1) contrast(1.05)' },
  { id: 'sepia', label: '세피아', css: 'sepia(0.6) saturate(1.1)' },
  { id: 'vivid', label: '비비드', css: 'saturate(1.45) contrast(1.05)' },
  { id: 'warm', label: '웜톤', css: 'sepia(0.25) saturate(1.2) brightness(1.04)' },
  { id: 'cool', label: '쿨톤', css: 'hue-rotate(-12deg) saturate(1.1) brightness(1.04)' },
];

type Tab = 'color' | 'bg' | 'filter' | 'sticker';
const TABS: { id: Tab; label: string }[] = [
  { id: 'color', label: '색' },
  { id: 'bg', label: '배경' },
  { id: 'filter', label: '필터' },
  { id: 'sticker', label: '스티커' },
];

export default function DefaultDecorate() {
  const {
    project,
    frame,
    userLibrary,
    setFrameBg,
    setFrameBgImage,
    setFilter,
    addSticker,
    moveSticker,
    scaleSticker,
    rotateSticker,
    removeSticker,
    clearStickers,
    addUserSticker,
    removeUserSticker,
    addUserBg,
    removeUserBg,
  } = useProject();
  const navigate = useNavigate();
  const previewBox = usePreviewBox();
  const [tab, setTab] = useState<Tab>('color');
  type SheetState = 'closed' | 'half' | 'expanded';
  const [sheetState, setSheetState] = useState<SheetState>('closed');
  // 두 번째 이상 진입 시엔 점진 reveal 스킵 (sessionStorage 플래그로 추적)
  const SESSION_VISITED_KEY = 'fc:decorate:revealed';
  const alreadyVisitedThisSession = (() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem(SESSION_VISITED_KEY) === '1';
    } catch {
      return false;
    }
  })();
  // 처음 진입 시 시트가 1초 후에 자동 오픈 → 그동안 카테고리 1개만 mount.
  // 재진입 시엔 이미지가 이미 캐시되어 있으니 시트 즉시 오픈 + 모든 카테고리 즉시 mount.
  const [hasOpenedSheet, setHasOpenedSheet] = useState(alreadyVisitedThisSession);
  const [revealedCategories, setRevealedCategories] = useState(
    alreadyVisitedThisSession ? CATEGORY_ORDER.length : 1
  );

  useEffect(() => {
    if (sheetState !== 'closed' && !hasOpenedSheet) {
      setHasOpenedSheet(true);
    }
  }, [sheetState, hasOpenedSheet]);

  // 시트 열린 후 idle 시간에 카테고리를 한 개씩 추가로 mount → 첫 paint 가벼움
  useEffect(() => {
    if (!hasOpenedSheet) return;
    if (revealedCategories >= CATEGORY_ORDER.length) return;
    const id = window.setTimeout(() => {
      setRevealedCategories((n) => n + 1);
    }, 100);
    return () => window.clearTimeout(id);
  }, [hasOpenedSheet, revealedCategories]);

  // 카테고리 모두 reveal 완료되면 sessionStorage에 저장 → 다음 진입 시 점진 reveal 스킵
  useEffect(() => {
    if (revealedCategories >= CATEGORY_ORDER.length) {
      try {
        window.sessionStorage.setItem(SESSION_VISITED_KEY, '1');
      } catch {
        // ignore
      }
    }
  }, [revealedCategories]);

  const visibleCategories = useMemo(
    () => CATEGORY_ORDER.slice(0, revealedCategories),
    [revealedCategories]
  );

  // 진입 후 시트 자동 오픈 — 첫 진입은 1초 딜레이, 재진입은 즉시 (이미지 캐시 있음)
  useEffect(() => {
    const delay = alreadyVisitedThisSession ? 0 : 1000;
    const id = window.setTimeout(() => {
      setSheetState((s) => (s === 'closed' ? 'half' : s));
    }, delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [autoSelectStickerId, setAutoSelectStickerId] = useState<string | null>(null);
  const dragStartY = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartState = useRef<SheetState | null>(null);

  // 스티커 추가 — 새 id로 자동 선택 + 시트 닫기 + 이미지 디코드 prefetch
  const handleAddSticker = (stickerLibId: string) => {
    const newId = addSticker(stickerLibId);
    setAutoSelectStickerId(newId);
    setSheetState('closed');
    // 추가된 sticker 이미지를 미리 디코드해서 캐시에 올려둠 →
    // 저장 페이지에서 composeFrame 호출 시 즉시 사용 가능
    const url = stickerLibId.startsWith('data:')
      ? stickerLibId
      : STICKER_LIB.find((s) => s.id === stickerLibId)?.image;
    if (url) {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      img.decode?.().catch(() => {});
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [stickerProcessing, setStickerProcessing] = useState(false);

  const handleUploadClick = () => {
    if (stickerProcessing) return;
    fileInputRef.current?.click();
  };

  const handleBgUploadClick = () => {
    bgFileInputRef.current?.click();
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 가능하게
    if (!file) return;
    setStickerProcessing(true);
    try {
      let blob: Blob = file;
      try {
        const { removeBackground } = await import('@imgly/background-removal');
        blob = await removeBackground(file);
      } catch (err) {
        console.error('스티커 배경 제거 실패, 원본 사용:', err);
        blob = file;
      }
      const dataUrl = await blobToDataUrl(blob);
      addUserSticker(dataUrl);
      handleAddSticker(dataUrl);
    } finally {
      setStickerProcessing(false);
    }
  };

  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        addUserBg(result);
        setFrameBgImage(result);
      }
    };
    reader.readAsDataURL(file);
  };

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
      setSheetState((s) => (s === 'closed' ? 'half' : 'expanded'));
    } else if (dy > 20) {
      setSheetState((s) => (s === 'expanded' ? 'half' : 'closed'));
    }
  };

  const onContentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop > 30 && sheetState === 'half') {
      setSheetState('expanded');
    }
  };

  const onContentWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (
      e.currentTarget.scrollTop === 0 &&
      e.deltaY < -20 &&
      sheetState === 'expanded'
    ) {
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

  const handleDone = () => {
    navigate('/default/save');
  };

  const renderColorSection = () => (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>프레임 색</span>
      <ColorPicker
        value={project.frameBg}
        presets={FRAME_COLORS}
        onChange={setFrameBg}
      />
    </div>
  );

  const renderBgSection = () => {
    return (
      <div className={styles.section}>
        <span className={styles.sectionLabel}>프레임 배경</span>
        <button
          type="button"
          className={styles.uploadStickerBtn}
          onClick={handleBgUploadClick}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          내 사진으로 배경 만들기
        </button>
        <input
          ref={bgFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleBgFileChange}
          hidden
        />
        <div className={styles.bgImageRow}>
          <button
            type="button"
            className={`${styles.bgImageCard} ${styles.bgImageNone} ${project.frameBgImage === null ? styles.bgImageActive : ''}`}
            onClick={() => setFrameBgImage(null)}
            aria-label="배경 이미지 없음"
          >
            <span className={styles.bgImageNoneLabel}>없음</span>
          </button>
          {userLibrary.bgs.map((src) => {
            const active = project.frameBgImage === src;
            return (
              <div
                key={src}
                className={`${styles.bgImageCard} ${active ? styles.bgImageActive : ''}`}
              >
                <button
                  type="button"
                  className={styles.bgImageInner}
                  onClick={() => setFrameBgImage(src)}
                  aria-label="내 배경"
                >
                  <img src={src} alt="" loading="lazy" decoding="async" />
                  <span className={styles.bgImageMineBadge}>내 사진</span>
                </button>
                <button
                  type="button"
                  className={styles.bgImageRemoveBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (project.frameBgImage === src) setFrameBgImage(null);
                    removeUserBg(src);
                  }}
                  aria-label="이 배경 삭제"
                >
                  ×
                </button>
              </div>
            );
          })}
          {FRAME_BG_IMAGES.map((src) => {
            const active = project.frameBgImage === src;
            return (
              <button
                key={src}
                type="button"
                className={`${styles.bgImageCard} ${active ? styles.bgImageActive : ''}`}
                onClick={() => setFrameBgImage(src)}
                aria-label={`배경 이미지 ${src}`}
              >
                <img src={src} alt="" loading="lazy" decoding="async" />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderFilterSection = () => (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>사진 필터</span>
      <div className={styles.filterRow}>
        {FILTERS.map(({ id, label, css }) => {
          const active = project.filter === id;
          return (
            <button
              key={id}
              type="button"
              className={`${styles.filterCard} ${active ? styles.filterCardActive : ''}`}
              onClick={() => setFilter(id)}
            >
              <div className={styles.filterThumb}>
                <img src="/stella.jpg" alt="" style={{ filter: css }} />
              </div>
              <span className={styles.filterLabel}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderStickerSection = () => (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>스티커</span>
      <span className={styles.sectionHint}>클릭하면 프레임 가운데에 추가돼요 · 업로드시 배경 자동 제거</span>
      <button
        type="button"
        className={styles.uploadStickerBtn}
        onClick={handleUploadClick}
        disabled={stickerProcessing}
      >
        {stickerProcessing ? (
          <>
            <span className={styles.uploadSpinner} />
            배경 제거 중…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            내 사진으로 스티커 만들기
          </>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />
      <div className={styles.stickerGroups}>
        {userLibrary.stickers.length > 0 && (
          <div className={styles.stickerGroup}>
            <span className={styles.stickerGroupLabel}>
              내 스티커{' '}
              <span className={styles.stickerGroupCount}>{userLibrary.stickers.length}</span>
            </span>
            <div className={styles.stickerPalette}>
              {userLibrary.stickers.map((url) => (
                <div key={url} className={styles.userStickerWrap}>
                  <button
                    type="button"
                    className={styles.stickerBtn}
                    onClick={() => handleAddSticker(url)}
                    aria-label="내 스티커"
                  >
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={styles.stickerBtnArt}
                      draggable={false}
                    />
                  </button>
                  <button
                    type="button"
                    className={styles.userStickerRemoveBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUserSticker(url);
                    }}
                    aria-label="이 스티커 삭제"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {visibleCategories.map((cat) => {
          const items = STICKERS_BY_CATEGORY[cat] || [];
          if (items.length === 0) return null;
          return (
            <div key={cat} className={styles.stickerGroup}>
              <span className={styles.stickerGroupLabel}>
                {CATEGORY_LABELS[cat]}{' '}
                <span className={styles.stickerGroupCount}>{items.length}</span>
              </span>
              <div className={styles.stickerPalette}>
                {items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={styles.stickerBtn}
                    onClick={() => handleAddSticker(s.id)}
                    aria-label={s.name}
                    title={s.name}
                  >
                    <img
                      src={s.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={styles.stickerBtnArt}
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.clearLink}
        onClick={clearStickers}
        disabled={project.stickers.length === 0}
      >
        스티커 모두 지우기 ({project.stickers.length})
      </button>
    </div>
  );

  // 한 번 visit한 탭은 mount 유지 — 다시 와도 이미지 그대로 보임 (재 fetch / 재 layout 없음)
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(new Set(['color']));
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, [tab]);

  const renderTabContent = () => (
    <>
      <div style={{ display: tab === 'color' ? 'block' : 'none' }}>
        {visitedTabs.has('color') && renderColorSection()}
      </div>
      <div style={{ display: tab === 'bg' ? 'block' : 'none' }}>
        {visitedTabs.has('bg') && renderBgSection()}
      </div>
      <div style={{ display: tab === 'filter' ? 'block' : 'none' }}>
        {visitedTabs.has('filter') && renderFilterSection()}
      </div>
      <div style={{ display: tab === 'sticker' ? 'block' : 'none' }}>
        {visitedTabs.has('sticker') && renderStickerSection()}
      </div>
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <button
            type="button"
            className={styles.doneBtn}
            onClick={() => navigate('/default/arrange')}
          >
            ← 이전
          </button>
          <span className={styles.title}>프레임 꾸미기</span>
          <button type="button" className={styles.doneBtn} onClick={handleDone}>
            다음 →
          </button>
        </div>

        <div className={styles.split}>
          <div className={styles.previewCard}>
            <FramePreview
              frame={frame}
              slots={project.slots}
              caption={project.caption}
              boxWidth={previewBox.w}
              boxHeight={previewBox.h}
              bg={project.frameBg}
              bgImage={project.frameBgImage}
              filter={project.filter}
              stickers={project.stickers}
              onStickerMove={moveSticker}
              onStickerScale={scaleSticker}
              onStickerRotate={rotateSticker}
              onStickerRemove={removeSticker}
              autoSelectStickerId={autoSelectStickerId}
            />
            <span className={styles.previewHint}>
              스티커 클릭 → 드래그 이동 · 모서리 크기 · 위 핸들 회전 · ✕ 삭제
            </span>
          </div>

          {/* Desktop — same tab UX as mobile sheet, just embedded as side card */}
          <div className={styles.controlsCard}>
            <div className={styles.sheetTabs}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.sheetTab} ${tab === t.id ? styles.sheetTabActive : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className={styles.controlsContent}>{renderTabContent()}</div>
          </div>
        </div>
      </div>

      {/* Mobile sheet backdrop */}
      {sheetState !== 'closed' && (
        <div
          className={styles.sheetBackdrop}
          onClick={() => setSheetState('closed')}
        />
      )}

      {/* Mobile — bottom sheet with tabs */}
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
        <div className={styles.sheetTabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`${styles.sheetTab} ${tab === t.id ? styles.sheetTabActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
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
          {/* 시트가 처음 열리기 전까진 무거운 이미지 콘텐츠 mount 안 함 */}
          {hasOpenedSheet && renderTabContent()}
        </div>
      </div>
    </div>
  );
}
