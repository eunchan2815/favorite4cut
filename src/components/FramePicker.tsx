import { useProject } from '../store/ProjectContext';
import FramePreview from './FramePreview';
import styles from './FramePicker.module.css';
import type { Slot } from '../types';

function emptySlots(count: number): Slot[] {
  return Array.from({ length: count }, (_, i) => ({ index: i, photo: null }));
}

export default function FramePicker() {
  const { frames, project, setLayout } = useProject();

  return (
    <div className={styles.list}>
      {frames.map((f) => {
        const active = project.layoutId === f.id;
        return (
          <button
            key={f.id}
            type="button"
            className={`${styles.item} ${active ? styles.active : ''}`}
            onClick={() => setLayout(f.id)}
          >
            <FramePreview
              frame={f}
              slots={emptySlots(f.count)}
              caption={project.caption}
              width={140}
            />
            <span className={styles.label}>{f.label}</span>
          </button>
        );
      })}
    </div>
  );
}
