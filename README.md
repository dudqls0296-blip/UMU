# 오피스의 연금술사 — 제28회 졸업전시회 공식 홈페이지

인덕대학교 스마트경영·비서학과 제28회 졸업전시회 「오피스의 연금술사」(Human Intelligence × Artificial Intelligence) 홈페이지입니다.
스크롤하면 하나로 이어진 3D '연금술 오피스' 안을 카메라가 이동합니다.

## 구조

```
index.html        페이지 뼈대
css/style.css     디자인 시스템 · 레이아웃 · 반응형
js/data.js        ✏️ 모든 텍스트 · 작품 · 일정 (여기만 고치면 됩니다)
js/scene.js       3D 공간 (three.js)
js/main.js        스크롤 연동 · 작품 상세 · 메뉴 · 로딩
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

- `index.html`을 더블클릭해도 열립니다. 단, 이렇게 열면 브라우저 보안 정책 때문에 3D 공간 속 액자에는 실제 작품 이미지 대신 자동 썸네일이 보입니다. (목록·상세 팝업에는 실제 이미지가 보입니다.)
- 실제 배포 환경과 똑같이 보려면 로컬 서버로 여세요: VS Code **Live Server** 확장, 또는 이 폴더에서 `python -m http.server 8000` 후 `http://localhost:8000`.

## GitHub Pages 배포

저장소 **Settings → Pages → Branch: main / (root)** 선택 후 저장. 1–2분 뒤 `https://<계정>.github.io/<저장소>/`에서 열립니다.

## 기술 메모

- three.js 0.160 (importmap) · GSAP 3.12.5 + ScrollTrigger · Lenis 1.1.13 — 모두 CDN, 버전 고정
- 저사양·모바일 자동 감지: 블룸/유리 굴절 끔, 입자 수 감소, 첫 3초 FPS를 재서 해상도 자동 조정
- WebGL이 안 되거나 CDN이 막혀도 콘텐츠는 모두 보이며, 배경은 CSS 연성진으로 대체됩니다
- `prefers-reduced-motion` 설정 시 애니메이션 최소화, 키보드 탐색·포커스 표시·모달 포커스 트랩 지원
