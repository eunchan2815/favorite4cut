import { useNavigate } from 'react-router-dom';
import styles from './BackButton.module.css';

interface Props {
  to?: string;
  label?: string;
  /** When provided, replaces the default styles. Lets pages reuse their next-button class so the back/next buttons render identically. */
  className?: string;
}

export default function BackButton({ to = '/', label = '이전', className }: Props) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={className ?? styles.btn}
      onClick={() => navigate(to)}
    >
      ← {label}
    </button>
  );
}
