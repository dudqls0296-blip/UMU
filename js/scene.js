/* ==========================================================================
   AlchemyScene — "The Executive Suite"
   --------------------------------------------------------------------------
   처음 사이트의 3D 공간 구조(스크롤 → 카메라가 6개 지점을 이동)를 그대로 두고,
   디자인만 '다크 럭셔리 오피스'로 바꾼 버전입니다.
     0 Prima Materia  메인        입구 — 벨벳 커튼 · INDUK 배너 (히어로 사진 뒤에 위치)
     1 Nigredo        기획 의도   가죽 책 위의 크리스털 구 · 골드 구 · 유리 리본
     2 Albedo         학과 소개   대리석 이그제큐티브 데스크 · 램프 · 노트북 · 가죽 의자 · 배너 · 유리 선반
     3 Citrinitas     전시 구성   골드 액자 갤러리 (클릭 → 작품 상세)
     4 Rubedo         일정·장소   골드 벽시계 · 유리 모래시계
     5 Lapis          오시는 길   블랙 대리석 지도 테이블 · 버건디 유리 핀
   공간 전체: 블랙 대리석 반사 바닥, 곡선 천장 조명, 노을 진 캠퍼스가 보이는 유리창,
             벨벳 커튼, 빛 스트링, 금빛 먼지, 블룸
   --------------------------------------------------------------------------
   · 공개 API(create → setStation/jump/setPointer/resize/pick/hover/highlight)는 동일합니다.
   · 저사양/모바일: 반사·그림자·블룸·유리 굴절을 끄고 가벼운 재질로 대체합니다.
   ========================================================================== */
