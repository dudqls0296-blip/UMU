# 오피스의 연금술사 — 제28회 졸업전시회 공식 홈페이지

인덕대학교 스마트경영·비서학과 제28회 졸업전시회 「오피스의 연금술사」(Human Intelligence × Artificial Intelligence) 홈페이지입니다.
벨벳 커튼이 열리는 인트로와 함께 시네마틱 에디토리얼 레이아웃으로 전시를 소개합니다.

## 구조

```
index.html        페이지 뼈대
css/style.css     디자인 시스템 · 레이아웃 · 반응형
js/data.js        ✏️ 모든 텍스트 · 작품 · 일정 (여기만 고치면 됩니다)
js/scene.js       3D 집무실 공간 (두 번째 섹션부터)
js/hero3d.js      (사용 안 함) 첫 화면 3D 버전
assets/images/    사진 에셋
js/main.js        모션 · 작품 상세 · 메뉴 · 인트로
assets/           파비콘, 공유 이미지, 작품 이미지(assets/works/)
```

빌드 과정이 없습니다. 파일을 그대로 서버(GitHub Pages 등)에 올리면 됩니다.

## 내용 수정

`js/data.js`를 열어 `[샘플]`, `[확인 필요]` 표시가 있는 항목을 실제 내용으로 바꾸세요.

- **작품 추가**: `works` 안의 `{ ... }` 블록 하나를 복사해 붙여 넣고 내용 수정. `id`는 겹치지 않게.
- **작품 이미지**: `assets/works/`에 이미지를 넣고 `image: "assets/works/w01.jpg"`처럼 경로 입력. 가로 1600px 내외의 JPG/WebP 권장 (4:3 비율이 가장 잘 맞습니다).
- **전시 구성(필터)**: `categories` 목록과 각 작품의 `category` 값이 글자까지 같아야 합니다.
- **캘린더 버튼**: `schedule.startDate` / `endDate`에 `"2026-12-01"` 형식으로 날짜를 넣으면 '내 캘린더에 추가' 버튼이 나타납니다.
- **작품 공유 링크**: `사이트주소/#work-w01` 형태로 공유하면 해당 작품 상세가 바로 열립니다.

## 미리보기

- `index.html`을 더블클릭해도 열립니다.
- 실제 배포 환경과 똑같이 보려면 로컬 서버로 여세요: VS Code **Live Server** 확장, 또는 이 폴더에서 `python -m http.server 8000` 후 `http://localhost:8000`.

## GitHub Pages 배포

저장소 **Settings → Pages → Branch: main / (root)** 선택 후 저장. 1–2분 뒤 `https://<계정>.github.io/<저장소>/`에서 열립니다.

## 디자인 시스템 — Luxury Editorial × Cinematic Exhibition

- 색: Deep Burgundy `#4A101C` · Obsidian `#171315` · Champagne Gold `#D6B58A`(얇은 선·번호에만) · Warm Ivory `#E8DED3` · Smoked Glass `rgba(35,28,29,.65)`
- 글꼴: Cormorant Garamond(영문 대형 타이틀) · Noto Serif KR(국문 제목) · Pretendard(본문·캡션)
- 섹션마다 다른 레이아웃: ABOUT(대형 이미지+에디토리얼) · DEPARTMENT(텍스트+세로 이미지+숫자 스트립) · GALLERY(비대칭 작품 그리드) · SCHEDULE(벨벳 위 유리 보드) · VISIT(브론즈 프레임 지도)
- 색·글꼴·속도 값은 `css/style.css` 맨 위 `:root` 변수에서 한 번에 바꿀 수 있습니다.
- 첫 화면의 큰 영문 타이틀과 한 줄 메시지는 `js/data.js`의 `brand`에서 수정합니다.

## 이미지

`assets/images/` — 컨셉아트를 같은 톤(브론즈 하이라이트·버건디 섀도)으로 보정해 사용 중입니다. 실제 학과 사진으로 바꿀 때는 **같은 파일명으로 덮어쓰기**만 하면 됩니다.

