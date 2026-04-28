import { useLocation, useNavigate } from 'react-router-dom';
import { useProject } from '../store/ProjectContext';
import type { Mode } from '../types';
import styles from './ModeToggle.module.css';

export default function ModeToggle() {
  const { setMode } = useProject();
  const navigate = useNavigate();
  const location = useLocation();

  // 홈에서는 토글 숨김
  if (location.pathname === '/') return null;

  const activeMode: Mode = location.pathname.startsWith('/favorite')
    ? 'favorite'
    : 'default';

  const choose = (mode: Mode) => {
    if (mode === activeMode) return;
    setMode(mode);
    navigate(mode === 'default' ? '/default' : '/favorite');
  };

  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.tab} ${activeMode === 'default' ? styles.active : ''}`}
        onClick={() => choose('default')}
      >
        기본네컷
      </button>
      <button
        className={`${styles.tab} ${activeMode === 'favorite' ? styles.active : ''}`}
        onClick={() => choose('favorite')}
      >
        최애컷
      </button>
    </div>
  );
}
