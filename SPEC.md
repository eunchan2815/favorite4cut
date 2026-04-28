# 위시컷 (WishCut) 명세서

## 1. 프로젝트 개요

### 1.1 프로젝트명
**위시컷 (WishCut)**

### 1.2 한 줄 소개
일반 네컷 사진과 원하는 인물과 함께 찍는 합성 네컷 사진을 모두 만들 수 있는 웹 포토부스 서비스

### 1.3 진입 동작
- 사이트 접속 시 **기본 모드는 "default cut"** (일반 포토부스, 인생네컷 느낌)
- 상단 토글로 **"wishcut"** (원하는 인물과 합성하는 모드)로 전환

### 1.4 핵심 가치
- **접근성**: 설치 없이 브라우저만으로 이용
- **자유도**: 좋아하는 인물(연예인, 캐릭터 등)과 함께 찍는 듯한 네컷 제작
- **간편함**: 클릭/드래그 위주의 직관적 UI

### 1.5 타겟 사용자
- 10~30대 셀카·포토부스 문화에 친숙한 사용자
- "최애"와 함께 사진을 찍고 싶은 팬덤 사용자
- 친구들과 가볍게 합성 네컷을 즐기고 싶은 사용자

---

## 2. 기술 스택

| 구분 | 기술 |
|------|------|
| 프레임워크 | React 18 |
| 빌드 도구 | Vite |
| 언어 | JavaScript (또는 TypeScript, 추후 결정) |
| 라우팅 | React Router |
| 상태 관리 | React Context / Zustand (필요 시) |
| 이미지 합성 | HTML5 Canvas API |
| 카메라 | `getUserMedia` (MediaDevices API) |
| 스타일 | CSS Modules 또는 Tailwind CSS |
| 배포 | Vercel / Netlify (정적 호스팅) |

> **처리 방식**: 모든 이미지 처리는 **클라이언트(브라우저)** 에서 수행. 서버 비용 0원.

---

## 3. 화면 구성 (라우트)

```
/                  → default cut (기본 진입, 일반 포토부스)
/capture           → 촬영/업로드 (현재 모드 기준)
/edit              → 편집
/result            → 결과/저장

/wish              → wishcut (원하는 인물과 합성)
/wish/upload       → 내 사진 + 함께 찍을 인물 업로드
/wish/compose      → 합성 (위치/크기/회전/투명도)
/wish/edit         → 필터/스티커/텍스트
/wish/result       → 결과/저장
```

상단에는 항상 **default cut / wishcut** 모드 토글 노출.

---

## 4. 기능 명세

### 4.1 공통 기능

#### 4.1.1 모드 선택 (메인)
- "기본 네컷" / "위시 네컷" 두 카드 노출
- 각 모드 짧은 설명과 예시 이미지 제공
- 클릭 시 해당 모드 진입

#### 4.1.2 프레임 선택 (컷 수 + 방향)
스크린샷 예시 기반 — 흰색 카드 위에 슬롯들 + 한쪽 여백에 캡션 텍스트("소중한 순간, 영원히") 들어가는 인생네컷 스타일.

지원 프레임 종류:

| 컷 수 | 방향 | 슬롯 배치 | 캡션 위치 |
|------|------|----------|----------|
| **2컷** | 세로 | 1열 × 2행 | 하단 가로 |
| 2컷 | 가로 | 2열 × 1행 | 우측 세로 |
| **3컷** | 세로 | 1열 × 3행 | 하단 가로 |
| 3컷 | 가로 | 3열 × 1행 | 우측 세로 |
| **4컷** | 세로 (스트립) | 1열 × 4행 | 하단 가로 |
| 4컷 | 가로 (스트립) | 4열 × 1행 | 우측 세로 |
| 4컷 | 정사각 | 2열 × 2행 | 하단 가로 |
| **6컷** | 세로 | 2열 × 3행 | 하단 가로 |
| 6컷 | 가로 | 3열 × 2행 | 하단 가로 |

