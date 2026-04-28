import { useNavigate } from 'react-router-dom';
import { useProject } from '../store/ProjectContext';
import type { Mode } from '../types';
import styles from './Home.module.css';

export default function Home() {
  const navigate = useNavigate();
  const { setMode } = useProject();

  const choose = (mode: Mode, to: string) => {
    setMode(mode);
    navigate(to);
  };

  return (
    <div className={styles.wrap}>
      <h1 className={styles.brand}>최애네컷에 오신 걸 환영해요</h1>
      <p className={styles.tagline}>원하는 컷을 선택해 시작해보세요</p>

      <div className={styles.cards}>
        <button
          type="button"
          className={styles.card}
          onClick={() => choose('default', '/default')}
        >
          <div className={styles.iconRow}>
            <div className={styles.miniFrame} />
            <div className={styles.miniFrame} />
          </div>
          <span className={styles.title}>기본네컷</span>
          <span className={styles.titleEn}>DEFAULT CUT</span>
          <p className={styles.desc}>
            원하는 프레임을 골라 사진을 찍고
            <br />
            네컷을 완성해요.
          </p>
        </button>

        <button
          type="button"
          className={styles.card}
          onClick={() => choose('favorite', '/favorite')}
        >
          <div className={styles.favoriteGlow} />
          <div className={styles.iconRow}>
            <div className={`${styles.miniFrame} ${styles.miniFrameTall}`} />
            <div className={styles.miniFrame} />
          </div>
          <span className={styles.title}>최애네컷</span>
          <span className={styles.titleEn}>FAVORITE CUT</span>
          <p className={styles.desc}>
            원하는 사진으로 프레임을 만들고
            <br />
            함께 네컷을 찍어요.
          </p>
        </button>
      </div>
    </div>
  );
}
