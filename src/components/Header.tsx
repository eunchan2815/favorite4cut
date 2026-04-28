import { Link } from 'react-router-dom';
import ModeToggle from './ModeToggle';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <span className={styles.logo}>최애네컷</span>
        <span className={styles.brandSub}>FavoriteCut</span>
      </Link>
      <ModeToggle />
    </header>
  );
}
