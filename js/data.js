/* ==========================================================================
   졸업전시회 콘텐츠 데이터 — 사이트의 모든 텍스트·작품·일정은 여기서 수정합니다.
   --------------------------------------------------------------------------
   · HTML/CSS/JS를 건드리지 않고 이 파일만 고치면 사이트 전체에 반영됩니다.
   · [샘플] / [확인 필요] 표시는 실제 자료를 받으면 교체해야 하는 임시 내용입니다.
   · 문자열은 따옴표("") 안에, 항목 사이 쉼표(,)는 지우지 마세요.
   · 줄바꿈이 필요한 문장은 \n 을 넣으면 화면에서도 줄이 바뀝니다.
   ========================================================================== */

window.EXHIBITION = {
  /* ── 기본 정보 (요청서 기준) ─────────────────────────────── */
  university: "인덕대학교",
  department: "스마트경영·비서학과",
  departmentEn: "Dept. of Smart Business & Secretarial Studies",
  edition: "제28회 졸업전시회",
  editionShort: "28th Graduation Exhibition",
  title: "오피스의 연금술사",
  titleEn: "The Alchemist of the Office",
  subtitle: "Human Intelligence × Artificial Intelligence",

  /* ── 공간 여정(섹션)의 이름 ───────────────────────────────
     연금술의 '대작업(Magnum Opus)' 6단계를 따라 공간을 이동합니다.
     nav: 상단 메뉴에 표시될 이름 / stage: 오른쪽 진행 표시에 쓰이는 라틴어 단계명 */
  stages: [
    { id: "hero",       nav: "메인",       stage: "Prima Materia", glyph: "🜍" },
    { id: "concept",    nav: "기획 의도",  stage: "Nigredo",       glyph: "☉" },
    { id: "department", nav: "학과 소개",  stage: "Albedo",        glyph: "☽" },
    { id: "works",      nav: "전시 구성",  stage: "Citrinitas",    glyph: "🜔" },
    { id: "schedule",   nav: "일정·장소",  stage: "Rubedo",        glyph: "🜂" },
    { id: "location",   nav: "오시는 길",  stage: "Lapis",         glyph: "🜃" }
  ],

  /* ── 메인 ────────────────────────────────────────────── */
  hero: {
    // [샘플] 메인 소개 문구
    tagline: "평범한 업무를 가치로 바꾸는 사람들.\n인간의 지혜와 AI의 기술로 미래의 오피스를 연성합니다.",
    cta: "전시 둘러보기"
  },

  /* ── 전시 주제 및 기획 의도 ──────────────────────────────── */
  concept: {
    heading: "평범한 업무를\n가치로 연성하다",
    // [샘플] 기획 의도 본문 — 학과에서 받은 소개 텍스트로 교체하세요.
    paragraphs: [
      "연금술사는 평범한 금속을 금으로 바꾸고자 했던 중세의 탐구자들입니다. 오늘의 오피스에서 그 일을 하는 사람은 정보를 가치로, 반복되는 업무를 혁신으로 바꾸는 이들입니다.",
      "제28회 졸업전시회 「오피스의 연금술사」는 사람의 판단력·공감·창의성과 인공지능의 속도·분석력이 만날 때 생겨나는 새로운 일의 방식을 보여 줍니다."
    ],
    pillars: [
      { symbol: "☉", title: "Human Intelligence",      ko: "인간의 지혜",  text: "[샘플] 사람만이 가진 판단력, 공감, 커뮤니케이션 역량" },
      { symbol: "×", title: "Transmutation",           ko: "연성",        text: "[샘플] 두 지능이 만나 업무의 가치를 새롭게 바꾸는 과정" },
      { symbol: "☿", title: "Artificial Intelligence", ko: "인공지능",    text: "[샘플] 데이터와 자동화로 넓어지는 스마트 오피스의 가능성" }
    ]
  },

  /* ── 학과 소개 ────────────────────────────────────────── */
  department_info: {
    heading: "미래 오피스를 설계하는\n스마트 비즈니스 전문가",
    // [샘플] 학과 소개 텍스트 — 공식 문구로 교체하세요.
    intro: "스마트경영·비서학과는 경영 실무와 비서 전문 역량에 디지털·AI 활용 능력을 더해, 미래 오피스를 이끄는 스마트 비즈니스 전문가를 길러 냅니다.",
    highlights: [
      { label: "Smart Business",    ko: "스마트 경영",  text: "[샘플] 경영·사무 실무와 디지털 도구 활용 역량" },
      { label: "Executive Support", ko: "비서 실무",    text: "[샘플] 비서 실무, 의전, 비즈니스 커뮤니케이션" },
      { label: "AI Literacy",       ko: "AI 리터러시",  text: "[샘플] 생성형 AI와 데이터를 활용한 업무 혁신" }
    ],
    // [샘플] 숫자 정보 — 필요 없으면 빈 배열 [] 로 두면 숨겨집니다.
    facts: [
      { value: "28", label: "번째 졸업전시" },
      { value: "6",  label: "개의 졸업 작품" },
      { value: "4",  label: "개의 전시 구성" }
    ]
  },

  /* ── 졸업 전시 구성 ───────────────────────────────────── */
  // 필터 버튼 목록. 작품의 category 값과 글자까지 정확히 같아야 합니다.
  categories: [
    // [샘플] 실제 전시 구성명으로 교체하세요.
    "AI 업무 혁신",
    "스마트 오피스",
    "비즈니스 기획",
    "콘텐츠·브랜딩"
  ],

  works: [
    /* 작품 1개 = 아래 { ... } 블록 1개. 복사해서 붙여 넣으면 작품이 추가됩니다.
       · id      : 영문/숫자로 된 고유값 (공유 링크 주소에 쓰입니다: 사이트주소#work-w01)
       · image   : 대표 이미지 경로 (예: "assets/works/w01.jpg"). 비워 두면 자동 썸네일이 나옵니다.
       · gallery : 상세 팝업의 추가 이미지 경로 목록 (선택)
       · video   : 유튜브 등 영상 링크 (선택)                                        */
    {
      id: "w01",
      title: "[샘플] AI 비서 업무 자동화 시스템",
      team: "Team Aurum",
      members: ["홍길동", "김인덕", "이스마트"],
      category: "AI 업무 혁신",
      summary: "일정·메일·회의록을 AI로 한곳에서 관리하는 차세대 비서 업무 플랫폼",
      description: "작품 상세 설명이 들어가는 자리입니다. 기획 배경, 문제 정의, 해결 방법, 기대 효과 등을 자유롭게 작성하세요.\n\n문단을 나누려면 이렇게 줄바꿈을 두 번 넣으면 됩니다.",
      image: "",
      gallery: [],
      video: ""
    },
    {
      id: "w02",
      title: "[샘플] 스마트 회의실 예약 & 의전 가이드",
      team: "Team Mercury",
      members: ["박비서", "최경영"],
      category: "스마트 오피스",
      summary: "IoT 기반 회의실 관리와 VIP 의전 매뉴얼을 결합한 오피스 솔루션",
      description: "작품 상세 설명이 들어가는 자리입니다.",
      image: "",
      gallery: [],
      video: ""
    },
    {
      id: "w03",
      title: "[샘플] 데이터로 읽는 MZ 직장 문화",
      team: "Team Sulfur",
      members: ["정데이터", "강분석", "윤인사"],
      category: "비즈니스 기획",
      summary: "설문·데이터 분석으로 미래 오피스의 조직문화를 제안",
      description: "작품 상세 설명이 들어가는 자리입니다.",
      image: "",
      gallery: [],
      video: ""
    },
    {
      id: "w04",
      title: "[샘플] 생성형 AI 브랜드 아이덴티티",
      team: "Team Salt",
      members: ["한브랜드", "오디자인"],
      category: "콘텐츠·브랜딩",
      summary: "AI와 협업해 완성한 가상 기업의 브랜드 아이덴티티와 홍보 콘텐츠",
      description: "작품 상세 설명이 들어가는 자리입니다.",
      image: "",
      gallery: [],
      video: ""
    },
    {
      id: "w05",
      title: "[샘플] 챗봇 기반 고객 응대 매뉴얼",
      team: "Team Elixir",
      members: ["서고객", "임응대", "조친절"],
      category: "AI 업무 혁신",
      summary: "비서 실무 응대 노하우를 학습한 고객 응대 챗봇 프로토타입",
      description: "작품 상세 설명이 들어가는 자리입니다.",
      image: "",
      gallery: [],
      video: ""
    },
    {
      id: "w06",
      title: "[샘플] 페이퍼리스 오피스 전환 컨설팅",
      team: "Team Quintessence",
      members: ["신혁신", "문전략"],
      category: "스마트 오피스",
      summary: "중소기업을 위한 디지털 문서 관리 체계 도입 전략",
      description: "작품 상세 설명이 들어가는 자리입니다.",
      image: "",
      gallery: [],
      video: ""
    }
  ],

  /* ── 전시 일정 및 장소 ────────────────────────────────── */
  schedule: {
    heading: "전시 일정 및 장소",
    // [샘플] 화면에 보이는 일정 문구
    period: "2026. 00. 00 (요일) – 00. 00 (요일)",
    hours: "10:00 – 17:00",
    venue: "인덕대학교 ○○관 ○층 ○○홀",
    admission: "무료 관람",
    // 날짜가 확정되면 아래 두 값을 "2026-12-01" 형식으로 넣으세요.
    // 값이 있으면 '내 캘린더에 추가' 버튼이 자동으로 나타납니다.
    startDate: "",
    endDate: "",
    events: [
      { date: "00. 00", time: "14:00", title: "[샘플] 오프닝 세리머니" },
      { date: "00. 00", time: "15:00", title: "[샘플] 작품 시연 및 도슨트 투어" },
      { date: "00. 00", time: "16:00", title: "[샘플] 시상식 및 폐막" }
    ]
  },

  /* ── 오시는 길 ────────────────────────────────────────── */
  location: {
    heading: "오시는 길",
    // ⚠️ 주소·교통편은 학교 공식 안내와 반드시 대조한 뒤 사용하세요.
    address: "서울특별시 노원구 초안산로 12 인덕대학교",
    mapQuery: "인덕대학교",
    transit: [
      { type: "지하철", text: "[확인 필요] 가까운 역과 출구 정보를 입력하세요." },
      { type: "버스",   text: "[확인 필요] 정류장과 노선 정보를 입력하세요." },
      { type: "자가용", text: "[확인 필요] 주차 가능 여부와 안내를 입력하세요." }
    ]
  },

  /* ── 푸터 ─────────────────────────────────────────────── */
  footer: {
    contact: "[샘플] 문의 smartsec@induk.ac.kr",
    instagram: "",   // 예: "https://instagram.com/계정" (비워 두면 숨김)
    copyright: "© 2026 Induk University, Dept. of Smart Business & Secretarial Studies."
  }
};