공통 시각 사양:
- 카드 배경: **흰색**, 모서리에 옅은 그림자
- 슬롯: 옅은 회색 placeholder, 동일한 비율, 일정한 gap
- 캡션 기본 문구: `소중한 순간, 영원히` (사용자가 수정 가능)
- 캡션 폰트: 작은 sans-serif, 회색 톤
- 가로형 프레임의 우측 캡션은 **세로쓰기** (글자 한 자씩 세로 배치)

프레임 스타일(색상/패턴) 다양화는 추후 단계에서 추가.

#### 4.1.3 편집
- 필터: 원본, 흑백, 세피아, 비비드, 쿨톤, 웜톤
- 슬라이더: 밝기, 대비, 채도
- 스티커: 미리 준비된 PNG 자산 (하트, 별, 이모지 등)
- 텍스트: 위치/색상/폰트 사이즈 조절

#### 4.1.4 결과/저장
- 최종 합성된 네컷 이미지 미리보기
- PNG 다운로드 (Canvas → `toBlob` → 파일 저장)
- 공유: Web Share API (지원 브라우저), 또는 링크 복사

---

### 4.2 기본 네컷

#### 4.2.1 사진 입력 (4장)
- **촬영**: `getUserMedia`로 카메라 스트림 → 캔버스 캡처
  - 3초 카운트다운 옵션
  - 자동 연속 촬영 모드 (카운트다운 후 자동 4장)
- **업로드**: 파일 선택 또는 드래그 앤 드롭
- 각 슬롯별 재촬영/교체 가능

#### 4.2.2 자동 배치
- 선택된 프레임에 4장 자동 배치
- 슬롯 간 순서 변경 (드래그로 swap)

---

### 4.3 위시 네컷 ⭐ (핵심)

#### 4.3.1 사진 입력
- **사용자 사진**: 4장 (촬영 또는 업로드)
- **인물 이미지**: 함께 찍고 싶은 인물 사진 1장 (업로드)
  - 권장: 배경이 투명한 PNG 또는 단순한 배경
  - (추후 옵션) 배경 자동 제거 — `@imgly/background-removal` 같은 클라이언트 라이브러리 검토

#### 4.3.2 합성 컨트롤
각 슬롯(4컷)마다 인물 이미지를 개별적으로 배치:
- **위치 이동**: 드래그
- **크기 조절**: 핸들 드래그 또는 슬라이더 (0.2x ~ 3x)
- **회전**: 회전 핸들 또는 슬라이더 (-180° ~ 180°)
- **투명도**: 슬라이더 (0% ~ 100%)
- **좌우 반전**: 토글 버튼
- **레이어 순서**: 앞/뒤 (사용자 사진 위/아래)

#### 4.3.3 합성 렌더링
- 각 슬롯을 `<canvas>`로 렌더링
- 사용자 사진 → 인물 이미지(변환 적용) 순으로 그리기
- 최종 저장 시 모든 슬롯을 하나의 큰 캔버스에 결합

---

## 5. 데이터 구조 (초안)

```ts
type Mode = 'default' | 'wish';

type FrameLayout =
  | '2-vertical'   | '2-horizontal'
  | '3-vertical'   | '3-horizontal'
  | '4-vertical'   | '4-horizontal' | '4-square'
  | '6-vertical'   | '6-horizontal';

type FrameStyle = {
  id: string;
  name: string;
  background: string; // color or image url
  padding: number;
  gap: number;
  caption: string;            // 기본 "소중한 순간, 영원히"
  captionPosition: 'bottom' | 'right'; // right는 세로쓰기
};

type Slot = {
  index: number;       // 0..N-1, 컷 수에 따라 달라짐
  userPhoto: string | null; // dataURL
  wishPerson?: {
    src: string;        // dataURL
    x: number;          // 0~1 (정규화 좌표)
    y: number;
    scale: number;
    rotation: number;   // degree
    opacity: number;    // 0~1
    flipped: boolean;
    onTop: boolean;
  };
  filters: {
    preset: 'original' | 'bw' | 'sepia' | 'vivid' | 'cool' | 'warm';
    brightness: number; // -100 ~ 100
    contrast: number;
    saturation: number;
  };
  stickers: Sticker[];
  texts: TextItem[];
};

type Project = {
  mode: Mode;
  layout: FrameLayout;
  style: FrameStyle;
  slots: Slot[]; // 길이는 layout의 컷 수와 동일 (2/3/4/6)
};
```

