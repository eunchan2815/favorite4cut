import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>페이지를 찾을 수 없어요</h1>
        <p className={styles.desc}>
          주소가 잘못되었거나 페이지가 사라졌을 수 있어요.
          <br />
          홈으로 돌아가서 다시 시작해주세요.
        </p>

        <div className={styles.frame}>
          <div className={styles.slot} />
          <div className={styles.slot} />
          <div className={styles.slot} />
          <div className={`${styles.slot} ${styles.slotEmpty}`}>?</div>
        </div>

        <Link to="/" className={styles.homeBtn}>
          홈으로 돌아가기 →
        </Link>
      </div>
    </div>
  );
}