| 파일 | 위치 | 권장 비율 |
|---|---|---|
| hero-atelier.jpg | 첫 화면 오른쪽 | 세로 4:5, 가로 1400px 이상 |
| about-office.jpg | 기획 의도(두 번째 화면) 집무실 사진 | 세로 약 5:6 |
| about-resume.jpg | ABOUT | 세로 4:5 |
| department-press.jpg | DEPARTMENT | 세로 3:4 |
| gallery-frames.jpg | GALLERY 머리 | 가로 약 6:5 |
| velvet.jpg | 커튼 질감(인트로·첫 화면·일정) | 세로, 좌우 반복 |

## 3D 집무실 — "The Executive Suite" (`js/scene.js`)

첫 화면은 사진(`hero-atelier.jpg`) 그대로이고, 두 번째 섹션부터 화면 뒤에 3D 공간이 깔립니다. 스크롤하면 카메라가 6개 지점을 차례로 이동하고, 각 섹션 내용은 그 위에 떠 있는 스모크드 글라스 패널로 보입니다.

| 지점 | 섹션 | 오브제 | 패널 위치 |
|---|---|---|---|
| 0 | 메인 | 입구 벨벳 커튼 · INDUK 배너 (사진 뒤) | — |
| 1 | 기획 의도 | (집무실 사진 섹션이 덮음 — 3D는 학과 소개부터 보임) | 왼쪽 |
| 2 | 학과 소개 | 대리석 데스크 · 램프 · 노트북 · 가죽 의자 · 유리 선반 · 배너 | 오른쪽 |
| 3 | 전시 구성 | 골드 액자 갤러리 (액자 클릭 → 작품 상세) | 아래 |
| 4 | 일정 | 골드 벽시계 · 유리 모래시계 | 왼쪽 |
| 5 | 오시는 길 | 대리석 지도 테이블 · 버건디 핀 | 오른쪽 |

- 공간 전체: 블랙 대리석 반사 바닥, 곡선 천장 조명, 노을 진 캠퍼스(시계탑)가 보이는 유리창, 벨벳 커튼, 빛 스트링
- 카메라 위치는 `scene.js` 맨 위 `STATIONS`에서 조정합니다.
- 관람 방식(데스크톱·3D): 섹션 하나가 화면 한 장입니다. 휠·←/→·↑/↓·스페이스·빈 곳 클릭·아래 `Next` 버튼으로 다음 장면으로 넘어가며, 카메라가 다음 구도로 한 번에 비행해 자리 잡습니다. 내용이 긴 장면(작품 목록 등)은 그 안에서 스크롤되고, 끝에 닿은 뒤 한 번 더 내리면 다음 장면으로 갑니다. 조정은 `main.js`의 `deckGo`(전환)와 `css/style.css`의 '화면 전환 모드' 블록에서 합니다.
- 모바일·태블릿 세로 화면이나 3D가 꺼진 환경에서는 일반 스크롤 페이지로 보이며, 스크롤을 멈추면 가까운 섹션 구도로 자동으로 맞춰집니다(`scheduleAutoFrame`).
- WebGL이 안 되거나 3D 로딩에 실패하면 3D 없이 기존 이미지 레이아웃(About·Department 사진, 벨벳 배경)으로 표시됩니다.
- 첫 화면 3D 버전(`js/hero3d.js`)은 파일만 남겨 두었습니다. `index.html`의 `scene.js` 줄 위 주석을 참고하세요.

## 기술 메모

- three.js 0.160 (importmap) · GSAP 3.12.5 + ScrollTrigger · Lenis 1.1.13 — CDN, 버전 고정
- 모바일에서는 패럴랙스 이동량을 줄이고 대형 타이틀 가로 이동을 끕니다
- CDN이 막혀도 콘텐츠는 모두 보입니다(모션만 생략)
- `prefers-reduced-motion` 설정 시 애니메이션 최소화, 키보드 탐색·포커스 표시·모달 포커스 트랩 지원
