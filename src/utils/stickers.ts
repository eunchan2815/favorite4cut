export type StickerCategory =
  | 'character'
  | 'pokemon'
  | 'demonslayer'
  | 'people'
  | 'newjeans'
  | 'other';

export interface StickerDef {
  id: string;
  name: string;
  /** Public-relative image URL */
  image: string;
  category: StickerCategory;
}

const def = (n: number, category: StickerCategory): StickerDef => ({
  id: `s${n}`,
  name: `스티커 ${n}`,
  image: `/sticker${n}.png`,
  category,
});

const njDef = (n: number): StickerDef => ({
  id: `nj${n}`,
  name: `뉴진스 ${n}`,
  image: `/jeans${n}.png`,
  category: 'newjeans',
});

const poDef = (n: number): StickerDef => ({
  id: `po${n}`,
  name: `포켓몬 ${n}`,
  image: `/po${n}.png`,
  category: 'pokemon',
});

const kalDef = (n: number): StickerDef => ({
  id: `kal${n}`,
  name: `귀칼 ${n}`,
  image: `/kal${n}.png`,
  category: 'demonslayer',
});

const makDef = (n: number): StickerDef => ({
  id: `mak${n}`,
  name: `mak ${n}`,
  image: `/mak${n}.png`,
  category: 'character',
});

export const STICKER_LIB: StickerDef[] = [
  // 캐릭터 — mak를 맨 앞에
  makDef(1),
  makDef(2),
  def(1, 'character'),  // 크리퍼
  def(3, 'character'),  // 라이트닝 맥퀸
  def(5, 'character'),  // 레고
  def(13, 'character'), // 로블록스 댑
  def(8, 'character'),  // 햄스터
  // MLP
  def(6, 'character'),  // 핑키파이
  def(9, 'character'),  // 레인보우 대시
  // Tom & Jerry
  def(7, 'character'),  // 톰과 제리
  def(12, 'character'), // 제리
  // 스폰지밥
  def(14, 'character'), // 스폰지밥 & 패트릭
  def(21, 'character'), // 스폰지밥
  def(37, 'character'), // 꽃 스폰지밥
  // 심슨
  def(40, 'character'), // 넬슨
  def(46, 'character'), // 리사 심슨
  // 클래시 로얄
  def(42, 'character'), // 고블린
  def(47, 'character'), // 돼지 기사
  // 단독
  def(17, 'character'), // 외계인
  def(20, 'character'), // 칠가이
  def(22, 'character'), // 헬로키티
  def(23, 'character'), // 제이크
  def(27, 'character'), // 파스칼
  def(28, 'character'), // 올라프
  def(32, 'character'), // 페페
  def(48, 'character'), // 신규
  def(49, 'character'), // 신규

  // 포켓몬스터
  def(16, 'pokemon'),  // 피카츄
  poDef(1),
  poDef(2),
  poDef(3),
  poDef(4),
  poDef(5),

  // 귀멸의칼날
  def(15, 'demonslayer'), // 젠이츠
  def(19, 'demonslayer'), // 무이치로
  kalDef(1),
  kalDef(2),
  kalDef(3),
  kalDef(4),

  // 사람 — 실제 인물
  def(11, 'people'),  // 윌 스미스
  def(26, 'people'),  // 메시
  def(30, 'people'),  // 크리스 프랫
  def(31, 'people'),  // 톰 홀랜드
  def(35, 'people'),  // 디카프리오
  // Friends 시리즈
  def(36, 'people'),  // Friends 1
  def(44, 'people'),  // Friends 할로윈
  def(45, 'people'),  // Friends 캐스트

  // 뉴진스
  njDef(1),
  njDef(2),
  njDef(3),
  njDef(4),
  njDef(5),
  njDef(6),
  njDef(7),

  // 기타 — 텍스트, 심볼, 이모지, 오브젝트
  def(2, 'other'),   // 404 Error
  def(34, 'other'),  // Restart Your Life
  def(43, 'other'),  // +1UP
  def(24, 'other'),  // +999 AURA
  def(18, 'other'),  // SUPER GAY
  def(10, 'other'),  // ZZZ
  def(25, 'other'),  // 인스타 알림
  def(4, 'other'),   // 하트 손
  def(33, 'other'),  // PLAY 하트
  def(29, 'other'),  // 왕관
  def(39, 'other'),  // Volume UI
  def(41, 'other'),  // 헤드폰
];

export const CATEGORY_ORDER: StickerCategory[] = [
  'character',
  'pokemon',
  'demonslayer',
  'people',
  'newjeans',
  'other',
];

export const CATEGORY_LABELS: Record<StickerCategory, string> = {
  character: '캐릭터',
  pokemon: '포켓몬스터',
  demonslayer: '귀멸의칼날',
  people: '사람',
  newjeans: '뉴진스',
  other: '기타',
};

export function getSticker(id: string): StickerDef | undefined {
  // 사용자가 업로드한 커스텀 스티커 (id 자체가 data URL)
  if (id.startsWith('data:image/')) {
    return { id, name: '내 스티커', image: id, category: 'other' };
  }
  return STICKER_LIB.find((s) => s.id === id);
}