---

## 6. 폴더 구조 (제안)

```
wishcut/
├─ public/
│  ├─ stickers/       # 스티커 PNG
│  └─ frames/         # 프레임 배경 자산
├─ src/
│  ├─ pages/
│  │  ├─ Home.jsx
│  │  ├─ basic/
│  │  └─ wish/
│  ├─ components/
│  │  ├─ Camera.jsx           # getUserMedia
│  │  ├─ PhotoSlot.jsx        # 단일 슬롯
│  │  ├─ FramePreview.jsx     # 4컷 합성 미리보기
│  │  ├─ ComposeCanvas.jsx    # 위시 네컷 합성 (드래그/회전/스케일)
│  │  ├─ FilterPanel.jsx
│  │  ├─ StickerPicker.jsx
│  │  └─ TextEditor.jsx
│  ├─ hooks/
│  │  ├─ useCamera.js
│  │  ├─ useDragTransform.js
│  │  └─ useCanvasExport.js
│  ├─ store/                  # 전역 상태 (Project)
│  ├─ utils/
│  │  ├─ canvas.js            # 합성/필터 유틸
│  │  └─ download.js
│  ├─ App.jsx
│  └─ main.jsx
├─ index.html
├─ vite.config.js
└─ package.json
```

---

## 7. 사용자 플로우

### 7.1 기본 네컷
```
메인 → "기본 네컷" 선택
 → 프레임/레이아웃 선택
 → 4장 촬영 또는 업로드
 → 필터/편집
 → 미리보기
 → 다운로드 / 공유
```

### 7.2 위시 네컷
```
메인 → "위시 네컷" 선택
 → 프레임/레이아웃 선택
 → 내 사진 4장 입력
 → 함께 찍을 인물 이미지 업로드
 → 슬롯별로 인물 위치/크기/회전/투명도 조절
 → 필터/스티커/텍스트
 → 미리보기
 → 다운로드 / 공유
```

---

## 8. 비기능 요구사항

| 항목 | 요구 |
|------|------|
| 반응형 | 모바일 우선, 데스크톱 대응 |
| 브라우저 지원 | 최신 Chrome/Safari/Edge (카메라 권한 필요) |
| 성능 | 합성 렌더링 < 1s (1080×1920 기준) |
| 개인정보 | 모든 이미지 클라이언트 처리, 서버 전송 없음 |
| 접근성 | 키보드 포커스 가능한 컨트롤 |

---

## 9. 개발 단계 (마일스톤)

| 단계 | 내용 | 산출물 |
|------|------|--------|
| **M1** | 프로젝트 셋업 (Vite + React + Router) | 라우팅된 빈 페이지들 |
| **M2** | 기본 네컷 — 업로드만 / 4컷 캔버스 합성 / PNG 저장 | "최소 동작" 기본 네컷 |
| **M3** | 카메라 촬영 (`getUserMedia`) + 카운트다운 | 촬영 가능한 기본 네컷 |
| **M4** | 위시 네컷 — 인물 이미지 드래그/스케일/회전/투명도 | 핵심 기능 동작 |
| **M5** | 필터 / 스티커 / 텍스트 | 편집 기능 완성 |
| **M6** | 프레임/스타일 다양화 + 공유 | v1.0 |
| **M7 (선택)** | 배경 자동 제거 (클라이언트 ML) | v1.1 |

---

## 10. 추후 확장 아이디어
- 인물 이미지 **배경 자동 제거** (클라이언트 ML 모델)
- 갤러리 / 작품 저장 (localStorage 또는 IndexedDB)
- QR 코드로 모바일 결과물 전송
- 움직이는 GIF 네컷
- 친구와 실시간 동시 편집 (먼 미래)

---

## 11. 결정 필요 사항 (다음 단계에서 정하기)

1. **언어**: JavaScript vs TypeScript
2. **스타일**: CSS Modules vs Tailwind
3. **상태 관리**: Context로 충분 vs Zustand 도입
4. **프레임/스티커 디자인**: 직접 제작 vs 무료 에셋 사용
5. **첫 배포 타겟**: Vercel vs Netlify vs GitHub Pages
