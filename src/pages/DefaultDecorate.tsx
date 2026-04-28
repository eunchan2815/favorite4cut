import { useNavigate } from 'react-router-dom';
import ColorPicker from '../components/ColorPicker';
import FramePreview from '../components/FramePreview';
import { usePreviewBox } from '../hooks/usePreviewBox';
import { useProject } from '../store/ProjectContext';
import type { PhotoFilter } from '../types';
import { CATEGORY_LABELS, CATEGORY_ORDER, STICKER_LIB } from '../utils/stickers';
import styles from './DefaultDecorate.module.css';

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

export default function DefaultDecorate() {
  const {
    project,
    frame,
    setFrameBg,
    setFrameBgImage,
    setFilter,
    addSticker,
    moveSticker,
    scaleSticker,
    rotateSticker,
    removeSticker,
    clearStickers,
  } = useProject();
  const navigate = useNavigate();
  const previewBox = usePreviewBox();

  const handleDone = () => {
    navigate('/default/save');
  };

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
            />
            <span className={styles.previewHint}>
              스티커 탭 → 드래그 이동 · 모서리 크기 · 위 핸들 회전 · ✕ 삭제
            </span>
          </div>

          <div className={styles.controlsCard}>
            <div className={styles.section}>
              <span className={styles.sectionLabel}>프레임 색</span>
              <ColorPicker
                value={project.frameBg}
                presets={FRAME_COLORS}
                onChange={setFrameBg}
              />
            </div>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>프레임 배경</span>
              <div className={styles.bgImageRow}>
                <button
                  type="button"
                  className={`${styles.bgImageCard} ${styles.bgImageNone} ${project.frameBgImage === null ? styles.bgImageActive : ''}`}
                  onClick={() => setFrameBgImage(null)}
                  aria-label="배경 이미지 없음"
                >
                  <span className={styles.bgImageNoneLabel}>없음</span>
                </button>
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
                      <img src={src} alt="" />
                    </button>
                  );
                })}
              </div>
            </div>

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
                        <img
                          src="/stella.jpg"
                          alt=""
                          style={{ filter: css }}
                        />
                      </div>
                      <span className={styles.filterLabel}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.section}>
              <span className={styles.sectionLabel}>스티커</span>
              <span className={styles.sectionHint}>
                탭하면 프레임 가운데에 추가돼요
              </span>
              <div className={styles.stickerGroups}>
                {CATEGORY_ORDER.map((cat) => {
                  const items = STICKER_LIB.filter((s) => s.category === cat);
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
                            onClick={() => addSticker(s.id)}
                            aria-label={s.name}
                            title={s.name}
                          >
                            <img
                              src={s.image}
                              alt=""
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
          </div>
        </div>
      </div>
    </div>
  );
}
