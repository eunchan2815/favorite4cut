import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../store/ProjectContext';
import FramePreview from '../components/FramePreview';
import BackButton from '../components/BackButton';
import type { FrameDef, FrameLayoutId, Slot } from '../types';
import styles from './DefaultCut.module.css';

function emptySlots(count: number): Slot[] {
  return Array.from({ length: count }, (_, i) => ({ index: i, photo: null }));
}

const GROUPS: { count: 2 | 3 | 4 | 6; label: string; box: number }[] = [
  { count: 2, label: '2컷', box: 180 },
  { count: 3, label: '3컷', box: 180 },
  { count: 4, label: '4컷', box: 140 }, // 옵션 3개라 작게
  { count: 6, label: '6컷', box: 180 },
];

const DIRECTION_LABEL: Record<string, string> = {
  vertical: '세로',
  horizontal: '가로',
  square: '2×2',
};

function directionLabelOf(f: FrameDef): string {
  const suffix = f.id.split('-')[1];
  return DIRECTION_LABEL[suffix] ?? suffix;
}

function getBoxScale(): number {
  if (typeof window === 'undefined') return 1;
  const w = window.innerWidth;
  if (w >= 760) return 1;
  if (w >= 480) return 0.7;
  if (w >= 380) return 0.55;
  return 0.45;
}

export default function DefaultCut() {
  const { frames, project, setLayout } = useProject();
  const navigate = useNavigate();
  const [boxScale, setBoxScale] = useState(getBoxScale);

  useEffect(() => {
    const onResize = () => setBoxScale(getBoxScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleSelect = (id: FrameLayoutId) => {
    setLayout(id);
    navigate('/default/capture');
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.topBar}>
          <BackButton to="/" />
        </div>
        <div className={styles.header}>
          <h1 className={styles.title}>프레임을 골라보세요</h1>
          <span className={styles.subtitle}>컷 수와 방향을 선택하면 시작돼요</span>
        </div>

        <div className={styles.grid}>
          {GROUPS.map((g) => {
            const options = frames.filter((f) => f.count === g.count);
            return (
              <div key={g.count} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.cardLabel}>{g.label}</span>
                  <span className={styles.cardCount}>{g.count} CUTS</span>
                </div>
                <div className={styles.options}>
                  {options.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={styles.option}
                      onClick={() => handleSelect(f.id)}
                    >
                      <FramePreview
                        frame={f}
                        slots={emptySlots(f.count)}
                        caption={project.caption}
                        boxWidth={Math.round(g.box * boxScale)}
                        boxHeight={Math.round(g.box * boxScale)}
                        compact
                      />
                      <span className={styles.optionLabel}>{directionLabelOf(f)}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
