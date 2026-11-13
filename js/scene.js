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
    const blackMarble = marbleTex("#0d0b0b", "rgba(190,170,160,A)", 3, 1024);
    const M = {
      velvet: new THREE.MeshPhysicalMaterial({ color: 0x320810, roughness: 0.85, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xb63550), envMapIntensity: 0.3, side: THREE.DoubleSide }),
      gold: new THREE.MeshStandardMaterial({ color: 0xd8b47c, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xb08d5e, metalness: 1, roughness: 0.36, envMapIntensity: 1.1 }),
      marble: new THREE.MeshPhysicalMaterial({ map: blackMarble, color: 0xffffff, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 }),
      lacquer: new THREE.MeshPhysicalMaterial({ color: 0x0c0a0a, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 }),
      leather: new THREE.MeshPhysicalMaterial({ color: 0x15100f, roughness: 0.48, clearcoat: 0.5, clearcoatRoughness: 0.4, sheen: 0.3, sheenColor: new THREE.Color(0x4a3a36), envMapIntensity: 0.8 }),
      leatherRed: new THREE.MeshPhysicalMaterial({ color: 0x3a0c14, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.4, envMapIntensity: 0.7 }),
      wall: new THREE.MeshStandardMaterial({ color: 0x17110f, roughness: 0.7, metalness: 0.1 }),
      paper: new THREE.MeshStandardMaterial({ color: 0xe6ddd0, roughness: 0.9 }),
      glass: HQ
        ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transmission: 1, thickness: 1.2, ior: 1.5, envMapIntensity: 1.6, specularIntensity: 1 })
        : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transparent: true, opacity: 0.22, envMapIntensity: 2, clearcoat: 1, depthWrite: false }),
      shelfGlass: new THREE.MeshPhysicalMaterial({ color: 0x2a2124, roughness: 0.05, transparent: true, opacity: 0.35, envMapIntensity: 1.6, clearcoat: 1, depthWrite: false }),
      pane: new THREE.MeshPhysicalMaterial({ color: 0x241a1d, roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.18, envMapIntensity: 1.6, depthWrite: false }),
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
       공간 — 바닥 · 유리창과 노을 진 캠퍼스 · 커튼 · 천장 조명
       ====================================================================== */
    let reflector = null;
    let archAnim = null;
    (function buildArchitecture() {
      // 블랙 대리석 바닥 (+ 데스크톱은 실제 반사)
      if (HQ && refl) {
        reflector = new refl.Reflector(new THREE.PlaneGeometry(23.3, 110), { textureWidth: Math.round(window.innerWidth * dpr * 0.45), textureHeight: Math.round(window.innerHeight * dpr * 0.45), color: 0x7d7274, clipBias: 0.003 });
        reflector.rotation.x = -Math.PI / 2; reflector.position.set(-0.15, -0.002, -28);
        world.add(reflector);
      }
      const ft = marbleTex("#0b0909", "rgba(170,150,140,A)", 9, 1024); ft.repeat.set(8, 22);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(23.3, 110), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.3, metalness: 0.15, transparent: HQ, opacity: HQ ? 0.84 : 1, envMapIntensity: 0.6 }));
      floor.rotation.x = -Math.PI / 2; floor.position.set(-0.15, 0, -28); floor.receiveShadow = HQ;
      world.add(floor);
      // 줄눈
      const seams = [];
      for (let x = -20; x <= 20; x += 2.5) seams.push(new THREE.Vector3(x, 0.003, 26), new THREE.Vector3(x, 0.003, -82));
      for (let z = 26; z >= -82; z -= 2.5) seams.push(new THREE.Vector3(-20, 0.003, z), new THREE.Vector3(20, 0.003, z));
      world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seams), new THREE.LineBasicMaterial({ color: 0x3a2e2a, transparent: true, opacity: 0.35 })));

      // 천장 + 곡선 코브 조명 (참고 이미지의 원형 천장 라인)
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 110), M.wall); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 7.2, -28); world.add(ceil);
      const cove = [];
      for (let i = 0; i <= 200; i++) { const u = i / 200; cove.push(new THREE.Vector3(Math.sin(u * 7.5) * 3.2 + 2.5, 7.1, 8 - u * 76)); }
      const coveTube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cove), 400, 0.035, 8, false), M.glow(2.2, 0xffd9b0));
      world.add(coveTube);
      // 다운라이트
      for (let z = 6; z > -66; z -= 6) [-6, 6].forEach((x) => {
        const d = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), M.glow(3, 0xffe2c0)); d.rotation.x = Math.PI / 2; d.position.set(x, 7.19, z); world.add(d);
      });

      // 오른쪽: 통유리 창 (얇은 멀리언) + 바깥의 노을 진 캠퍼스
      const winGroup = new THREE.Group(); world.add(winGroup);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(110, 7.2), M.pane); glass.rotation.y = -Math.PI / 2; glass.position.set(11.5, 3.6, -28); winGroup.add(glass);
      for (let i = 0, z = 22; z >= -80; z -= 2.6, i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 7.2, 0.06), M.lacquer); m.position.set(11.48, 3.6, z); winGroup.add(m);
        if (i % 3 === 0) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 7.0, 0.02), M.glow(1.4)); s.position.set(11.4, 3.6, z + 0.05); winGroup.add(s); }
      }
      const outside = new THREE.Mesh(new THREE.PlaneGeometry(80, 140), new THREE.MeshStandardMaterial({ color: 0x0e0b0c, roughness: 1 })); outside.rotation.x = -Math.PI / 2; outside.position.set(51.5, -0.6, -28); world.add(outside);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 110), M.lacquer); sill.position.set(11.3, 0.03, -28); winGroup.add(sill);
      // 노을 하늘
      const [sc, sg] = canvas2d(16, 512);
      const grd = sg.createLinearGradient(0, 0, 0, 512);
      grd.addColorStop(0, "#1c1424"); grd.addColorStop(0.35, "#4a3448"); grd.addColorStop(0.62, "#b07d86"); grd.addColorStop(0.78, "#d9a79a"); grd.addColorStop(1, "#3a2a2c");
      sg.fillStyle = grd; sg.fillRect(0, 0, 16, 512);
      const sky = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), new THREE.MeshBasicMaterial({ map: canvasTex(sc), fog: false, toneMapped: true }));
      sky.rotation.y = -Math.PI / 2; sky.position.set(70, 18, -28); world.add(sky);
      // 캠퍼스 건물 (불 켜진 창)
      const [wc, wg] = canvas2d(256, 256);
      wg.fillStyle = "#1b1517"; wg.fillRect(0, 0, 256, 256);
      const rnd = seeded(41);
      for (let y = 10; y < 256; y += 22) for (let x = 8; x < 256; x += 16) {
        const on = rnd() < 0.55;
        wg.fillStyle = on ? `rgb(${230 + rnd() * 25 | 0},${185 + rnd() * 40 | 0},${120 + rnd() * 40 | 0})` : "#2a2024";
        wg.fillRect(x, y, 9, 13);
      }
      const winTex = canvasTex(wc); winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
      const r2 = seeded(13);
      for (let i = 0; i < 34; i++) {
        const w = 6 + r2() * 10, h = 3 + r2() * 6, d = 5 + r2() * 6;
        const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(d / 4, h / 4);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x1a1416, roughness: 0.8, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.55 }));
        m.position.set(30 + r2() * 26, h / 2 - 1, 14 - i * 3.4 - r2() * 2); world.add(m);
      }
      // 시계탑 (참고 이미지의 랜드마크)
      const tower = new THREE.Group(); tower.position.set(34, -1, -12); world.add(tower);
      [[4, 14, 0], [3, 4, 14], [2.2, 3, 18], [1.2, 2.6, 21]].forEach(([w, h, y]) => {
        const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(w / 4, h / 4);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ color: 0x1a1416, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1 }));
        m.position.y = y + h / 2; tower.add(m);
      });
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.2, 4), new THREE.MeshStandardMaterial({ color: 0x1a1416 })); spire.position.y = 25.2; tower.add(spire);
      // 나무 실루엣 (창 아래)
      const treeMat = new THREE.MeshStandardMaterial({ color: 0x141413, roughness: 1 });
      for (let i = 0; i < 18; i++) { const tr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + r2() * 1.2, 1), treeMat); tr.position.set(22 + r2() * 8, 0.6 + r2() * 0.6, 14 - i * 5.5); tr.scale.set(0.8, 1.1, 0.8); world.add(tr); }

      // 왼쪽 벽: 다크 우드 패널 + 벨벳 커튼
      const lw = new THREE.Mesh(new THREE.PlaneGeometry(110, 7.2), M.wall); lw.rotation.y = Math.PI / 2; lw.position.set(-11.8, 3.6, -28); world.add(lw);
      for (let z = 20; z > -80; z -= 3) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 7.2, 0.04), M.glow(0.9)); s.position.set(-11.75, 3.6, z); world.add(s); }

      // 빛 스트링 (반짝이는 전구 줄)
      const pts = [], seeds = [];
      const r3 = seeded(31);
      for (let s = 0; s < 40; s++) {
        const x = r3() < 0.5 ? -10.5 - r3() * 1 : 9.5 + r3() * 1.4, z = 10 - r3() * 78;
        for (let k = 0; k < 34; k++) { pts.push(x, 7 - k * 0.2, z); seeds.push(r3() * 100); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uMap: { value: glowTex }, uPR: { value: dpr } },
        vertexShader: `uniform float uTime; uniform float uPR; attribute float aSeed; varying float vA;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
            float tw = 0.4 + 0.6 * pow(0.5 + 0.5 * sin(uTime * (0.7 + fract(aSeed) * 1.5) + aSeed), 2.0);
            vA = tw * smoothstep(40.0, 4.0, -mv.z); gl_PointSize = (9.0 + 9.0 * tw) * uPR * (5.0 / -mv.z); }`,
        fragmentShader: `uniform sampler2D uMap; varying float vA;
          void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.6, 1.2, 0.82) * c.rgb, c.a * vA); }`
      });
      const lights = new THREE.Points(geo, mat); lights.frustumCulled = false; world.add(lights);
      archAnim = (t) => { mat.uniforms.uTime.value = t; };
    })();

    /* 벨벳 커튼 (주름 · 타이백) */
    function curtain(width, height, folds, o) {
      o = Object.assign({ tieV: 0.36, tie: 0.55, side: -1, seed: 1, depth: 0.08 }, o);
      const g = new THREE.PlaneGeometry(width, height, HQ ? 160 : 80, HQ ? 70 : 36);
      const p = g.attributes.position, rnd = seeded(o.seed), ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
      const pivot = o.side * width / 2;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), u = x / width + 0.5, v = y / height + 0.5;
        const pinch = o.tie * Math.exp(-Math.pow((v - o.tieV) / 0.16, 2)) + o.tie * 0.55 * (v < o.tieV ? smooth(clamp((o.tieV - v) / o.tieV, 0, 1)) : 0);
        const s = 1 - clamp(pinch, 0, 0.85);
        const amp = o.depth * (0.65 + 0.35 * (1 - v)) * (1 + 1.6 * (1 - s));
        let z = amp * (Math.sin(u * folds * 6.283 + ph[0]) * 0.7 + Math.sin(u * folds * 2.3 * 6.283 + ph[1]) * 0.25 + Math.sin(u * folds * 0.45 * 6.283 + ph[2]) * 0.6);
        z += 0.12 * Math.sin(v * 3.1 + ph[3]) * (1 - s);
        p.setXYZ(i, pivot + (x - pivot) * s, y, z);
      }
      g.computeVertexNormals();
      return shadow(new THREE.Mesh(g, M.velvet), true, true);
    }
    // 벽을 따라 늘어선 커튼
    [[-11.2, 4, 0.5], [-11.2, -18, 0.5], [-11.2, -40, 0.5], [-11.2, -62, 0.5]].forEach(([x, z, ry], i) => {
      const c = curtain(3.2, 7, 7, { side: i % 2 ? 1 : -1, seed: 3 + i, tie: 0.4 });
      c.position.set(x, 3.5, z); c.rotation.y = Math.PI / 2; world.add(c);
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
      // 블랙 대리석 플린스
      const plinth = shadow(new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.82, 1.0, 4, 0.02), M.marble)); plinth.position.y = 0.41; g.add(plinth);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(1.51, 0.01, 1.01), M.gold); lip.position.y = 0.82; g.add(lip);
      // 가죽 책 세 권
      const books = [["SECRETARIAL STUDIES", "#1a1112", 0.62, 0.11, 0.44, 0.0], ["HUMAN × ARTIFICIAL", "#3a0c14", 0.58, 0.09, 0.42, 0.08], ["THE ALCHEMIST", "#141011", 0.54, 0.08, 0.4, -0.06]];
      let y = 0.82;
      books.forEach(([title, col, w, h, d, rot]) => {
        const spine = new THREE.MeshPhysicalMaterial({ map: spineTexture(title, col), roughness: 0.5, clearcoat: 0.4 });
        const cover = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col), roughness: 0.55, clearcoat: 0.4 });
        const pages = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.9 });
        const b = shadow(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.008), [pages, pages, cover, cover, spine, pages]));
        b.position.set(-0.22, y + h / 2, 0.05); b.rotation.y = rot; g.add(b); y += h;
      });
      // 크리스털 구 + 내부의 빛 입자
      const orb = new THREE.Group(); orb.position.set(-0.22, y + 0.3, 0.05); g.add(orb);
      orb.add(new THREE.Mesh(new THREE.SphereGeometry(0.29, 64, 48), M.glass));
      const N = HQ ? 240 : 120, pos = new Float32Array(N * 3), ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) { const yy = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - yy * yy), th = ga * i; pos.set([Math.cos(th) * rr * 0.2, yy * 0.2, Math.sin(th) * rr * 0.2], i * 3); }
      const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const dots = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTex, color: new THREE.Color(2, 1.5, 1), size: 0.035, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      orb.add(dots);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.006, 8, 160), M.gold); ring.rotation.x = Math.PI / 2.3; orb.add(ring);
      orb.add(spark(0.9, 0.5));
      // 골드 구 (Human)
      const human = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.17, 64, 48), M.gold)); human.position.set(0.42, 0.82 + 0.17, -0.1); g.add(human);
      const pt = new THREE.PointLight(0xffd2a0, HQ ? 9 : 5, 5, 2); pt.position.set(-0.1, 2.2, 0.9); g.add(pt);
      // 유리 리본
      const V = (a, b, c) => new THREE.Vector3(a, b, c);
      const r = ribbon([V(-1.6, 0.3, 0.9), V(-0.6, 1.4, 1.1), V(0.6, 1.9, 0.5), V(0.9, 2.6, -0.6), V(-0.4, 3.2, -1.0)], 0.2, 0.4); g.add(r);
      const run = runnersOn(r, 3, 0.035);
      animators.push((t, dt, near) => {
        if (!near) return;
        orb.position.y = y + 0.3 + Math.sin(t * 0.8) * 0.02;
        dots.rotation.y = t * 0.25; ring.rotation.z = t * 0.2;
        run(t);
      });
    })();

    /* ======================================================================
       2 · 이그제큐티브 데스크
       ====================================================================== */
    (function buildDesk() {
      const g = new THREE.Group(); g.position.set(-6.2, 0, -20.5); g.rotation.y = 0.63; world.add(g);
      // 곡선 대리석 상판
      const shape = new THREE.Shape();
      shape.moveTo(-1.5, -0.55); shape.lineTo(1.2, -0.55); shape.absarc(1.2, 0.0, 0.55, -Math.PI / 2, Math.PI / 2, false); shape.lineTo(-1.5, 0.55); shape.lineTo(-1.5, -0.55);
      const topGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 48 });
      topGeo.rotateX(-Math.PI / 2);
      const top = shadow(new THREE.Mesh(topGeo, M.marble)); top.position.y = 0.74; g.add(top);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.012, 0.012), M.gold); edge.position.set(-0.15, 0.735, 0.56); g.add(edge);
      const base = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.72, 0.8, 3, 0.02), M.lacquer)); base.position.set(-0.2, 0.36, -0.05); g.add(base);
      const kick = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.01, 0.01), M.glow(1.6)); kick.position.set(-0.2, 0.04, 0.36); g.add(kick);
      const Y = 0.81;
      // 노트북
      const lap = new THREE.Group(); lap.position.set(0.15, Y, 0.05); lap.rotation.y = -0.25; g.add(lap);
      const alu = new THREE.MeshStandardMaterial({ color: 0x8e8a88, metalness: 1, roughness: 0.32 });
      const lb = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.014, 0.34, 2, 0.006), alu)); lb.position.y = 0.007; lap.add(lb);
      const lid = new THREE.Group(); lid.position.set(0, 0.014, -0.17); lid.rotation.x = -1.85 + Math.PI / 2; lap.add(lid);
      const ls = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.33, 0.01, 2, 0.005), alu)); ls.position.y = 0.165; lid.add(ls);
      const [sc, sx] = canvas2d(512, 340);
      const sg = sx.createLinearGradient(0, 0, 512, 340); sg.addColorStop(0, "#2a1a20"); sg.addColorStop(1, "#6b4652");
      sx.fillStyle = sg; sx.fillRect(0, 0, 512, 340);
      sx.fillStyle = "rgba(255,230,200,.85)"; sx.font = `italic 500 30px ${SERIF}`; sx.fillText("Executive Brief", 36, 70);
      sx.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 6; i++) sx.fillRect(36, 110 + i * 30, 300 - (i % 3) * 50, 8);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.29), new THREE.MeshBasicMaterial({ map: canvasTex(sc), toneMapped: false })); screen.position.set(0, 0.165, 0.0056); lid.add(screen);
      // 머시룸 데스크 램프
      const lamp = new THREE.Group(); lamp.position.set(0.85, Y, -0.2); g.add(lamp);
      const lbase = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.03, 48), M.gold)); lbase.position.y = 0.015; lamp.add(lbase);
      const stem = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 16), M.gold)); stem.position.y = 0.28; lamp.add(stem);
      const dome = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.24, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2.6), M.gold)); dome.position.y = 0.48; dome.scale.y = 0.55; lamp.add(dome);
      const diff = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), M.glow(3, 0xffe4c4)); diff.rotation.x = Math.PI / 2; diff.position.y = 0.49; lamp.add(diff);
      const lampLight = new THREE.SpotLight(0xffd8a8, HQ ? 14 : 8, 3.2, 1.1, 0.8, 2); lampLight.position.set(0, 0.47, 0); lampLight.target.position.set(0, -0.5, 0); lamp.add(lampLight, lampLight.target);
      if (HQ) { lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.0005; }
      // 펜꽂이 + 만년필
      const cup = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.11, 32, 1, true), M.glass)); cup.position.set(0.55, Y + 0.055, -0.28); g.add(cup);
      [[-0.01, 0.2], [0.012, -0.15], [0, 0.05]].forEach(([dx, tilt], i) => {
        const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.007, 0.16, 12), i === 1 ? M.leatherRed : M.lacquer); pen.position.set(0.55 + dx, Y + 0.12, -0.28 + dx); pen.rotation.z = tilt; g.add(pen);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.02, 12), M.gold); cap.position.set(0.55 + dx - Math.sin(tilt) * 0.08, Y + 0.2, -0.28 + dx); cap.rotation.z = tilt; g.add(cap);
      });
      // 책 + 크리스털 문진
      [["SECRETARIAL STUDIES", "#1a1112", 0.5, 0.06, 0.36], ["OFFICE MANAGEMENT", "#2a0a10", 0.46, 0.05, 0.34]].forEach(([t, c, w, h, d], i) => {
        const spine = new THREE.MeshPhysicalMaterial({ map: spineTexture(t, c), roughness: 0.5, clearcoat: 0.4 });
        const cover = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c), roughness: 0.55, clearcoat: 0.4 });
        const pages = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 0.9 });
        const b = shadow(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.006), [pages, pages, cover, cover, spine, pages]));
        b.position.set(-0.85, Y + h / 2 + i * 0.06, 0.12); b.rotation.y = 0.12 - i * 0.1; g.add(b);
      });
      const paper = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.004, 0.42), M.paper)); paper.position.set(-0.35, Y + 0.002, 0.18); paper.rotation.y = 0.2; g.add(paper);
      // 가죽 이그제큐티브 체어 (책상 뒤)
      const chair = new THREE.Group(); chair.position.set(-0.2, 0, -0.95); g.add(chair);
      const seat = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.12, 0.56, 4, 0.05), M.leather)); seat.position.y = 0.5; chair.add(seat);
      const back = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.85, 0.12, 4, 0.05), M.leather)); back.position.set(0, 1.0, -0.26); back.rotation.x = -0.1; chair.add(back);
      for (let i = 0; i < 5; i++) { const pad = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.006, 0.005), M.lacquer); pad.position.set(0, 0.72 + i * 0.14, -0.195 + i * 0.014); chair.add(pad); }
      [-1, 1].forEach((s) => { const arm = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.05, 0.46, 2, 0.02), M.leather)); arm.position.set(s * 0.33, 0.7, -0.02); chair.add(arm); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), M.brass); post.position.set(s * 0.33, 0.6, 0.0); chair.add(post); });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 16), M.brass); col.position.y = 0.24; chair.add(col);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.025, 0.32), M.brass); leg.position.set(Math.sin(a) * 0.15, 0.04, Math.cos(a) * 0.15); leg.rotation.y = a; chair.add(leg); }
      // 배너 · 유리 선반 (뒤쪽)
      const b = banner(); b.position.set(0.9, 2.15, -2.3); g.add(b);
      const shelf = new THREE.Group(); shelf.position.set(-1.4, 0, -2.3); g.add(shelf);
      [-0.62, 0.62].forEach((x) => { const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 3.2, 0.36), M.lacquer); post.position.set(x, 1.6, 0); shelf.add(post); const strip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 3.1, 0.008), M.glow(1.8)); strip.position.set(x * 0.97, 1.6, 0.18); shelf.add(strip); });
      const r5 = seeded(8);
      [0.5, 1.15, 1.8, 2.45].forEach((h, k) => {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.02, 0.36), M.shelfGlass); plate.position.y = h; shelf.add(plate);
        const led = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.006, 0.006), M.glow(1.4)); led.position.set(0, h - 0.015, 0.17); shelf.add(led);
        let x = -0.52;
        while (x < 0.5) {
          if (r5() < 0.75) { const bw = 0.03 + r5() * 0.03, bh = 0.24 + r5() * 0.12; const bk = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.22), r5() < 0.3 ? M.leatherRed : M.leather); bk.position.set(x + bw / 2, h + 0.01 + bh / 2, 0); shelf.add(bk); x += bw + 0.004; }
          else { const o = new THREE.Mesh(new THREE.SphereGeometry(0.05, 24, 16), M.gold); o.position.set(x + 0.08, h + 0.06, 0); shelf.add(o); x += 0.18; }
        }
        const sl = new THREE.PointLight(0xffd0a0, HQ ? 0.6 : 0.3, 1.2, 2); sl.position.set(0, h + 0.25, 0.2); shelf.add(sl);
      });
      const pt = new THREE.PointLight(0xffcf98, HQ ? 3 : 1.5, 5, 2); pt.position.set(0.4, 2.2, 1.4); g.add(pt);
      animators.push(() => {});
    })();

    /* ======================================================================
       3 · 작품 액자 갤러리 (클릭 → 작품 상세)
       ====================================================================== */
    const frames = [];
    const textureLoader = new THREE.TextureLoader();
    let hoveredId = null;
    (function buildGallery() {
      const g = new THREE.Group(); world.add(g);
      const center = new THREE.Vector3(0, 2.8, -24.2);
      // 뒤쪽 벨벳 커튼 아치
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + i * 0.45;
        const c = curtain(4.2, 7, 8, { side: i % 2 ? 1 : -1, seed: 40 + i, tie: 0.0, depth: 0.1 });
        c.position.set(center.x + Math.sin(a) * 12, 3.5, center.z - Math.cos(a) * 12); c.lookAt(center.x, 3.5, center.z); g.add(c);
      }
      const works = opts.works || [];
      const n = works.length;
      if (!n) { animators.push(() => {}); return; }
      const perRow = Math.min(n, 7), rows = Math.ceil(n / perRow), R = 9.2;
      const FW = 2.2, FH = 1.65, MAT = 0.14, BORDER = 0.07;
      const outer = new THREE.Shape(), ox = FW / 2 + MAT + BORDER, oy = FH / 2 + MAT + BORDER, ix = FW / 2 + MAT, iy = FH / 2 + MAT;
      outer.moveTo(-ox, -oy); outer.lineTo(ox, -oy); outer.lineTo(ox, oy); outer.lineTo(-ox, oy); outer.closePath();
      const hole = new THREE.Path(); hole.moveTo(-ix, -iy); hole.lineTo(-ix, iy); hole.lineTo(ix, iy); hole.lineTo(ix, -iy); hole.closePath(); outer.holes.push(hole);
      const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 1 }); frameGeo.translate(0, 0, -0.04);
      const picGeo = new THREE.PlaneGeometry(FW, FH), matGeo = new THREE.PlaneGeometry(FW + MAT * 2, FH + MAT * 2);
      const matMat = new THREE.MeshStandardMaterial({ color: 0x1c1517, roughness: 0.9 });
      works.forEach((w, i) => {
        const row = Math.floor(i / perRow), inRow = row === rows - 1 ? n - row * perRow : perRow, col = i - row * perRow;
        const spread = Math.min(0.32 * (inRow - 1), 1.9);
        const a = inRow === 1 ? 0 : -spread / 2 + (col / (inRow - 1)) * spread;
        const y = 2.8 + (rows - 1) * 1.2 - row * 2.4;
        const fg = new THREE.Group();
        fg.position.set(center.x + Math.sin(a) * R, y, center.z - Math.cos(a) * R);
        fg.lookAt(center.x, y, center.z);
        const frameMat = M.gold.clone(); frameMat.emissive = new THREE.Color(0x8d713e); frameMat.emissiveIntensity = 0;
        fg.add(shadow(new THREE.Mesh(frameGeo, frameMat), true, false));
        const mat = new THREE.Mesh(matGeo, matMat); mat.position.z = -0.012; fg.add(mat);
        const picMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
        const pic = new THREE.Mesh(picGeo, picMat); pic.position.z = -0.006; pic.userData.workId = w.id; fg.add(pic);
        if (w.thumb) textureLoader.load(w.thumb, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
          const ia = tex.image.width / tex.image.height, fa = FW / FH;
          if (ia > fa) { tex.repeat.set(fa / ia, 1); tex.offset.set((1 - fa / ia) / 2, 0); } else { tex.repeat.set(1, ia / fa); tex.offset.set(0, (1 - ia / fa) / 2); }
          picMat.map = tex; picMat.color.setScalar(0.85); picMat.needsUpdate = true;
        }, undefined, () => picMat.color.set(0x2a2024));
        // 액자 위 픽처 라이트
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.8, 16), M.gold); bar.rotation.z = Math.PI / 2; bar.position.set(0, oy + 0.16, 0.16); fg.add(bar);
        const bl = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.01, 0.02), M.glow(2.4, 0xffe2c0)); bl.position.set(0, oy + 0.14, 0.17); fg.add(bl);
        const halo = spark(4.2, 0.0); halo.position.z = -0.25; fg.add(halo);
        g.add(fg);
        frames.push({ group: fg, pic, frameMat, halo, id: w.id, hover: 0, baseY: y, phase: i * 0.7 });
      });
      const gl = new THREE.SpotLight(0xffe0bc, HQ ? 120 : 60, 20, 0.7, 0.8, 2); gl.position.set(0, 6.8, -26); gl.target.position.set(0, 2.6, -33); g.add(gl, gl.target);
      const bench = shadow(new THREE.Mesh(new RoundedBoxGeometry(3, 0.42, 0.8, 3, 0.03), M.leather)); bench.position.set(0, 0.21, -30.2); g.add(bench);
      animators.push((t, dt, near) => {
        frames.forEach((f) => {
          const target = f.id === hoveredId ? 1 : 0;
          f.hover += (target - f.hover) * Math.min(1, dt * 10);
          if (near) f.group.position.y = f.baseY + Math.sin(t * 0.6 + f.phase) * 0.03 + f.hover * 0.08;
          f.group.scale.setScalar(1 + f.hover * 0.05);
          f.frameMat.emissiveIntensity = f.hover * 0.6;
          f.halo.material.opacity = f.hover * 0.35;
        });
      });
    })();

    /* ======================================================================
       4 · 골드 벽시계 · 유리 모래시계
       ====================================================================== */
    function dialTexture() {
      const S = 1024, [c, g] = canvas2d(S, S);
      g.fillStyle = "#0e0b0b"; g.fillRect(0, 0, S, S);
      g.translate(S / 2, S / 2);
      g.fillStyle = "#d6b58a";
      for (let i = 0; i < 60; i++) { g.save(); g.rotate((i / 60) * Math.PI * 2); if (i % 5 === 0) g.fillRect(-3, -S * 0.46, 6, 40); else g.fillRect(-1.5, -S * 0.46, 3, 16); g.restore(); }
      g.textAlign = "center"; g.textBaseline = "middle"; g.font = `500 ${S * 0.08}px ${SERIF}`;
      ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"].forEach((n, h) => { const a = (h / 12) * Math.PI * 2 - Math.PI / 2; g.fillText(n, Math.cos(a) * S * 0.34, Math.sin(a) * S * 0.34); });
      g.strokeStyle = "rgba(214,181,138,.5)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, S * 0.2, 0, Math.PI * 2); g.stroke();
      g.font = `italic 500 ${S * 0.035}px ${SERIF}`; g.fillText("Induk University", 0, S * 0.12);
      return canvasTex(c);
    }
    (function buildClock() {
      const g = new THREE.Group(); g.position.set(6.8, 0, -45); g.rotation.y = -0.55; world.add(g);
      // 대리석 벽 패널
      const wall = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.8, 3.6, 0.12, 3, 0.02), M.marble)); wall.position.set(0, 1.8, -0.4); g.add(wall);
      const clock = new THREE.Group(); clock.position.set(0, 2.15, -0.3); g.add(clock);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.85, 128), new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.4, metalness: 0.2 })); face.position.z = 0.03; clock.add(face);
      const bezel = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.05, 24, 160), M.gold)); bezel.position.z = 0.04; clock.add(bezel);
      const glassC = new THREE.Mesh(new THREE.CircleGeometry(0.86, 96), M.pane); glassC.position.z = 0.08; clock.add(glassC);
      const hand = (len, w, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.008), mat); m.geometry.translate(0, len * 0.42, 0); m.position.z = z; clock.add(m); return m; };
      const hH = hand(0.45, 0.03, 0.05, M.gold), mH = hand(0.66, 0.02, 0.06, M.gold), sH = hand(0.72, 0.006, 0.07, new THREE.MeshStandardMaterial({ color: 0x8a1e30, roughness: 0.4 }));
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 24), M.gold); pin.rotation.x = Math.PI / 2; pin.position.z = 0.07; clock.add(pin);
      // 콘솔 + 모래시계
      const console_ = shadow(new THREE.Mesh(new RoundedBoxGeometry(2.4, 0.08, 0.6, 3, 0.02), M.marble)); console_.position.set(0, 0.9, 0.2); g.add(console_);
      [-1.05, 1.05].forEach((x) => { const leg = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.88, 0.5), M.gold)); leg.position.set(x, 0.44, 0.2); g.add(leg); });
      const hg = new THREE.Group(); hg.position.set(-0.6, 0.94, 0.25); g.add(hg);
      const pts = []; for (let i = 0; i <= 32; i++) { const y = i / 32; pts.push(new THREE.Vector2(0.03 + Math.pow(Math.abs(Math.cos(y * Math.PI)), 1.5) * 0.12, y * 0.42)); }
      const hgGlass = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M.glass); hgGlass.position.y = 0.025; hg.add(hgGlass);
      const sand = new THREE.MeshStandardMaterial({ color: 0xd9b37a, roughness: 0.8, metalness: 0.2 });
      const sTop = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.11, 32), sand); sTop.rotation.x = Math.PI; sTop.position.y = 0.32; hg.add(sTop);
      const sBot = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.09, 32), sand); sBot.position.y = 0.07; hg.add(sBot);
      [0.012, 0.46].forEach((y) => { const d = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 40), M.gold)); d.position.y = y; hg.add(d); });
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 8), M.gold); p.position.set(Math.cos(a) * 0.135, 0.235, Math.sin(a) * 0.135); hg.add(p); }
      // 꽃병 대신 골드 볼
      const bowl = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.16, 48, 24, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.gold)); bowl.position.set(0.65, 1.1, 0.2); g.add(bowl);
      const pt = new THREE.PointLight(0xffd2a0, HQ ? 4 : 2, 5, 2); pt.position.set(0.3, 2.8, 1.4); g.add(pt);
      const V = (a, b, c) => new THREE.Vector3(a, b, c);
      const r = ribbon([V(-1.8, 0.5, 1.2), V(-1.0, 1.6, 0.8), V(0.2, 3.3, 0.6), V(1.5, 3.6, -0.2), V(2.0, 2.4, 0.4)], 0.18, 0.35); g.add(r);
      const run = runnersOn(r, 3, 0.03);
      animators.push((t, dt, near) => {
        if (!near) return;
        sH.rotation.z = -t * 0.6; mH.rotation.z = -t * 0.04 - 1.2; hH.rotation.z = -t * 0.004 - 2.4;
        const k = (t * 0.05) % 1; sTop.scale.setScalar(1 - k * 0.7); sBot.scale.setScalar(0.3 + k * 0.7);
        run(t);
      });
    })();

    /* ======================================================================
       5 · 블랙 대리석 지도 테이블 · 버건디 유리 핀
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
      const top = shadow(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.1, 128), M.marble)); top.position.y = 0.95; g.add(top);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.018, 12, 200), M.gold); rim.rotation.x = Math.PI / 2; rim.position.y = 1.0; g.add(rim);
      const leg = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 0.9, 64), M.lacquer)); leg.position.y = 0.45; g.add(leg);
      const legRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.012, 8, 96), M.gold); legRing.rotation.x = Math.PI / 2; legRing.position.y = 0.3; g.add(legRing);
      const map = new THREE.Mesh(new THREE.CircleGeometry(2.08, 128), new THREE.MeshStandardMaterial({ map: mapTexture(), roughness: 0.3, metalness: 0.4, emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0 }));
      map.rotation.x = -Math.PI / 2; map.position.y = 1.004; map.receiveShadow = HQ; g.add(map);
      const mapGlow = new THREE.Mesh(new THREE.CircleGeometry(2.08, 128), new THREE.MeshBasicMaterial({ map: map.material.map, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      mapGlow.rotation.x = -Math.PI / 2; mapGlow.position.y = 1.006; g.add(mapGlow);
      const pinG = new THREE.Group(); pinG.position.set(0.18, 1.6, -0.15); g.add(pinG);
      const ruby = new THREE.MeshPhysicalMaterial({ color: 0x6a1424, roughness: 0.08, clearcoat: 1, metalness: 0.1, envMapIntensity: 1.4 });
      const head = shadow(new THREE.Mesh(new THREE.SphereGeometry(0.18, 48, 32), ruby)); head.position.y = 0.32; pinG.add(head);
      const tip = shadow(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 48), ruby)); tip.rotation.x = Math.PI; tip.position.y = 0.06; pinG.add(tip);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.006, 8, 96), M.gold); halo.position.y = 0.32; pinG.add(halo);
      pinG.add(Object.assign(spark(1.4, 0.6), {}));
      const pulses = [0, 1, 2].map((i) => {
        const r = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.18, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.8), transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
        r.rotation.x = -Math.PI / 2; r.position.set(0.18, 1.012, -0.15); r.userData.o = i / 3; g.add(r); return r;
      });
      const pt = new THREE.PointLight(0xffd2a0, HQ ? 4 : 2, 5, 2); pt.position.set(0.6, 2.6, 1.2); g.add(pt);
      const b = banner(); b.position.set(-1.8, 2.0, -2.6); g.add(b);
      animators.push((t, dt, near) => {
        if (!near) return;
        pinG.position.y = 1.6 + Math.sin(t * 1.4) * 0.06; pinG.rotation.y = t * 0.5;
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
      if (!perfDone) {
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