(function () {
  "use strict";

  const STATIONS = [
    { cam: [0, 2.0, 9],        look: [0, 1.6, 0],       obj: [0, 1.6, 0] },
    { cam: [3.0, 1.95, -5.4],  look: [4.6, 1.4, -10],   obj: [6.2, 1.3, -10] },
    { cam: [-3.0, 2.2, -16.0], look: [-4.6, 1.15, -20.5], obj: [-6.2, 1.0, -20.5] },
    { cam: [0, 3.0, -21.0],    look: [0, 2.7, -33],     obj: [0, 2.8, -33] },
    { cam: [1.3, 2.4, -38.6],  look: [4.2, 1.9, -45],   obj: [6.8, 1.9, -45] },
    { cam: [-1.5, 3.6, -51.2], look: [-4.1, 1.0, -57],  obj: [-6.4, 1.0, -57] }
  ];

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const dwell = (s) => {
    const i = Math.floor(s), f = s - i, d = 0.18;
    return i + (f < d ? 0 : f > 1 - d ? 1 : smooth((f - d) / (1 - 2 * d)));
  };
  function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function canvas2d(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
  const SERIF = `"Cormorant Garamond", "Noto Serif KR", Georgia, serif`;
  const KSERIF = `"Noto Serif KR", "Nanum Myeongjo", serif`;

  async function create(canvas, options) {
    const opts = Object.assign({ lowPower: false, reducedMotion: false, works: [], onProgress: () => {} }, options);
    const report = (p) => { try { opts.onProgress(p); } catch (_) {} };
    const HQ = !opts.lowPower;

    const THREE = await import("three");
    report(0.3);
    const [{ RoundedBoxGeometry }, refl, post] = await Promise.all([
      import("three/addons/geometries/RoundedBoxGeometry.js"),
      HQ ? import("three/addons/objects/Reflector.js") : Promise.resolve(null),
      HQ ? Promise.all([
        import("three/addons/postprocessing/EffectComposer.js"),
        import("three/addons/postprocessing/RenderPass.js"),
        import("three/addons/postprocessing/UnrealBloomPass.js"),
        import("three/addons/postprocessing/OutputPass.js")
      ]) : Promise.resolve(null)
    ]);
    report(0.5);
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);

    /* ---------- Renderer ---------- */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !HQ, powerPreference: "high-performance" });
    let dpr = Math.min(window.devicePixelRatio || 1, HQ ? 1.5 : 1.25);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    if (HQ) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x100b0d);
    scene.fog = new THREE.FogExp2(0x140c0f, 0.024);
    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 160);

    /* ---------- 환경광: 따뜻한 소프트박스 + 노을빛 창 + 버건디 커튼 ---------- */
    (function () {
      const env = new THREE.Scene();
      env.background = new THREE.Color(0x070405);
      const panel = (w, h, color, k, pos, look) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(...pos); m.lookAt(...look); env.add(m);
      };
      panel(8, 1.2, 0xffe0c0, 3.5, [0, 7, 0], [0, 0, 0]);
      panel(3, 7, 0xd8a6b4, 1.1, [8, 2, 0], [0, 2, 0]);      // 노을 창
      panel(3, 7, 0x6a1424, 0.9, [-8, 2, 0], [0, 2, 0]);     // 커튼
      for (let i = 0; i < 7; i++) panel(0.08, 6, 0xffcf96, 4, [-6 + i * 2, 2, -8], [-6 + i * 2, 2, 0]);
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(env, 0.02).texture;
      pm.dispose();
    })();

    /* ---------- 공용 텍스처 ---------- */
    const glowTex = (function () {
      const [c, g] = canvas2d(128, 128);
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.12, "rgba(255,240,215,0.9)");
      grd.addColorStop(0.35, "rgba(255,205,150,0.22)"); grd.addColorStop(1, "rgba(255,200,140,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    function marbleTex(base, vein, seed, size) {
      const [c, g] = canvas2d(size, size);
      g.fillStyle = base; g.fillRect(0, 0, size, size);
      const rnd = seeded(seed);
      for (let i = 0; i < 46; i++) {
        g.strokeStyle = vein.replace("A", (0.04 + rnd() * 0.12).toFixed(3)); g.lineWidth = 0.6 + rnd() * 2.4;
        g.beginPath(); let x = rnd() * size, y = rnd() * size; g.moveTo(x, y);
        for (let k = 0; k < 7; k++) { x += (rnd() - 0.35) * size * 0.22; y += (rnd() - 0.5) * size * 0.16; g.lineTo(x, y); }
        g.stroke();
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
      return t;
    }
    const canvasTex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

    /* ---------- Materials ---------- */
    const blackMarble = marbleTex("#0c0a0a", "rgba(205,180,152,A)", 3, 1024);
    const warmStone = marbleTex("#1f1a18", "rgba(218,195,168,A)", 17, 512);
    const walnutTex = (function () {
      const [c, g] = canvas2d(512, 512);
      g.fillStyle = "#1c1310"; g.fillRect(0, 0, 512, 512);
      const r = seeded(77);
      for (let i = 0; i < 180; i++) {
        g.fillStyle = `rgba(${38 + (r() * 20 | 0)},${24 + (r() * 14 | 0)},${18 + (r() * 10 | 0)},${(0.08 + r() * 0.14).toFixed(2)})`;
        g.fillRect(0, r() * 512, 512, 1 + r() * 4);
      }
      return canvasTex(c);
    })();
    const rugTex = (function () {
      const [c, g] = canvas2d(512, 512);
      g.fillStyle = "#161213"; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = "rgba(214,181,138,0.28)"; g.lineWidth = 3; g.strokeRect(18, 18, 476, 476);
      g.strokeStyle = "rgba(214,181,138,0.12)"; g.lineWidth = 1; g.strokeRect(28, 28, 456, 456);
      return canvasTex(c);
    })();
    const M = {
      velvet: new THREE.MeshPhysicalMaterial({ color: 0x320810, roughness: 0.85, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xb63550), envMapIntensity: 0.3, side: THREE.DoubleSide }),
      gold: new THREE.MeshStandardMaterial({ color: 0xd8b47c, metalness: 1, roughness: 0.2, envMapIntensity: 1.35 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xb08d5e, metalness: 0.96, roughness: 0.32, envMapIntensity: 1.15 }),
      bronze: new THREE.MeshStandardMaterial({ color: 0x3a2d26, metalness: 0.88, roughness: 0.36, envMapIntensity: 0.9 }),
      walnut: new THREE.MeshPhysicalMaterial({ map: walnutTex, color: 0xffffff, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35, envMapIntensity: 0.75 }),
      travertine: new THREE.MeshStandardMaterial({ map: warmStone, roughness: 0.55, metalness: 0.08, envMapIntensity: 0.6 }),
      rug: new THREE.MeshStandardMaterial({ map: rugTex, roughness: 0.92, metalness: 0.02 }),
      marble: new THREE.MeshPhysicalMaterial({ map: blackMarble, color: 0xffffff, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 }),
      lacquer: new THREE.MeshPhysicalMaterial({ color: 0x0c0a0a, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1 }),
      leather: new THREE.MeshPhysicalMaterial({ color: 0x171110, roughness: 0.44, clearcoat: 0.45, clearcoatRoughness: 0.38, sheen: 0.35, sheenColor: new THREE.Color(0x523e38), envMapIntensity: 0.85 }),
      leatherRed: new THREE.MeshPhysicalMaterial({ color: 0x3d0d16, roughness: 0.46, clearcoat: 0.4, clearcoatRoughness: 0.38, envMapIntensity: 0.75 }),
      wall: new THREE.MeshStandardMaterial({ color: 0x151110, roughness: 0.72, metalness: 0.08 }),
      paper: new THREE.MeshStandardMaterial({ color: 0xe6ddd0, roughness: 0.88 }),
      glass: HQ
        ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, transmission: 1, thickness: 1.1, ior: 1.52, envMapIntensity: 1.7, specularIntensity: 1 })
        : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.22, envMapIntensity: 2, clearcoat: 1, depthWrite: false }),
      shelfGlass: new THREE.MeshPhysicalMaterial({ color: 0x2a2124, roughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 1.6, clearcoat: 1, depthWrite: false }),
      pane: new THREE.MeshPhysicalMaterial({ color: 0x1e1619, roughness: 0.03, metalness: 0.25, transparent: true, opacity: 0.16, envMapIntensity: 1.7, depthWrite: false }),
      glow: (k, c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c || 0xffcf96).multiplyScalar(k), toneMapped: false }),
      line: (k, o) => new THREE.LineBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.56).multiplyScalar(k), transparent: true, opacity: o == null ? 1 : o, toneMapped: false, depthWrite: false })
    };
    const shadow = (m, c = true, r = true) => { if (HQ) { m.castShadow = c; m.receiveShadow = r; } return m; };
    function spark(size, k) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, 1.25, 0.85).multiplyScalar(k || 1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      s.scale.set(size, size, 1); return s;
    }
    const lineFrom = (pts, mat) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);

    const animators = []; // (t, dt, near)
    const world = new THREE.Group();
    scene.add(world);

    /* ======================================================================
       공간 — 건축 기둥 · 코퍼 천장 · 우드 슬랫 벽체 · 통유리 커튼월 · 노을 캠퍼스
       ====================================================================== */
    let reflector = null;
    let archAnim = null;
    (function buildArchitecture() {
      // 블랙 대리석 바닥 (+ 데스크톱은 실제 반사)
      if (HQ && refl) {
        reflector = new refl.Reflector(new THREE.PlaneGeometry(23.3, 110), { textureWidth: Math.round(window.innerWidth * dpr * 0.45), textureHeight: Math.round(window.innerHeight * dpr * 0.45), color: 0x786d6f, clipBias: 0.003 });
        reflector.rotation.x = -Math.PI / 2; reflector.position.set(-0.15, -0.002, -28);
        world.add(reflector);
      }
      const ft = marbleTex("#0a0808", "rgba(185,162,145,A)", 9, 1024); ft.repeat.set(8, 22);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(23.3, 110), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.24, metalness: 0.14, transparent: HQ, opacity: HQ ? 0.86 : 1, envMapIntensity: 0.7 }));
      floor.rotation.x = -Math.PI / 2; floor.position.set(-0.15, 0, -28); floor.receiveShadow = HQ;
      world.add(floor);
      // 황동 인레이 줄눈
      const seams = [];
      for (let x = -12; x <= 12; x += 3) seams.push(new THREE.Vector3(x, 0.003, 26), new THREE.Vector3(x, 0.003, -82));
      for (let z = 26; z >= -82; z -= 5) seams.push(new THREE.Vector3(-12, 0.003, z), new THREE.Vector3(12, 0.003, z));
      world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seams), new THREE.LineBasicMaterial({ color: 0x564332, transparent: true, opacity: 0.38 })));

      // 천장 + 코퍼(Coffered) 간접조명 베이 + 건축 다운라이트
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 110), M.wall); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 7.2, -28); world.add(ceil);
      for (let z = 8; z >= -68; z -= 10) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(23.2, 0.26, 0.48), M.walnut); beam.position.set(0, 7.07, z); world.add(beam);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.014, 0.03), M.glow(1.65, 0xffdfb8)); strip.position.set(0, 6.94, z + 0.25); world.add(strip);
        [-5.2, 0, 5.2].forEach((x) => {
          const bezel = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 24), M.bronze); bezel.rotation.x = Math.PI / 2; bezel.position.set(x, 7.185, z - 5); world.add(bezel);
          const d = new THREE.Mesh(new THREE.CircleGeometry(0.08, 24), M.glow(2.6, 0xffe4c4)); d.rotation.x = Math.PI / 2; d.position.set(x, 7.18, z - 5); world.add(d);
        });
      }
      // 좌우 건축 기둥 열주 (10m 간격 베이)
      for (let z = 8; z >= -68; z -= 10) {
        [-11.0, 11.1].forEach((x, side) => {
          const col = new THREE.Group(); col.position.set(x, 0, z); world.add(col);
          const shaft = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.52, 7.0, 0.62), side === 0 ? M.walnut : M.marble)); shaft.position.y = 3.5; col.add(shaft);
          const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.28, 0.68), M.lacquer); plinth.position.y = 0.14; col.add(plinth);
          const baseRing = new THREE.Mesh(new THREE.BoxGeometry(0.59, 0.02, 0.69), M.brass); baseRing.position.y = 0.285; col.add(baseRing);
          const capRing = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.022, 0.66), M.brass); capRing.position.y = 6.92; col.add(capRing);
          const graze = new THREE.Mesh(new THREE.BoxGeometry(0.016, 6.4, 0.016), M.glow(1.3, 0xffdba8));
          graze.position.set(side === 0 ? 0.27 : -0.27, 3.6, 0); col.add(graze);
        });
      }

      // 오른쪽: 더블하이트 브론즈 멀리언 통유리 커튼월 + 외부 테라스 + 노을 스카이라인
      const winGroup = new THREE.Group(); world.add(winGroup);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(110, 7.2), M.pane); glass.rotation.y = -Math.PI / 2; glass.position.set(11.5, 3.6, -28); winGroup.add(glass);
      for (let z = 22; z >= -80; z -= 2.5) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 7.2, 0.06), M.bronze); m.position.set(11.46, 3.6, z); winGroup.add(m);
      }
      // 수평 트랜섬(창틀 가로바) & 하부 대리석 컨벡터 벤치
      [0.42, 2.55, 5.1, 7.05].forEach((y, i) => {
        const tr = new THREE.Mesh(new THREE.BoxGeometry(0.12, i === 0 ? 0.08 : 0.055, 110), i === 0 ? M.brass : M.bronze);
        tr.position.set(11.44, y, -28); winGroup.add(tr);
      });
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 110), M.marble); sill.position.set(11.22, 0.19, -28); winGroup.add(sill);

      // 창밖 테라스 바닥 & 유리 난간
      const terrace = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 110), M.travertine); terrace.rotation.x = -Math.PI / 2; terrace.position.set(14.3, -0.02, -28); world.add(terrace);
      const parapet = new THREE.Mesh(new THREE.PlaneGeometry(110, 1.15), M.pane); parapet.rotation.y = -Math.PI / 2; parapet.position.set(16.8, 0.56, -28); world.add(parapet);
      const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 110), M.bronze); railTop.position.set(16.8, 1.15, -28); world.add(railTop);
      const outside = new THREE.Mesh(new THREE.PlaneGeometry(110, 160), new THREE.MeshStandardMaterial({ color: 0x0b0809, roughness: 1 })); outside.rotation.x = -Math.PI / 2; outside.position.set(68, -1.2, -28); world.add(outside);

      // 이음매 없는 초대형 노을 하늘 돔 (상단 경계가 절대 보이지 않도록 높이 140m로 확장)
      const [sc, sg] = canvas2d(32, 512);
      const grd = sg.createLinearGradient(0, 0, 0, 512);
      grd.addColorStop(0.0, "#090609");
      grd.addColorStop(0.32, "#130d16");
      grd.addColorStop(0.56, "#2a1b28");
      grd.addColorStop(0.74, "#633c48");
      grd.addColorStop(0.86, "#a86e68");
      grd.addColorStop(0.93, "#c98e78");
      grd.addColorStop(1.0, "#1c1315");
      sg.fillStyle = grd; sg.fillRect(0, 0, 32, 512);
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(260, 140), new THREE.MeshBasicMaterial({ map: canvasTex(sc), fog: false, toneMapped: true }));
      sky.rotation.y = -Math.PI / 2; sky.position.set(82, 42, -28); world.add(sky);

      // 정교한 건축 커튼월 야경 텍스처 (미세한 수평 슬릿 창과 은은한 실내광)
      const [wc, wg] = canvas2d(512, 512);
      wg.fillStyle = "#110d0f"; wg.fillRect(0, 0, 512, 512);
      const rnd = seeded(41);
      for (let row = 0; row < 32; row++) {
        const y = 8 + row * 15;
        wg.fillStyle = "rgba(255,220,180,0.04)"; wg.fillRect(0, y - 1, 512, 1);
        for (let col = 0; col < 24; col++) {
          const x = 6 + col * 21;
          const lit = rnd();
          if (lit < 0.28) {
            const warm = 0.35 + rnd() * 0.55;
            wg.fillStyle = `rgba(${240},${192 + (rnd() * 30 | 0)},${135 + (rnd() * 35 | 0)},${warm.toFixed(2)})`;
            wg.fillRect(x, y, 15, 7);
          } else {
            wg.fillStyle = "rgba(38,30,34,0.65)";
            wg.fillRect(x, y, 15, 7);
          }
        }
      }
      const winTex = canvasTex(wc); winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
      const r2 = seeded(19);
      for (let i = 0; i < 36; i++) {
        const dist = 26 + r2() * 38;
        const w = 4.5 + r2() * 7.5, h = 5 + Math.pow(r2(), 1.4) * 20, d = 4.5 + r2() * 7;
        const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(1, Math.round(d / 6)), Math.max(1, Math.round(h / 7)));
        const bMat = new THREE.MeshStandardMaterial({ color: 0x130e10, roughness: 0.55, metalness: 0.3, emissive: 0xffdfb8, emissiveMap: t, emissiveIntensity: dist > 44 ? 0.28 : 0.46 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
        const bz = 20 - i * 3.1 - r2() * 1.5;
        m.position.set(dist, h / 2 - 1.2, bz); world.add(m);
        const crown = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.08, d + 0.12), M.glow(0.65, 0xffd6a6));
        crown.position.set(dist, h - 1.18, bz); world.add(crown);
      }
      // 캠퍼스 시계탑 랜드마크
      const tower = new THREE.Group(); tower.position.set(34, -1.2, -14); world.add(tower);
      [[3.6, 15, 0], [2.8, 4.2, 15], [2.1, 3.2, 19.2], [1.3, 2.4, 22.4]].forEach(([w, h, y], idx) => {
        const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(1, Math.max(1, Math.round(h / 6)));
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ color: 0x181214, roughness: 0.5, emissive: 0xffe0b8, emissiveMap: t, emissiveIntensity: idx === 1 ? 0.75 : 0.45 }));
        m.position.y = y + h / 2; tower.add(m);
        const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.12, w + 0.22), M.bronze); cornice.position.y = y + h; tower.add(cornice);
      });
      const dialGlow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), M.glow(1.5, 0xffe6c4));
      dialGlow.rotation.y = -Math.PI / 2; dialGlow.position.set(-1.42, 17.1, 0); tower.add(dialGlow);
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.75, 3.6, 4), M.bronze); spire.position.y = 26.6; spire.rotation.y = Math.PI / 4; tower.add(spire);

      // 왼쪽 벽: 다크 월넛 어쿠스틱 우드 슬랫 + 상하부 간접조명 + 대리석 걸레받이
      const lw = new THREE.Mesh(new THREE.PlaneGeometry(110, 7.2), M.walnut); lw.rotation.y = Math.PI / 2; lw.position.set(-11.6, 3.6, -28); world.add(lw);
      const baseboard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 110), M.marble); baseboard.position.set(-11.52, 0.13, -28); world.add(baseboard);
      const wallWashTop = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 110), M.glow(1.2, 0xffd8ac)); wallWashTop.position.set(-11.48, 7.08, -28); world.add(wallWashTop);
      for (let z = 22; z > -78; z -= 1.25) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 6.8, 0.18), M.lacquer); slat.position.set(-11.55, 3.65, z); world.add(slat);
      }

      // 은은한 공기 중 라이트 스트링 (과도한 점 노이즈를 줄이고 기둥 주변에만 절제되게 배치)
      const pts = [], seeds = [];
      const r3 = seeded(31);
      for (let s = 0; s < 18; s++) {
        const x = r3() < 0.5 ? -10.8 - r3() * 0.5 : 10.6 + r3() * 0.6, z = 8 - r3() * 72;
        for (let k = 0; k < 22; k++) { pts.push(x, 6.8 - k * 0.28, z); seeds.push(r3() * 100); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uMap: { value: glowTex }, uPR: { value: dpr } },
        vertexShader: `uniform float uTime; uniform float uPR; attribute float aSeed; varying float vA;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
            float tw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (0.6 + fract(aSeed) * 1.2) + aSeed), 2.0);
            vA = tw * 0.55 * smoothstep(38.0, 5.0, -mv.z); gl_PointSize = (6.0 + 6.0 * tw) * uPR * (4.5 / -mv.z); }`,
        fragmentShader: `uniform sampler2D uMap; varying float vA;
          void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.5, 1.15, 0.8) * c.rgb, c.a * vA); }`
      });
      const lights = new THREE.Points(geo, mat); lights.frustumCulled = false; world.add(lights);
      archAnim = (t) => { mat.uniforms.uTime.value = t; };
    })();

    /* 벨벳 커튼 (주름 · 타이백 — 바닥까지 자연스럽게 떨어지도록 보정) */
    function curtain(width, height, folds, o) {
      o = Object.assign({ tieV: 0.36, tie: 0.55, side: -1, seed: 1, depth: 0.08 }, o);
      const g = new THREE.PlaneGeometry(width, height, HQ ? 160 : 80, HQ ? 70 : 36);
      const p = g.attributes.position, rnd = seeded(o.seed), ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
      const pivot = o.side * width / 2;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), u = x / width + 0.5, v = y / height + 0.5;
        const pinch = o.tie * Math.exp(-Math.pow((v - o.tieV) / 0.16, 2)) + o.tie * 0.55 * (v < o.tieV ? smooth(clamp((o.tieV - v) / o.tieV, 0, 1)) : 0);
        const s = 1 - clamp(pinch, 0, 0.85);
        const amp = o.depth * (0.65 + 0.35 * (1 - v)) * (1 + 1.4 * (1 - s));
        let z = amp * (Math.sin(u * folds * 6.283 + ph[0]) * 0.7 + Math.sin(u * folds * 2.1 * 6.283 + ph[1]) * 0.22);
        p.setXYZ(i, pivot + (x - pivot) * s, y, z);
      }
      g.computeVertexNormals();
      return shadow(new THREE.Mesh(g, M.velvet), true, true);
    }
    // 왼쪽 벽 기둥 사이 벨벳 드레이퍼리 (바닥 y=0까지 완전히 닿도록 배치)
    [[-11.15, 3], [-11.15, -17], [-11.15, -37], [-11.15, -57]].forEach(([x, z], i) => {
      const c = curtain(2.8, 7.1, 7, { side: i % 2 ? 1 : -1, seed: 3 + i, tie: 0.32 });
      c.position.set(x, 3.55, z); c.rotation.y = Math.PI / 2; world.add(c);
    });

    /* INDUK 배너 (버건디 벨벳 + 골드 엠블럼 + 술) */
    function banner() {
      const g = new THREE.Group();
      const Wd = 1.15, Ht = 2.6;
      const [c, x] = canvas2d(512, 1160);
      x.fillStyle = "#3a0a14"; x.fillRect(0, 0, 512, 1160);
      const v = x.createLinearGradient(0, 0, 512, 0); v.addColorStop(0, "rgba(0,0,0,.35)"); v.addColorStop(0.5, "rgba(255,255,255,.04)"); v.addColorStop(1, "rgba(0,0,0,.35)");
      x.fillStyle = v; x.fillRect(0, 0, 512, 1160);
      x.fillStyle = "#d6b58a";
      [[196, 640, 26, 120], [243, 610, 26, 150], [290, 640, 26, 120]].forEach(([a, b, w, h]) => x.fillRect(a, b, w, h));
      x.fillRect(176, 770, 160, 8);
      x.textAlign = "center"; x.font = `500 50px ${SERIF}`;
      x.fillText("INDUK", 256, 860); x.fillText("UNIVERSITY", 256, 920);
      x.strokeStyle = "#d6b58a"; x.lineWidth = 3; x.strokeRect(36, 36, 440, 1088);
      const tex = canvasTex(c);
      const geo = new THREE.PlaneGeometry(Wd, Ht, 40, 60);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i), py = p.getY(i);
        let y = py;
        if (py < -Ht / 2 + 0.45) { const k = (-Ht / 2 + 0.45 - py) / 0.45; y = py + k * 0.45 * (Math.abs(px) / (Wd / 2)); } // 아래로 뾰족한 페넌트
        p.setXYZ(i, px, y, Math.sin(px * 9) * 0.015);
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.85, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xb63550), side: THREE.DoubleSide });
      const m = shadow(new THREE.Mesh(geo, mat), true, true); g.add(m);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, Wd + 0.3, 16), M.gold); rod.rotation.z = Math.PI / 2; rod.position.y = Ht / 2 + 0.02; g.add(rod);
      [-1, 1].forEach((s) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), M.gold); f.position.set(s * (Wd / 2 + 0.17), Ht / 2 + 0.02, 0); g.add(f); });
      // 술(프린지)
      const fr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 4), M.brass, 60);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < 60; i++) {
        const u = i / 59, px = -Wd / 2 + u * Wd, py = -Ht / 2 + 0.45 * (Math.abs(px) / (Wd / 2)) - 0.07;
        m4.makeTranslation(px, py, 0.005); fr.setMatrixAt(i, m4);
      }
      g.add(fr);
      return g;
    }

    /* 유리 리본 + 금빛 가장자리 */
    const ribbonMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.1, envMapIntensity: 2.2, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    function ribbon(points, width, twist) {
      const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
      const seg = 300, frames = curve.computeFrenetFrames(seg, false);
      const pos = [], idx = [], ea = [], eb = [];
      const p = new THREE.Vector3(), side = new THREE.Vector3();
      for (let i = 0; i <= seg; i++) {
        const u = i / seg; curve.getPointAt(u, p);
        const a = twist * u * Math.PI * 2;
        side.copy(frames.binormals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.normals[i], Math.sin(a)).normalize();
        const w = width * (0.35 + 0.65 * Math.sin(u * Math.PI));
        const A = p.clone().addScaledVector(side, w / 2), B = p.clone().addScaledVector(side, -w / 2);
        pos.push(A.x, A.y, A.z, B.x, B.y, B.z); ea.push(A); eb.push(B);
        if (i < seg) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const grp = new THREE.Group();
      grp.add(new THREE.Mesh(geo, ribbonMat));
      grp.add(lineFrom(ea, M.line(2.2, 0.9)));
      grp.add(lineFrom(eb, M.line(1.1, 0.5)));
      grp.userData.edge = ea;
      return grp;
    }
    function runnersOn(r, n, speed) {
      const arr = [];
      for (let k = 0; k < n; k++) { const s = spark(0.16 + (k % 2) * 0.08, 1.3); r.add(s); arr.push({ s, o: k / n }); }
      return (t) => arr.forEach((a) => { const e = r.userData.edge, u = (a.o + t * speed) % 1; a.s.position.copy(e[Math.floor(u * (e.length - 1))]); a.s.material.opacity = Math.sin(u * Math.PI); });
    }

    /* ======================================================================
       0 · 입구 — 커튼과 배너 (히어로 사진 뒤)
       ====================================================================== */
    (function buildEntrance() {
      const g = new THREE.Group(); world.add(g);
      const c1 = curtain(3.4, 6.4, 7, { side: -1, seed: 21, tie: 0.5 }); c1.position.set(-3.6, 3.2, -1.6); g.add(c1);
      const c2 = curtain(3.4, 6.4, 7, { side: 1, seed: 22, tie: 0.5 }); c2.position.set(3.6, 3.2, -1.6); g.add(c2);
      const b = banner(); b.position.set(0, 3.6, -2.4); g.add(b);
      const r = ribbon([new THREE.Vector3(-4, 0.4, 1), new THREE.Vector3(-1.5, 1.6, 2), new THREE.Vector3(1.8, 1.2, 1.2), new THREE.Vector3(4, 2.4, -0.5)], 0.22, 0.3);
      g.add(r);
      const run = runnersOn(r, 3, 0.03);
      animators.push((t, dt, near) => { if (near) run(t); });
    })();

    /* ======================================================================
       1 · 가죽 책 위의 크리스털 구 · 골드 구 (Human × AI)
       ====================================================================== */
    function spineTexture(title, color) {
      const [c, x] = canvas2d(1024, 128);
      x.fillStyle = color; x.fillRect(0, 0, 1024, 128);
      x.fillStyle = "rgba(214,181,138,0.9)"; x.fillRect(40, 18, 944, 3); x.fillRect(40, 107, 944, 3);
      x.font = `500 52px ${SERIF}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#d6b58a";
      x.fillText(title, 512, 66);
      return canvasTex(c);
    }
    (function buildCrystal() {
      const g = new THREE.Group(); g.position.set(6.2, 0, -10); g.rotation.y = -0.62; world.add(g);
      // 테일러드 울 러그 + 브라스 엣지
      const rug = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.014, 2.1, 2, 0.005), M.rug); rug.position.set(0, 0.007, -0.1); rug.receiveShadow = HQ; g.add(rug);
      const rugTrim = new THREE.Mesh(new THREE.BoxGeometry(2.92, 0.006, 2.12), M.brass); rugTrim.position.set(0, 0.003, -0.1); g.add(rugTrim);
      // 뒤쪽 건축적 로우 크레덴자 (공간적 배경감 부여)
      const cred = new THREE.Group(); cred.position.set(0.15, 0, -0.95); g.add(cred);
      const cBody = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.56, 0.48, 3, 0.015), M.walnut)); cBody.position.y = 0.34; cred.add(cBody);
      const cTop = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.44, 0.035, 0.5, 2, 0.008), M.travertine)); cTop.position.y = 0.635; cred.add(cTop);
      const cLed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.008, 0.01), M.glow(1.5, 0xffd8a8)); cLed.position.set(0, 0.06, 0.22); cred.add(cLed);
      [-1.0, 0, 1.0].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.42), M.brass); leg.position.set(lx, 0.03, 0); cred.add(leg);
      });
      const vase = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.28, 32), M.travertine)); vase.position.set(-0.82, 0.79, 0); cred.add(vase);
      const vaseRing = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.006, 12, 48), M.gold); vaseRing.rotation.x = Math.PI / 2; vaseRing.position.set(-0.82, 0.92, 0); cred.add(vaseRing);
      // 다단 네로 마르퀴나 대리석 뮤지엄 플린스
      const baseStep = shadow(new THREE.Mesh(new RoundedBoxGeometry(1.68, 0.08, 1.14, 3, 0.015), M.walnut)); baseStep.position.y = 0.04; g.add(baseStep);
      const baseBrass = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.02, 1.02), M.brass); baseBrass.position.y = 0.09; g.add(baseBrass);
      const plinth = shadow(new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.74, 1.0, 4, 0.02), M.marble)); plinth.position.y = 0.46; g.add(plinth);
      const frontInlay = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.48, 0.006), M.brass); frontInlay.position.set(0, 0.46, 0.502); g.add(frontInlay);
      const frontInner = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.44, 0.008), M.walnut); frontInner.position.set(0, 0.46, 0.503); g.add(frontInner);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(1.515, 0.014, 1.015), M.gold); lip.position.y = 0.832; g.add(lip);
      // 가죽 책 세 권
      const books = [["SECRETARIAL STUDIES", "#1a1112", 0.62, 0.1, 0.44, 0.0], ["HUMAN × ARTIFICIAL", "#3a0c14", 0.58, 0.085, 0.42, 0.08], ["THE ALCHEMIST", "#141011", 0.54, 0.075, 0.4, -0.06]];
      let y = 0.84;
      books.forEach(([title, col, w, h, d, rot]) => {
        const spine = new THREE.MeshPhysicalMaterial({ map: spineTexture(title, col), roughness: 0.48, clearcoat: 0.4 });
        const cover = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col), roughness: 0.52, clearcoat: 0.4 });
        const pages = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.88 });
        const b = shadow(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.008), [pages, pages, cover, cover, spine, pages]));
        b.position.set(-0.24, y + h / 2, 0.05); b.rotation.y = rot; g.add(b); y += h;
      });
      // 브라스 오비탈 크래들 + 크리스털 구 (Human × AI)
      const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 16, 64), M.brass);
      cradle.rotation.x = Math.PI / 2; cradle.position.set(-0.24, y + 0.014, 0.05); g.add(cradle);
      const orb = new THREE.Group(); orb.position.set(-0.24, y + 0.31, 0.05); g.add(orb);
      const crystalShellMat = new THREE.MeshPhysicalMaterial({ color: 0xfff0dc, roughness: 0.04, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.24, envMapIntensity: 2.2, depthWrite: false });
      orb.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 64, 48), crystalShellMat));
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 32, 24), M.glow(2.8, 0xffe2b8)); orb.add(core);
      const N = HQ ? 240 : 120, pos = new Float32Array(N * 3), ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) { const yy = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - yy * yy), th = ga * i; pos.set([Math.cos(th) * rr * 0.21, yy * 0.21, Math.sin(th) * rr * 0.21], i * 3); }
      const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const dots = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(2.2, 1.65, 1.05), size: 0.036, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      orb.add(dots);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.006, 12, 160), M.gold); ring.rotation.x = Math.PI / 2.3; orb.add(ring);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.004, 10, 128), M.brass); ring2.rotation.y = Math.PI / 3; ring2.rotation.x = 0.45; orb.add(ring2);
      orb.add(spark(0.85, 0.42));
      // 골드 구 (Human) + 브라스 링 받침
      const humanStand = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 14, 48), M.brass);
      humanStand.rotation.x = Math.PI / 2; humanStand.position.set(0.38, 0.85, -0.08); g.add(humanStand);
      const human = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.17, 64, 48), M.gold)); human.position.set(0.38, 0.84 + 0.17, -0.08); g.add(human);
      const pt = new THREE.PointLight(0xffd2a0, HQ ? 8 : 4.5, 5.5, 2); pt.position.set(0.0, 2.3, 0.9); g.add(pt);
      animators.push((t, dt, near) => {
        if (!near) return;
        orb.position.y = y + 0.31 + Math.sin(t * 0.8) * 0.018;
        dots.rotation.y = t * 0.22; ring.rotation.z = t * 0.18; ring2.rotation.y = -t * 0.14;
      });
    })();

    /* ======================================================================
       2 · 이그제큐티브 데스크 · 건축적 월넛 서재 월
       ====================================================================== */
    (function buildDesk() {
      const g = new THREE.Group(); g.position.set(-6.2, 0, -20.5); g.rotation.y = 0.63; world.add(g);
      // 데스크 존 테일러드 러그
      const rug = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.014, 3.0, 2, 0.005), M.rug); rug.position.set(-0.2, 0.007, -0.45); rug.receiveShadow = HQ; g.add(rug);
      const rugBorder = new THREE.Mesh(new THREE.BoxGeometry(4.22, 0.006, 3.02), M.brass); rugBorder.position.set(-0.2, 0.003, -0.45); g.add(rugBorder);
      // 곡선 대리석 상판 + 월넛 언더슬래브
      const shape = new THREE.Shape();
      shape.moveTo(-1.55, -0.56); shape.lineTo(1.22, -0.56); shape.absarc(1.22, 0.0, 0.56, -Math.PI / 2, Math.PI / 2, false); shape.lineTo(-1.55, 0.56); shape.lineTo(-1.55, -0.56);
      const topGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 48 });
      topGeo.rotateX(-Math.PI / 2);
      const top = shadow(new THREE.Mesh(topGeo, M.marble)); top.position.y = 0.745; g.add(top);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.012, 0.012), M.gold); edge.position.set(-0.16, 0.74, 0.57); g.add(edge);
      const base = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.35, 0.72, 0.82, 3, 0.02), M.walnut)); base.position.set(-0.2, 0.36, -0.05); g.add(base);
      const sidePed = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.72, 0.86, 3, 0.02), M.lacquer)); sidePed.position.set(-1.12, 0.36, -0.04); g.add(sidePed);
      const kick = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.01, 0.01), M.glow(1.5, 0xffd8a8)); kick.position.set(-0.2, 0.04, 0.37); g.add(kick);
      const Y = 0.81;
      // 가죽 데스크 블로터 (매트)
      const blotter = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.96, 0.008, 0.54, 2, 0.003), M.leather)); blotter.position.set(0.08, Y - 0.002, 0.04); g.add(blotter);
      const blotterTrim = new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.004, 0.55), M.brass); blotterTrim.position.set(0.08, Y - 0.004, 0.04); g.add(blotterTrim);
      // 노트북
      const lap = new THREE.Group(); lap.position.set(0.14, Y + 0.004, 0.05); lap.rotation.y = -0.22; g.add(lap);
      const alu = new THREE.MeshStandardMaterial({ color: 0x8e8a88, metalness: 1, roughness: 0.3 });
      const lb = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.014, 0.33, 2, 0.005), alu)); lb.position.y = 0.007; lap.add(lb);
      const lid = new THREE.Group(); lid.position.set(0, 0.014, -0.165); lid.rotation.x = -1.85 + Math.PI / 2; lap.add(lid);
      const ls = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.31, 0.01, 2, 0.005), alu)); ls.position.y = 0.155; lid.add(ls);
      const [sc, sx] = canvas2d(512, 340);
      const sg = sx.createLinearGradient(0, 0, 512, 340); sg.addColorStop(0, "#171114"); sg.addColorStop(1, "#3b232b");
      sx.fillStyle = sg; sx.fillRect(0, 0, 512, 340);
      sx.strokeStyle = "rgba(214,181,138,0.45)"; sx.lineWidth = 2; sx.strokeRect(20, 20, 472, 300);
      sx.fillStyle = "rgba(255,230,200,.9)"; sx.font = `italic 500 28px ${SERIF}`; sx.fillText("Executive Suite · Brief", 38, 66);
      sx.fillStyle = "rgba(214,181,138,.65)"; sx.fillRect(38, 86, 180, 2);
      sx.fillStyle = "rgba(255,255,255,.22)"; for (let i = 0; i < 5; i++) sx.fillRect(38, 114 + i * 28, 260 - (i % 3) * 45, 7);
      sx.fillStyle = "rgba(214,181,138,.22)"; sx.fillRect(330, 110, 136, 175);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.275), new THREE.MeshBasicMaterial({ map: canvasTex(sc), toneMapped: false })); screen.position.set(0, 0.155, 0.0056); lid.add(screen);
      // 아톨로 브라스 데스크 램프
      const lamp = new THREE.Group(); lamp.position.set(0.92, Y, -0.18); g.add(lamp);
      const lbase = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.04, 48), M.gold)); lbase.position.y = 0.02; lamp.add(lbase);
      const stem = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.48, 24), M.gold)); stem.position.y = 0.26; lamp.add(stem);
      const dome = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.24, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2.4), M.gold)); dome.position.y = 0.47; dome.scale.y = 0.58; lamp.add(dome);
      const diff = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), M.glow(2.8, 0xffe4c4)); diff.rotation.x = Math.PI / 2; diff.position.y = 0.475; lamp.add(diff);
      const lampLight = new THREE.SpotLight(0xffd8a8, HQ ? 14 : 8, 3.4, 1.1, 0.8, 2); lampLight.position.set(0, 0.46, 0); lampLight.target.position.set(-0.2, -0.5, 0.1); lamp.add(lampLight, lampLight.target);
      if (HQ) { lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.0005; }
      // 펜꽂이 + 만년필 + 브라스 트레이 · 크리스털 카라페
      const cup = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.11, 32, 1, true), M.glass)); cup.position.set(0.58, Y + 0.055, -0.25); g.add(cup);
      [[-0.01, 0.2], [0.012, -0.15], [0, 0.05]].forEach(([dx, tilt], i) => {
        const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.16, 12), i === 1 ? M.leatherRed : M.lacquer); pen.position.set(0.58 + dx, Y + 0.12, -0.25 + dx); pen.rotation.z = tilt; g.add(pen);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 12), M.gold); cap.position.set(0.58 + dx - Math.sin(tilt) * 0.08, Y + 0.2, -0.25 + dx); cap.rotation.z = tilt; g.add(cap);
      });
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 40), M.brass); tray.position.set(-0.55, Y + 0.005, -0.24); g.add(tray);
      const carafe = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.065, 0.19, 32), M.glass); carafe.position.set(-0.58, Y + 0.1, -0.25); g.add(carafe);
      const stopper = new THREE.Mesh(new THREE.SphereGeometry(0.026, 24, 16), M.gold); stopper.position.set(-0.58, Y + 0.21, -0.25); g.add(stopper);
      // 책 + 서류
      [["SECRETARIAL STUDIES", "#1a1112", 0.48, 0.055, 0.34], ["OFFICE MANAGEMENT", "#2a0a10", 0.44, 0.048, 0.32]].forEach(([t, c, w, h, d], i) => {
        const spine = new THREE.MeshPhysicalMaterial({ map: spineTexture(t, c), roughness: 0.5, clearcoat: 0.4 });
        const cover = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c), roughness: 0.55, clearcoat: 0.4 });
        const pages = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.9 });
        const b = shadow(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.006), [pages, pages, cover, cover, spine, pages]));
        b.position.set(-1.02, Y + h / 2 + i * 0.055, 0.12); b.rotation.y = 0.12 - i * 0.1; g.add(b);
      });
      const paper = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.004, 0.38), M.paper)); paper.position.set(-0.42, Y + 0.006, 0.16); paper.rotation.y = 0.18; g.add(paper);
      // 가죽 이그제큐티브 체어 (책상 뒤)
      const chair = new THREE.Group(); chair.position.set(-0.15, 0, -0.96); g.add(chair);
      const seat = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.12, 0.58, 4, 0.05), M.leather)); seat.position.y = 0.5; chair.add(seat);
      const back = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.88, 0.12, 4, 0.05), M.leather)); back.position.set(0, 1.01, -0.26); back.rotation.x = -0.1; chair.add(back);
      for (let i = 0; i < 5; i++) { const pad = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.006, 0.005), M.lacquer); pad.position.set(0, 0.72 + i * 0.14, -0.195 + i * 0.014); chair.add(pad); }
      [-1, 1].forEach((s) => { const arm = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.05, 0.46, 2, 0.02), M.leather)); arm.position.set(s * 0.34, 0.7, -0.02); chair.add(arm); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 12), M.brass); post.position.set(s * 0.34, 0.6, 0.0); chair.add(post); });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 16), M.brass); col.position.y = 0.24; chair.add(col);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.34), M.brass); leg.position.set(Math.sin(a) * 0.16, 0.04, Math.cos(a) * 0.16); leg.rotation.y = a; chair.add(leg); }
      // 뒤쪽 3베이 건축적 월넛 · 브라스 라이브러리 월 (뒤쪽 갤러리 시선 차폐 및 공간 완성도 강화)
      const lib = new THREE.Group(); lib.position.set(-0.25, 0, -2.35); g.add(lib);
      const backWall = shadow(new THREE.Mesh(new RoundedBoxGeometry(3.84, 3.5, 0.14, 2, 0.02), M.walnut)); backWall.position.set(0, 1.75, -0.18); lib.add(backWall);
      const lowerCab = shadow(new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.68, 0.46, 2, 0.015), M.marble)); lowerCab.position.set(0, 0.34, 0); lib.add(lowerCab);
      const cabTrim = new THREE.Mesh(new THREE.BoxGeometry(3.82, 0.016, 0.48), M.brass); cabTrim.position.set(0, 0.69, 0); lib.add(cabTrim);
      const bayX = [-1.85, -0.62, 0.62, 1.85];
      bayX.forEach((x) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, 2.75, 0.38), M.walnut); post.position.set(x, 2.06, 0); lib.add(post);
        const brassFace = new THREE.Mesh(new THREE.BoxGeometry(0.016, 2.75, 0.02), M.brass); brassFace.position.set(x, 2.06, 0.19); lib.add(brassFace);
      });
      const r5 = seeded(18);
      [1.22, 1.82, 2.42, 3.02].forEach((h) => {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(3.68, 0.024, 0.36), M.walnut); plate.position.y = h; lib.add(plate);
        const led = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.007, 0.008), M.glow(1.5, 0xffe0b5)); led.position.set(0, h - 0.015, 0.16); lib.add(led);
        [-1.23, 0, 1.23].forEach((bx, bi) => {
          let x = bx - 0.5;
          while (x < bx + 0.42) {
            if (r5() < 0.72) {
              const bw = 0.032 + r5() * 0.03, bh = 0.22 + r5() * 0.12;
              const mat = r5() < 0.28 ? M.leatherRed : r5() < 0.6 ? M.leather : M.travertine;
              const bk = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.22), mat);
              bk.position.set(x + bw / 2, h + 0.012 + bh / 2, -0.02); lib.add(bk);
              x += bw + 0.006;
            } else {
              const obj = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), (bi + (x * 10 | 0)) % 2 ? M.gold : M.travertine);
              obj.position.set(x + 0.09, h + 0.068, 0); lib.add(obj);
              x += 0.22;
            }
          }
        });
      });
      const pt = new THREE.PointLight(0xffcf98, HQ ? 4.5 : 2.2, 6, 2); pt.position.set(0.2, 2.4, 1.2); g.add(pt);
      animators.push(() => {});
    })();

    /* ======================================================================
       3 · 작품 액자 갤러리 (클릭 → 작품 상세)
       ====================================================================== */
    const frames = [];
    const textureLoader = new THREE.TextureLoader();
    let hoveredId = null;
    function artworkTexture(w, idx) {
      const W = 1024, H = 768, [c, g] = canvas2d(W, H);
      const pals = [
        ["#1a1014", "#381622", "#d8b47c"],
        ["#11151c", "#1f2b3a", "#d6b88e"],
        ["#181310", "#33241b", "#deb87c"],
        ["#161016", "#2f1929", "#d4b284"],
        ["#101615", "#1c2e2b", "#d6b58a"],
        ["#1b1112", "#421720", "#e2be88"]
      ];
      const [c0, c1, acc] = pals[idx % pals.length];
      const bg = g.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, c0); bg.addColorStop(1, c1);
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      // 은은한 방사형 조명광
      const rg = g.createRadialGradient(W * 0.68, H * 0.42, 20, W * 0.68, H * 0.42, W * 0.55);
      rg.addColorStop(0, "rgba(216,180,124,0.24)"); rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      // 건축적 프레임 보더라인
      g.strokeStyle = "rgba(216,180,124,0.42)"; g.lineWidth = 2; g.strokeRect(36, 36, W - 72, H - 72);
      g.strokeStyle = "rgba(216,180,124,0.16)"; g.lineWidth = 1; g.strokeRect(48, 48, W - 96, H - 96);
      // 우측 기하학 · 건축 다이어그램 아트워크
      g.save();
      g.translate(W * 0.68, H * 0.44);
      g.strokeStyle = "rgba(216,180,124,0.38)"; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, 170, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = "rgba(216,180,124,0.22)"; g.lineWidth = 1.2;
      g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0, 0, 210, -0.8, 1.4); g.stroke();
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + idx * 0.3;
        g.beginPath(); g.moveTo(Math.cos(a) * 115, Math.sin(a) * 115); g.lineTo(Math.cos(a) * 185, Math.sin(a) * 185); g.stroke();
      }
      g.strokeStyle = "rgba(216,180,124,0.48)"; g.lineWidth = 2.2;
      if (idx % 3 === 0) {
        g.strokeRect(-95, -95, 190, 190);
        g.save(); g.rotate(Math.PI / 4); g.strokeRect(-95, -95, 190, 190); g.restore();
      } else if (idx % 3 === 1) {
        for (let r = -2; r <= 2; r++) { g.beginPath(); g.arc(r * 34, 0, 88, 0, Math.PI * 2); g.stroke(); }
      } else {
        g.beginPath();
        for (let p = 0; p < 6; p++) { const a = (p / 6) * Math.PI * 2 - Math.PI / 2; p === 0 ? g.moveTo(Math.cos(a) * 135, Math.sin(a) * 135) : g.lineTo(Math.cos(a) * 135, Math.sin(a) * 135); }
        g.closePath(); g.stroke();
      }
      g.fillStyle = acc; g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fill();
      g.restore();
      // 좌측 에디토리얼 타이포그래피 플레이트
      const num = String(idx + 1).padStart(2, "0");
      g.fillStyle = "rgba(216,180,124,0.75)";
      g.font = `500 22px ${SERIF}`; g.fillText(`EXHIBITION PLATE · NO. ${num}`, 84, 108);
      g.fillStyle = "rgba(216,180,124,0.35)"; g.fillRect(84, 126, 280, 1.5);
      g.fillStyle = "rgba(216,180,124,0.22)";
      g.font = `italic 600 130px ${SERIF}`; g.fillText(num, 80, 270);
      const cat = String(w.categoryLabel || w.category || "PROJECT").toUpperCase();
      g.fillStyle = acc; g.font = `600 22px ${KSERIF}`; g.fillText(cat, 84, 360);
      g.fillStyle = "#f4ece1"; g.font = `600 44px ${KSERIF}`;
      const title = String(w.title || `작품 ${num}`);
      if (title.length > 12) {
        const mid = Math.ceil(title.length / 2);
        g.fillText(title.slice(0, mid), 84, 425);
        g.fillText(title.slice(mid), 84, 482);
      } else {
        g.fillText(title, 84, 435);
      }
      g.fillStyle = "rgba(232,220,204,0.78)"; g.font = `400 26px ${KSERIF}`;
      g.fillText(String(w.sub || w.team || "인덕대학교 스마트비즈니스비서학과"), 84, 555);
      g.fillStyle = "rgba(216,180,124,0.6)"; g.font = `italic 500 22px ${SERIF}`;
      g.fillText("Click to inspect archive →", 84, 665);
      return canvasTex(c);
    }
    (function buildGallery() {
      const g = new THREE.Group(); world.add(g);
      const center = new THREE.Vector3(0, 2.72, -23.6);
      // 뒤쪽 벨벳 커튼 아치
      for (let i = 0; i < 5; i++) {
        const a = -0.82 + i * 0.41;
        const c = curtain(4.2, 7, 8, { side: i % 2 ? 1 : -1, seed: 40 + i, tie: 0.0, depth: 0.1 });
        c.position.set(center.x + Math.sin(a) * 12.2, 3.5, center.z - Math.cos(a) * 12.2); c.lookAt(center.x, 3.5, center.z); g.add(c);
      }
      const works = opts.works || [];
      const n = works.length;
      if (!n) { animators.push(() => {}); return; }
      const perRow = Math.min(n, 7), rows = Math.ceil(n / perRow), R = 9.6;
      const FW = 1.84, FH = 1.38, MAT = 0.12, BORDER = 0.065;
      const outer = new THREE.Shape(), ox = FW / 2 + MAT + BORDER, oy = FH / 2 + MAT + BORDER, ix = FW / 2 + MAT, iy = FH / 2 + MAT;
      outer.moveTo(-ox, -oy); outer.lineTo(ox, -oy); outer.lineTo(ox, oy); outer.lineTo(-ox, oy); outer.closePath();
      const hole = new THREE.Path(); hole.moveTo(-ix, -iy); hole.lineTo(-ix, iy); hole.lineTo(ix, iy); hole.lineTo(ix, -iy); hole.closePath(); outer.holes.push(hole);
      const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 1 }); frameGeo.translate(0, 0, -0.04);
      const picGeo = new THREE.PlaneGeometry(FW, FH), matGeo = new THREE.PlaneGeometry(FW + MAT * 2, FH + MAT * 2);
      const matMat = new THREE.MeshStandardMaterial({ color: 0x181214, roughness: 0.85 });
      works.forEach((w, i) => {
        const row = Math.floor(i / perRow), inRow = row === rows - 1 ? n - row * perRow : perRow, col = i - row * perRow;
        const spread = Math.min(0.242 * (inRow - 1), 1.28);
        const a = inRow === 1 ? 0 : -spread / 2 + (col / (inRow - 1)) * spread;
        const y = 2.72 + (rows - 1) * 1.15 - row * 2.3;
        const px = center.x + Math.sin(a) * R, pz = center.z - Math.cos(a) * R;
        // 액자 뒤 건축적 갤러리 가벽 모놀리스 (액자가 허공에 떠 보이지 않도록 고정)
        if (row === 0) {
          const mono = new THREE.Group();
          mono.position.set(center.x + Math.sin(a) * (R + 0.14), 0, center.z - Math.cos(a) * (R + 0.14));
          mono.lookAt(center.x, 0, center.z);
          const mw = FW + 0.44, mh = rows > 1 ? 5.0 : 4.35;
          const panel = shadow(new THREE.Mesh(new RoundedBoxGeometry(mw, mh, 0.16, 2, 0.015), M.walnut));
          panel.position.y = mh / 2; mono.add(panel);
          const plinth = new THREE.Mesh(new THREE.BoxGeometry(mw + 0.06, 0.14, 0.22), M.marble);
          plinth.position.y = 0.07; mono.add(plinth);
          [-mw / 2 + 0.02, mw / 2 - 0.02].forEach((tx) => {
            const trim = new THREE.Mesh(new THREE.BoxGeometry(0.018, mh - 0.2, 0.17), M.brass);
            trim.position.set(tx, mh / 2, 0); mono.add(trim);
          });
          g.add(mono);
        }
        const fg = new THREE.Group();
        fg.position.set(px, y, pz);
        fg.lookAt(center.x, y, center.z);
        const frameMat = M.gold.clone(); frameMat.emissive = new THREE.Color(0x8d713e); frameMat.emissiveIntensity = 0;
        fg.add(shadow(new THREE.Mesh(frameGeo, frameMat), true, false));
        const mat = new THREE.Mesh(matGeo, matMat); mat.position.z = -0.012; fg.add(mat);
        const picMat = new THREE.MeshBasicMaterial({ map: artworkTexture(w, i), color: 0xf6efe6, toneMapped: false });
        const pic = new THREE.Mesh(picGeo, picMat); pic.position.z = 0.008; pic.userData.workId = w.id; fg.add(pic);
        const customImg = (w.image && !String(w.image).startsWith("data:image/svg")) ? w.image : (w.thumb && !String(w.thumb).startsWith("data:image/svg") ? w.thumb : null);
        if (customImg) textureLoader.load(customImg, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
          const iw = (tex.image && tex.image.width) || 1024, ih = (tex.image && tex.image.height) || 768;
          const ia = iw / ih, fa = FW / FH;
          if (ia > fa) { tex.repeat.set(fa / ia, 1); tex.offset.set((1 - fa / ia) / 2, 0); } else { tex.repeat.set(1, ia / fa); tex.offset.set(0, (1 - ia / fa) / 2); }
          picMat.map = tex; picMat.color.setScalar(0.92); picMat.needsUpdate = true;
        });
        // 액자 위 픽처 라이트
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.76, 16), M.gold); bar.rotation.z = Math.PI / 2; bar.position.set(0, oy + 0.14, 0.15); fg.add(bar);
        const bl = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.01, 0.02), M.glow(1.5, 0xffe2c0)); bl.position.set(0, oy + 0.12, 0.16); fg.add(bl);
        const halo = spark(3.6, 0.0); halo.position.z = -0.25; fg.add(halo);
        g.add(fg);
        frames.push({ group: fg, pic, frameMat, halo, id: w.id, hover: 0, baseY: y, phase: i * 0.7 });
      });
      const gl = new THREE.SpotLight(0xffe0bc, HQ ? 85 : 45, 22, 0.85, 0.85, 2); gl.position.set(0, 6.8, -25.5); gl.target.position.set(0, 2.5, -33); g.add(gl, gl.target);
      // 중앙 갤러리 벤치 + 트래버틴 & 브라스 플린스
      const bRug = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.014, 1.8, 2, 0.005), M.rug); bRug.position.set(0, 0.007, -30.2); bRug.receiveShadow = HQ; g.add(bRug);
      const bTrim = new THREE.Mesh(new THREE.BoxGeometry(4.22, 0.006, 1.82), M.brass); bTrim.position.set(0, 0.003, -30.2); g.add(bTrim);
      const bBase = shadow(new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.68), M.travertine)); bBase.position.set(0, 0.09, -30.2); g.add(bBase);
      const bench = shadow(new THREE.Mesh(new RoundedBoxGeometry(3.1, 0.26, 0.84, 3, 0.03), M.leather)); bench.position.set(0, 0.31, -30.2); g.add(bench);
      const bBrass = new THREE.Mesh(new THREE.BoxGeometry(3.12, 0.016, 0.85), M.brass); bBrass.position.set(0, 0.19, -30.2); g.add(bBrass);
      animators.push((t, dt, near) => {
        frames.forEach((f) => {
          const target = f.id === hoveredId ? 1 : 0;
          f.hover += (target - f.hover) * Math.min(1, dt * 10);
          if (near) f.group.position.y = f.baseY + Math.sin(t * 0.6 + f.phase) * 0.025 + f.hover * 0.08;
          f.group.scale.setScalar(1 + f.hover * 0.05);
          f.frameMat.emissiveIntensity = f.hover * 0.6;
          f.halo.material.opacity = f.hover * 0.35;
        });
      });
    })();

    /* ======================================================================
       4 · 골드 벽시계 · 유리 모래시계 · 건축적 피처 월
       ====================================================================== */
    function dialTexture() {
      const S = 1024, [c, g] = canvas2d(S, S);
      g.fillStyle = "#0d0a0b"; g.fillRect(0, 0, S, S);
      g.translate(S / 2, S / 2);
      g.strokeStyle = "rgba(214,181,138,0.22)"; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, S * 0.43, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0, 0, S * 0.28, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#d8b47c";
      for (let i = 0; i < 60; i++) { g.save(); g.rotate((i / 60) * Math.PI * 2); if (i % 5 === 0) g.fillRect(-3.5, -S * 0.46, 7, 42); else g.fillRect(-1.5, -S * 0.46, 3, 16); g.restore(); }
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = `500 ${S * 0.078}px ${SERIF}`;
      ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"].forEach((n, h) => { const a = (h / 12) * Math.PI * 2 - Math.PI / 2; g.fillText(n, Math.cos(a) * S * 0.34, Math.sin(a) * S * 0.34); });
      g.strokeStyle = "rgba(214,181,138,.5)"; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, S * 0.2, 0, Math.PI * 2); g.stroke();
      g.font = `italic 500 ${S * 0.036}px ${SERIF}`; g.fillText("Induk University", 0, -S * 0.09);
      g.font = `500 ${S * 0.024}px ${SERIF}`; g.fillStyle = "rgba(216,180,124,0.7)"; g.fillText("NOV 12 — 13 · 2026", 0, S * 0.12);
      return canvasTex(c);
    }
    (function buildClock() {
      const g = new THREE.Group(); g.position.set(6.8, 0, -45); g.rotation.y = -0.55; world.add(g);
      // 바닥 테일러드 러그
      const rug = new THREE.Mesh(new RoundedBoxGeometry(3.8, 0.014, 2.2, 2, 0.005), M.rug); rug.position.set(0, 0.007, 0.1); rug.receiveShadow = HQ; g.add(rug);
      const rugTrim = new THREE.Mesh(new THREE.BoxGeometry(3.82, 0.006, 2.22), M.brass); rugTrim.position.set(0, 0.003, 0.1); g.add(rugTrim);
      // 월넛 루버 + 북매치 대리석 건축 피처 월 + 수직 간접조명 코브
      const backWalnut = shadow(new THREE.Mesh(new RoundedBoxGeometry(3.7, 4.2, 0.12, 2, 0.02), M.walnut)); backWalnut.position.set(0, 2.1, -0.52); g.add(backWalnut);
      [-1.78, 1.78].forEach((x) => {
        const framePost = new THREE.Mesh(new THREE.BoxGeometry(0.05, 4.2, 0.18), M.brass); framePost.position.set(x, 2.1, -0.5); g.add(framePost);
      });
      [-1.42, 1.42].forEach((x) => {
        const cove = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3.7, 0.02), M.glow(2.0, 0xffd8a8)); cove.position.set(x, 2.0, -0.43); g.add(cove);
      });
      const wall = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.8, 3.8, 0.14, 3, 0.02), M.marble)); wall.position.set(0, 1.95, -0.4); g.add(wall);
      const wallTrim = new THREE.Mesh(new THREE.BoxGeometry(2.83, 3.83, 0.04), M.brass); wallTrim.position.set(0, 1.95, -0.44); g.add(wallTrim);
      // 크로노미터 벽시계
      const clock = new THREE.Group(); clock.position.set(0, 2.22, -0.3); g.add(clock);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.85, 128), new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.36, metalness: 0.22 })); face.position.z = 0.03; clock.add(face);
      const bezel = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.05, 24, 160), M.gold)); bezel.position.z = 0.04; clock.add(bezel);
      const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.012, 16, 128), M.brass); innerRing.position.z = 0.042; clock.add(innerRing);
      const glassC = new THREE.Mesh(new THREE.CircleGeometry(0.86, 96), M.pane); glassC.position.z = 0.08; clock.add(glassC);
      const hand = (len, w, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.008), mat); m.geometry.translate(0, len * 0.42, 0); m.position.z = z; clock.add(m); return m; };
      const hH = hand(0.45, 0.03, 0.05, M.gold), mH = hand(0.66, 0.02, 0.06, M.gold), sH = hand(0.72, 0.006, 0.07, new THREE.MeshStandardMaterial({ color: 0x8a1e30, roughness: 0.4 }));
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 24), M.gold); pin.rotation.x = Math.PI / 2; pin.position.z = 0.07; clock.add(pin);
      // 콘솔 크레덴자 + 모래시계 + 일정 오브제
      const credBody = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.5, 0.34, 0.56, 2, 0.015), M.walnut)); credBody.position.set(0, 0.7, 0.18); g.add(credBody);
      const console_ = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.06, 0.62, 3, 0.015), M.marble)); console_.position.set(0, 0.9, 0.18); g.add(console_);
      const cTrim = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.014, 0.63), M.gold); cTrim.position.set(0, 0.87, 0.18); g.add(cTrim);
      [-1.12, 1.12].forEach((x) => { const leg = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.88, 0.52), M.brass)); leg.position.set(x, 0.44, 0.18); g.add(leg); });
      const hg = new THREE.Group(); hg.position.set(-0.68, 0.93, 0.22); g.add(hg);
      const pts = []; for (let i = 0; i <= 32; i++) { const y = i / 32; pts.push(new THREE.Vector2(0.03 + Math.pow(Math.abs(Math.cos(y * Math.PI)), 1.5) * 0.12, y * 0.42)); }
      const hgGlass = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M.glass); hgGlass.position.y = 0.025; hg.add(hgGlass);
      const sand = new THREE.MeshStandardMaterial({ color: 0xd9b37a, roughness: 0.8, metalness: 0.2 });
      const sTop = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.11, 32), sand); sTop.rotation.x = Math.PI; sTop.position.y = 0.32; hg.add(sTop);
      const sBot = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.09, 32), sand); sBot.position.y = 0.07; hg.add(sBot);
      [0.012, 0.46].forEach((y) => { const d = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 40), M.gold)); d.position.y = y; hg.add(d); });
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 8), M.gold); p.position.set(Math.cos(a) * 0.135, 0.235, Math.sin(a) * 0.135); hg.add(p); }
      // 중앙 트래버틴 아카이브 블록 & 우측 골드 보울
      const calBase = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.04, 0.28, 2, 0.006), M.travertine)); calBase.position.set(0.02, 0.95, 0.2); g.add(calBase);
      const calBlock1 = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 0.14, 2, 0.008), M.brass)); calBlock1.position.set(-0.07, 1.04, 0.2); calBlock1.rotation.y = 0.15; g.add(calBlock1);
      const calBlock2 = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.14, 0.14, 2, 0.008), M.marble)); calBlock2.position.set(0.1, 1.04, 0.2); calBlock2.rotation.y = -0.12; g.add(calBlock2);
      const bowl = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.16, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.gold)); bowl.position.set(0.72, 1.09, 0.2); g.add(bowl);
      const pt = new THREE.PointLight(0xffd2a0, HQ ? 5.5 : 2.8, 6, 2); pt.position.set(-0.55, 3.25, 1.85); g.add(pt);
      animators.push((t, dt, near) => {
        if (!near) return;
        sH.rotation.z = -t * 0.6; mH.rotation.z = -t * 0.04 - 1.2; hH.rotation.z = -t * 0.004 - 2.4;
        const k = (t * 0.05) % 1; sTop.scale.setScalar(1 - k * 0.7); sBot.scale.setScalar(0.3 + k * 0.7);
      });
    })();

    /* ======================================================================
       5 · 건축 매스 모형(Maquette) 지도 테이블 · 버건디 유리 핀
       ====================================================================== */
    function mapTexture() {
      const S = 1024, [c, g] = canvas2d(S, S);
      g.fillStyle = "#0b0909"; g.fillRect(0, 0, S, S);
      const rnd = seeded(2026);
      for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(214,181,138,${0.03 + rnd() * 0.06})`; g.fillRect(rnd() * S, rnd() * S, 24 + rnd() * 70, 24 + rnd() * 70); }
      g.strokeStyle = "rgba(160,120,130,0.35)"; g.lineWidth = 24; g.lineCap = "round";
      g.beginPath(); g.moveTo(-20, 760); g.bezierCurveTo(260, 640, 420, 900, 700, 760); g.bezierCurveTo(860, 690, 940, 540, 1050, 520); g.stroke();
      g.strokeStyle = "rgba(214,181,138,0.75)"; g.lineWidth = 4;
      [[0, 300, 1024, 380], [380, 0, 460, 1024], [0, 560, 1024, 470], [700, 0, 620, 1024]].forEach(([a, b, x, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(x, d); g.stroke(); });
      g.strokeStyle = "rgba(214,181,138,0.3)"; g.lineWidth = 1.5;
      for (let i = 0; i < 20; i++) { g.beginPath(); const x = rnd() * S, y = rnd() * S; g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 500, y + (rnd() - 0.5) * 500); g.stroke(); }
      g.fillStyle = "rgba(122,34,51,0.45)"; g.strokeStyle = "#d6b58a"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(470, 400); g.lineTo(620, 390); g.lineTo(640, 520); g.lineTo(480, 545); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#e8ded3"; g.font = `500 34px ${KSERIF}`; g.textAlign = "center"; g.fillText("인덕대학교", 556, 600);
      g.fillStyle = "#d6b58a"; g.font = `italic 500 26px ${SERIF}`; g.fillText("Induk University", 556, 638);
      g.globalCompositeOperation = "destination-in"; g.beginPath(); g.arc(S / 2, S / 2, S * 0.5, 0, Math.PI * 2); g.fill();
      return canvasTex(c);
    }
    (function buildMapTable() {
      const g = new THREE.Group(); g.position.set(-6.4, 0, -57); world.add(g);
      // 바닥 원형 러그 플린스
      const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.85, 2.85, 0.014, 96), M.rug); rug.position.y = 0.007; rug.receiveShadow = HQ; g.add(rug);
      const rugRing = new THREE.Mesh(new THREE.TorusGeometry(2.86, 0.008, 12, 128), M.brass); rugRing.rotation.x = Math.PI / 2; rugRing.position.y = 0.008; g.add(rugRing);
      // 테이블 바디 · 대리석 상판 · 브라스 림
      const top = shadow(new THREE.Mesh(new THREE.CylinderGeometry(2.24, 2.24, 0.12, 128), M.marble)); top.position.y = 0.94; g.add(top);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.24, 0.02, 16, 200), M.gold); rim.rotation.x = Math.PI / 2; rim.position.y = 1.0; g.add(rim);
      const innerRim = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.012, 12, 160), M.brass); innerRim.rotation.x = Math.PI / 2; innerRim.position.y = 1.008; g.add(innerRim);
      const leg = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.85, 0.88, 64), M.walnut)); leg.position.y = 0.44; g.add(leg);
      const legBase = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.98, 0.06, 64), M.marble); legBase.position.y = 0.03; g.add(legBase);
      const legRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.014, 12, 96), M.gold); legRing.rotation.x = Math.PI / 2; legRing.position.y = 0.32; g.add(legRing);
      const map = new THREE.Mesh(new THREE.CircleGeometry(2.08, 128), new THREE.MeshStandardMaterial({ map: mapTexture(), roughness: 0.28, metalness: 0.4 }));
      map.rotation.x = -Math.PI / 2; map.position.y = 1.004; map.receiveShadow = HQ; g.add(map);
      const mapGlow = new THREE.Mesh(new THREE.CircleGeometry(2.08, 128), new THREE.MeshBasicMaterial({ map: map.material.map, transparent: true, opacity: 0.36, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      mapGlow.rotation.x = -Math.PI / 2; mapGlow.position.y = 1.006; g.add(mapGlow);
      // 3D 건축 캠퍼스 매스 모형 (인덕대학교 본관 · 은봉관 · 시계탑 및 주변 도시 블록)
      const maquette = new THREE.Group(); maquette.position.y = 1.006; g.add(maquette);
      const campusBlocks = [
        [0.18, -0.15, 0.32, 0.14, 0.18, 0.12, M.travertine], // 은봉관 (전시 장소)
        [0.02, -0.34, 0.26, 0.1, 0.14, -0.2, M.travertine],
        [0.38, -0.28, 0.22, 0.11, 0.15, 0.08, M.travertine],
        [0.1, 0.04, 0.05, 0.24, 0.05, 0, M.gold]             // 미니어처 시계탑
      ];
      campusBlocks.forEach(([bx, bz, bw, bh, bd, rot, mat]) => {
        const m = shadow(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat));
        m.position.set(bx, bh / 2, bz); m.rotation.y = rot; maquette.add(m);
      });
      const rM = seeded(909);
      for (let i = 0; i < 38; i++) {
        const ang = rM() * Math.PI * 2, rad = 0.55 + rM() * 1.25;
        const bx = Math.cos(ang) * rad, bz = Math.sin(ang) * rad;
        if (Math.hypot(bx - 0.18, bz + 0.15) < 0.45) continue;
        const bw = 0.08 + rM() * 0.14, bh = 0.03 + rM() * 0.09, bd = 0.08 + rM() * 0.14;
        const blk = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), M.lacquer);
        blk.position.set(bx, bh / 2, bz); blk.rotation.y = (rM() - 0.5) * 0.6; maquette.add(blk);
      }
      // 버건디 루비 비콘 핀
      const pinG = new THREE.Group(); pinG.position.set(0.18, 1.62, -0.15); g.add(pinG);
      const ruby = new THREE.MeshPhysicalMaterial({ color: 0x6a1424, roughness: 0.08, clearcoat: 1, metalness: 0.1, envMapIntensity: 1.4 });
      const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.18, 48, 32), ruby)); head.position.y = 0.32; pinG.add(head);
      const tip = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 48), ruby)); tip.rotation.x = Math.PI; tip.position.y = 0.06; pinG.add(tip);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.006, 8, 96), M.gold); halo.position.y = 0.32; pinG.add(halo);
      pinG.add(Object.assign(spark(1.4, 0.6), {}));
      const pulses = [0, 1, 2].map((i) => {
        const r = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.18, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.8), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
        r.rotation.x = -Math.PI / 2; r.position.set(0.18, 1.012, -0.15); r.userData.o = i / 3; g.add(r); return r;
      });
      const pt = new THREE.PointLight(0xffd2a0, HQ ? 5 : 2.5, 6, 2); pt.position.set(0.6, 2.6, 1.2); g.add(pt);
      const b = banner(); b.position.set(-1.8, 2.0, -2.6); g.add(b);
      animators.push((t, dt, near) => {
        if (!near) return;
        pinG.position.y = 1.62 + Math.sin(t * 1.4) * 0.06; pinG.rotation.y = t * 0.5;
        halo.rotation.x = Math.PI / 2 + Math.sin(t * 0.8) * 0.3;
        pulses.forEach((p) => { const k = (t * 0.3 + p.userData.o) % 1; p.scale.setScalar(1 + k * 7); p.material.opacity = (1 - k) * 0.32; });
      });
    })();

    /* ======================================================================
       금빛 먼지 · 공간 애니메이션
       ====================================================================== */
    let dust;
    (function buildDust() {
      const N = HQ ? 900 : 400;
      const pos = new Float32Array(N * 3), seed = new Float32Array(N), size = new Float32Array(N);
      const rnd = seeded(28);
      for (let i = 0; i < N; i++) { pos[i * 3] = (rnd() - 0.5) * 22; pos[i * 3 + 1] = rnd() * 7; pos[i * 3 + 2] = 10 - rnd() * 78; seed[i] = rnd() * 100; size[i] = 0.4 + Math.pow(rnd(), 3) * 1.8; }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPR: { value: dpr }, uColor: { value: new THREE.Color(0xffd59a) } },
        vertexShader: `uniform float uTime; uniform float uPR; attribute float aSeed; attribute float aSize; varying float vA;
          void main(){ vec3 p = position; p.y = mod(p.y + uTime * 0.05 + sin(uTime * 0.25 + aSeed) * 0.3, 7.0); p.x += sin(uTime * 0.2 + aSeed * 1.7) * 0.4;
            vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
            gl_PointSize = aSize * uPR * (30.0 / -mv.z);
            vA = (0.5 + 0.5 * sin(uTime * 1.5 + aSeed * 3.0)) * smoothstep(36.0, 4.0, -mv.z); }`,
        fragmentShader: `uniform vec3 uColor; varying float vA;
          void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor, a * a * vA * 0.7); }`
      });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
      animators.push((t) => { mat.uniforms.uTime.value = t; });
      dust = mat;
    })();
    animators.push((t) => { if (archAnim) archAnim(t); });

    /* ======================================================================
       조명
       ====================================================================== */
    scene.add(new THREE.HemisphereLight(0x5a3a40, 0x0c0708, 0.9));
    const key = new THREE.DirectionalLight(0xffe2c4, 1.6);
    key.position.set(6, 12, 7);
    scene.add(key, key.target);
    if (HQ) {
      key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
      const sc = key.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 34;
      key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
    }
    

    report(0.85);

    /* ---------- Post ---------- */
    let composer = null, bloom = null;
    if (post) {
      const [ec, rp, ub, op] = post;
      composer = new ec.EffectComposer(renderer);
      composer.setPixelRatio(dpr); composer.setSize(window.innerWidth, window.innerHeight);
      composer.addPass(new rp.RenderPass(scene, camera));
      bloom = new ub.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.55, 0.9);
      composer.addPass(bloom);
      composer.addPass(new op.OutputPass());
    }

    /* ======================================================================
       카메라 경로
       ====================================================================== */
    const camCurve = new THREE.CatmullRomCurve3(STATIONS.map((s) => new THREE.Vector3(...s.cam)), false, "catmullrom", 0.4);
    const lookCurve = new THREE.CatmullRomCurve3(STATIONS.map((s) => new THREE.Vector3(...s.look)), false, "catmullrom", 0.4);
    const objCurve = new THREE.CatmullRomCurve3(STATIONS.map((s) => new THREE.Vector3(...s.obj)), false, "catmullrom", 0.4);
    const last = STATIONS.length - 1;
    let target = 0, current = 0;
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    const vCam = new THREE.Vector3(), vLook = new THREE.Vector3(), vObj = new THREE.Vector3(), back = new THREE.Vector3();
    let narrow = window.innerWidth < 900;
    function placeCamera(s) {
      const e = clamp(dwell(s), 0, last) / last;
      camCurve.getPoint(e, vCam); lookCurve.getPoint(e, vLook); objCurve.getPoint(e, vObj);
      if (narrow) {
        vLook.lerp(vObj, 0.85); vLook.y -= 0.7;
        back.copy(vCam).sub(vLook).normalize().multiplyScalar(2.4); vCam.add(back);
      }
      vCam.x += pointer.sx * 0.35; vCam.y += pointer.sy * 0.18;
      camera.position.copy(vCam); camera.lookAt(vLook);
      key.position.set(vObj.x + 5, 12, vObj.z + 6.5); key.target.position.copy(vObj); key.target.updateMatrixWorld();
    }

    /* ---------- Picking ---------- */
    const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function pick(clientX, clientY) {
      if (!frames.length || Math.abs(current - 3) > 0.65) return null;
      ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(frames.map((f) => f.pic), false)[0];
      return hit ? hit.object.userData.workId : null;
    }

    /* ======================================================================
       루프
       ====================================================================== */
    const clock = new THREE.Clock();
    let elapsed = 0, running = true, rafId = 0;
    let perfFrames = 0, perfTime = 0, perfDone = false;
    function frame() {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      // 첫 화면(사진 히어로)이 화면을 덮고 있으면 렌더하지 않음
      if (window.scrollY < window.innerHeight * 0.35 && current < 0.2 && target < 0.2) return;
      if (!opts.reducedMotion) elapsed += dt;
      const k = opts.reducedMotion ? 1 : 1 - Math.pow(0.0025, dt);
      current += (target - current) * k;
      pointer.sx += (pointer.x - pointer.sx) * (1 - Math.pow(0.02, dt));
      pointer.sy += (pointer.y - pointer.sy) * (1 - Math.pow(0.02, dt));
      placeCamera(current);
      for (let i = 0; i < animators.length; i++) animators[i](elapsed, dt, i > last || Math.abs(current - i) < 1.85);
      if (composer) composer.render(); else renderer.render(scene, camera);
      if (!perfDone && !opts.fixedQuality) {
        perfFrames++; perfTime += dt;
        if (perfTime > 3) {
          perfDone = true;
          const fps = perfFrames / perfTime;
          if (fps < 42 && dpr > 1) { dpr = 1; applySize(); }
          if (fps < 30) { if (bloom) bloom.enabled = false; renderer.shadowMap.enabled = false; if (reflector) reflector.visible = false; }
        }
      }
    }
    function applySize() {
      const w = window.innerWidth, h = window.innerHeight;
      narrow = w < 900;
      camera.aspect = w / h; camera.fov = w / h < 0.8 ? 60 : w / h < 1.2 ? 50 : 42; camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      if (composer) { composer.setPixelRatio(dpr); composer.setSize(w, h); }
      if (reflector) reflector.getRenderTarget().setSize(Math.round(w * dpr * 0.45), Math.round(h * dpr * 0.45));
      if (dust) dust.uniforms.uPR.value = dpr;
    }
    applySize();
    placeCamera(0);
    if (composer) composer.render(); else renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { running = false; cancelAnimationFrame(rafId); }
      else if (!running) { running = true; clock.getDelta(); rafId = requestAnimationFrame(frame); }
    });
    report(1);

    return {
      setStation(s) { target = clamp(s, 0, last); },
      jump(s) { target = current = clamp(s, 0, last); },
      setPointer(x, y) { pointer.x = x; pointer.y = y; },
      resize: applySize,
      pick,
      hover(clientX, clientY) { const id = clientX == null ? null : pick(clientX, clientY); hoveredId = id; return id; },
      highlight(id) { hoveredId = id; },
      get station() { return current; },
      _debug: { THREE, scene, camera, renderer, composer, bloom, world, M, render: () => (composer ? composer.render() : renderer.render(scene, camera)), place: (s) => { current = target = s; placeCamera(s); } }
    };
  }

  window.AlchemyScene = { create, STATION_COUNT: STATIONS.length };
})();
