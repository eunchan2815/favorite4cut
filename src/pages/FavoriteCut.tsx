import BackButton from '../components/BackButton';

export default function FavoriteCut() {
  return (
    <div style={{ minHeight: '100vh', padding: '40px 32px', background: '#fafafb' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ marginBottom: 18 }}>
          <BackButton to="/" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>최애컷</h1>
        <p style={{ color: '#6b6b6b', marginTop: 6 }}>
          원하는 사진으로 프레임을 만들고 함께 찍는 모드입니다. (구현 예정)
        </p>
      </div>
    </div>
  );
}
