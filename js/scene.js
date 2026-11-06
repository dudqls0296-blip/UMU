/* ==========================================================================
   AlchemyScene — 하나로 이어진 3D '연금술 오피스'
   --------------------------------------------------------------------------
   스크롤 값(station 0~5)에 따라 카메라가 공간을 따라 이동합니다.
     0 Prima Materia  메인        현자의 돌 코어 (유리 결정 + 아밀러리 고리)
     1 Nigredo        기획 의도   Human(금) × AI(빛의 입자) 두 구체의 융합
     2 Albedo         학과 소개   미래형 오피스 데스크 · 홀로그램 모니터 · 증류기
     3 Citrinitas     전시 구성   작품 액자 갤러리 (클릭 → 작품 상세)
     4 Rubedo         일정·장소   아스트롤라베(천체 시계) · 모래시계
     5 Lapis          오시는 길   홀로그램 지도 테이블 · 위치 핀
   --------------------------------------------------------------------------
   · three.js는 index.html의 importmap을 통해 동적 import 합니다.
     (일반 <script>에서 import()를 쓰기 때문에 index.html을 더블클릭해 열어도 동작)
   · 저사양/모바일에서는 블룸·유리 굴절·입자 수를 자동으로 낮춥니다.
   ========================================================================== */
(function () {
  "use strict";

  const C = {
    navy: 0x060b1f,
    deep: 0x0d1a3d,
    lacquer: 0x101c40,
    gold: 0xc9a44c,
    pale: 0xebd9a6,
    cyan: 0x8fd4e8,
    paper: 0xe9e4d6
  };

  /* 카메라 정류장: cam=카메라 위치, look=바라보는 지점, obj=오브젝트 중심(모바일 보정용) */
  const STATIONS = [
    { cam: [0, 2.2, 13],      look: [0, -0.6, 0],     obj: [0, 2.45, 0] },
    { cam: [1.1, 2.75, -2.6], look: [3.5, 2.5, -10],  obj: [6.2, 2.6, -10] },
    { cam: [-1.0, 3.7, -12.6],look: [-3.7, 1.45, -20.5], obj: [-6.2, 1.3, -20.5] },
    { cam: [0, 3.35, -23.2],  look: [0, 3.15, -33],   obj: [0, 3.1, -33] },
    { cam: [1.2, 3.25, -37.4],look: [3.9, 3.2, -45],  obj: [6.8, 3.4, -45] },
    { cam: [-1.2, 5.3, -50],  look: [-3.9, 1.0, -57], obj: [-6.4, 1.1, -57] }
  ];

  /* ---------- 작은 유틸 ---------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  // 각 구간 앞뒤 18%는 정류장에 머물도록(패널을 읽는 동안 카메라가 멈춘 듯 보이게)
  const dwell = (s) => {
    const i = Math.floor(s), f = s - i;
    const d = 0.18;
    const e = f < d ? 0 : f > 1 - d ? 1 : smooth((f - d) / (1 - 2 * d));
    return i + e;
  };
  function seeded(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }
  function hexCss(hex, a) {
    const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
    return a == null ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
  }
  function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return [c, c.getContext("2d")];
  }

  /* ======================================================================
     create(canvas, options) → Promise<API>
     options: { lowPower, reducedMotion, works:[{id,title,thumb}], onProgress(p) }
     ====================================================================== */
  async function create(canvas, options) {
    const opts = Object.assign({ lowPower: false, reducedMotion: false, works: [], onProgress: () => {} }, options);
    const report = (p) => { try { opts.onProgress(p); } catch (_) {} };

    const THREE = await import("three");
    report(0.35);
    const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
    let post = null;
    if (!opts.lowPower) {
      const [ec, rp, ub, op] = await Promise.all([
        import("three/addons/postprocessing/EffectComposer.js"),
        import("three/addons/postprocessing/RenderPass.js"),
        import("three/addons/postprocessing/UnrealBloomPass.js"),
        import("three/addons/postprocessing/OutputPass.js")
      ]);
      post = { EffectComposer: ec.EffectComposer, RenderPass: rp.RenderPass, UnrealBloomPass: ub.UnrealBloomPass, OutputPass: op.OutputPass };
    }
    report(0.55);
    // 캔버스에 글자를 그리기 전에 웹폰트를 기다림 (최대 1.5초)
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
    }

    /* ---------- Renderer ---------- */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !post && !opts.lowPower, alpha: false, powerPreference: "high-performance" });
    let maxDpr = opts.lowPower ? 1.25 : 1.75;
    let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(C.navy, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(C.navy);
    scene.fog = new THREE.FogExp2(C.navy, 0.034);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 160);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
    pmrem.dispose();

    /* ---------- Lights ---------- */
    scene.add(new THREE.HemisphereLight(0x2b3c78, 0x120c04, 0.55));
    const key = new THREE.DirectionalLight(0xfff0d2, 0.9);
    key.position.set(8, 18, 6);
    scene.add(key);

    /* ---------- Materials ---------- */
    const M = {
      gold: new THREE.MeshStandardMaterial({ color: C.gold, metalness: 1, roughness: 0.28, envMapIntensity: 1.1 }),
      goldGlow: new THREE.MeshStandardMaterial({ color: C.gold, metalness: 0.6, roughness: 0.3, emissive: C.gold, emissiveIntensity: 0.9 }),
      navyMetal: new THREE.MeshStandardMaterial({ color: 0x111b3a, metalness: 0.75, roughness: 0.4, envMapIntensity: 0.5 }),
      lacquer: new THREE.MeshPhysicalMaterial({ color: C.lacquer, metalness: 0.2, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.6 }),
      paper: new THREE.MeshStandardMaterial({ color: C.paper, roughness: 0.9, metalness: 0, envMapIntensity: 0.2 }),
      glass: opts.lowPower
        ? new THREE.MeshStandardMaterial({ color: 0xbfd8ff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.22, envMapIntensity: 1.4, depthWrite: false })
        : new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transmission: 1, thickness: 1.1, ior: 1.45, envMapIntensity: 1.3, specularIntensity: 1, attenuationColor: new THREE.Color(0xd8e6ff), attenuationDistance: 3 }),
      line: (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    };

    const glowTex = (function () {
      const [c, g] = makeCanvas(128, 128);
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,1)");
      grd.addColorStop(0.25, "rgba(255,255,255,.45)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    function glow(color, size, opacity) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: opacity == null ? 0.6 : opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
      s.scale.set(size, size, 1);
      return s;
    }

    /* ---------- Geometry helpers ---------- */
    function circlePoints(r, seg) {
      const pts = [];
      for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
      return pts;
    }
    function polyPoints(r, n, rot) {
      const pts = [];
      for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2 + (rot || 0); pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
      return pts;
    }
    const lineFrom = (pts, mat) => new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);

    /* 바닥의 연성진(Transmutation circle) */
    function makeSigil(r, color, opacity) {
      const g = new THREE.Group();
      const strong = M.line(color, opacity);
      const soft = M.line(color, opacity * 0.5);
      g.add(lineFrom(circlePoints(r, 160), strong));
      g.add(lineFrom(circlePoints(r * 0.93, 160), soft));
      g.add(lineFrom(circlePoints(r * 0.62, 128), strong));
      g.add(lineFrom(circlePoints(r * 0.2, 64), soft));
      g.add(lineFrom(polyPoints(r * 0.93, 3, -Math.PI / 2), strong));
      g.add(lineFrom(polyPoints(r * 0.93, 3, Math.PI / 2), strong));
      g.add(lineFrom(polyPoints(r * 0.62, 4, Math.PI / 4), soft));
      // 눈금
      const tick = [];
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2, l = i % 6 === 0 ? 0.12 : 0.05;
        tick.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * r * (1 - l), 0, Math.sin(a) * r * (1 - l)));
      }
      g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tick), soft));
      // 6개의 작은 원 (행성 기호 자리)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const c = lineFrom(circlePoints(r * 0.075, 32), strong);
        c.position.set(Math.cos(a) * r * 0.775, 0, Math.sin(a) * r * 0.775);
        g.add(c);
      }
      return g;
    }

    /* 원형 글자 띠 텍스처 */
    function ringTextTexture(text, color) {
      const S = 1024;
      const [c, g] = makeCanvas(S, S);
      g.translate(S / 2, S / 2);
      g.strokeStyle = hexCss(color, 0.55);
      g.lineWidth = 2;
      [0.475, 0.405].forEach((k) => { g.beginPath(); g.arc(0, 0, S * k, 0, Math.PI * 2); g.stroke(); });
      g.fillStyle = hexCss(color, 0.9);
      g.font = `500 ${S * 0.03}px Hahmlet, "Noto Serif KR", serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      const chars = Array.from(text);
      const step = (Math.PI * 2) / chars.length;
      chars.forEach((ch, i) => { g.save(); g.rotate(i * step); g.translate(0, -S * 0.44); g.fillText(ch, 0, 0); g.restore(); });
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    }
    function floorTextRing(radius, text, color) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(radius * 2 / 0.95, radius * 2 / 0.95),
        new THREE.MeshBasicMaterial({ map: ringTextTexture(text, color), transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      m.rotation.x = -Math.PI / 2;
      return m;
    }

    const animators = []; // (t, dt, near) => void
    const world = new THREE.Group();
    scene.add(world);

    /* ======================================================================
       공간: 바닥 · 기둥 · 바닥 그리드
       ====================================================================== */
    (function buildArchitecture() {
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(90, 150),
        new THREE.MeshStandardMaterial({ color: 0x070d24, metalness: 0.88, roughness: 0.42, envMapIntensity: 0.35 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0, -28);
      world.add(floor);

      // 바닥 그리드 (희미한 금선)
      const grid = [];
      for (let x = -30; x <= 30; x += 3) grid.push(new THREE.Vector3(x, 0.002, 18), new THREE.Vector3(x, 0.002, -80));
      for (let z = 18; z >= -80; z -= 3) grid.push(new THREE.Vector3(-30, 0.002, z), new THREE.Vector3(30, 0.002, z));
      world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grid), M.line(C.gold, 0.05)));

      // 중앙 동선(금 인레이)
      [-1.6, 1.6].forEach((x) => world.add(lineFrom([new THREE.Vector3(x, 0.004, 14), new THREE.Vector3(x, 0.004, -66)], M.line(C.gold, 0.22))));

      // 기둥 열
      const colGeo = new THREE.CylinderGeometry(0.42, 0.48, 16, 32, 1, true);
      const ringGeo = new THREE.TorusGeometry(0.5, 0.045, 10, 48);
      const stripGeo = new THREE.BoxGeometry(0.035, 16, 0.035);
      for (let z = 8; z >= -66; z -= 9.5) {
        [-12.5, 12.5].forEach((x) => {
          const p = new THREE.Group();
          p.position.set(x, 8, z);
          p.add(new THREE.Mesh(colGeo, M.navyMetal));
          [-7.7, -7.2, 2.5].forEach((y) => { const r = new THREE.Mesh(ringGeo, M.gold); r.rotation.x = Math.PI / 2; r.position.y = y; p.add(r); });
          const s = new THREE.Mesh(stripGeo, M.goldGlow);
          s.position.set(x > 0 ? -0.43 : 0.43, 0, 0);
          p.add(s);
          world.add(p);
        });
      }

      // 천장의 거대한 고리들 (공간감)
      for (let i = 0; i < 4; i++) {
        const halo = lineFrom(circlePoints(9 + i * 0.6, 200), M.line(C.gold, 0.12 - i * 0.02));
        halo.position.set(0, 11 + i * 0.4, -10 - i * 15);
        world.add(halo);
      }
    })();

    /* ======================================================================
       0 · 현자의 돌 코어
       ====================================================================== */
    (function buildCore() {
      const g = new THREE.Group();
      g.position.set(0, 0, 0);
      world.add(g);

      const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.6, 0.55, 64), M.navyMetal);
      ped.position.y = 0.275; g.add(ped);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.035, 12, 96), M.gold);
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.55; g.add(rim);
      const rim2 = rim.clone(); rim2.scale.setScalar(1.25); rim2.position.y = 0.02; g.add(rim2);

      const sigil = makeSigil(4.2, C.gold, 0.55);
      sigil.position.y = 0.01; g.add(sigil);
      const text = floorTextRing(5.0, "SOLVE ET COAGULA ✦ HUMAN INTELLIGENCE × ARTIFICIAL INTELLIGENCE ✦ 오피스의 연금술사 ✦ ", C.pale);
      text.position.y = 0.012; g.add(text);

      const core = new THREE.Group();
      core.position.y = 2.45; g.add(core);

      const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0), M.glass);
      core.add(crystal);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.215, 0)), M.line(C.pale, 0.55));
      core.add(edges);
      const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshStandardMaterial({ color: C.gold, emissive: 0xffc861, emissiveIntensity: 1.6, metalness: 0.5, roughness: 0.25, flatShading: true }));
      core.add(heart);
      core.add(glow(0xffd27a, 3.4, 0.55));

      const light = new THREE.PointLight(0xffc976, 14, 14, 1.6);
      core.add(light);

      // 아밀러리 고리
      const rings = [1.75, 2.05, 2.35].map((r, i) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(r, i === 1 ? 0.022 : 0.014, 8, 220), M.gold);
        m.rotation.set(Math.PI / 2 + (i - 1) * 0.55, i * 0.7, 0);
        core.add(m);
        return m;
      });
      // 고리 위의 작은 구슬
      const beads = rings.map((ring, i) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), M.goldGlow);
        b.userData.r = [1.75, 2.05, 2.35][i];
        ring.add(b);
        return b;
      });

      animators.push((t, dt, near) => {
        sigil.rotation.y = t * 0.03;
        text.rotation.z = -t * 0.02;
        if (!near) return;
        crystal.rotation.set(t * 0.18, t * 0.25, 0);
        edges.rotation.copy(crystal.rotation);
        heart.rotation.set(-t * 0.6, t * 0.4, 0);
        heart.scale.setScalar(1 + Math.sin(t * 2) * 0.06);
        core.position.y = 2.45 + Math.sin(t * 0.8) * 0.08;
        rings.forEach((r, i) => { r.rotation.z = t * (0.15 + i * 0.08) * (i % 2 ? -1 : 1); });
        beads.forEach((b, i) => { const a = t * (0.9 + i * 0.3); b.position.set(Math.cos(a) * b.userData.r, Math.sin(a) * b.userData.r, 0); });
        light.intensity = 13 + Math.sin(t * 2) * 2;
      });
      g.userData.station = 0;
    })();

    /* ======================================================================
       1 · Human × AI 융합
       ====================================================================== */
    (function buildDuo() {
      const g = new THREE.Group();
      g.position.set(6.2, 0, -10);
      world.add(g);

      const sig = makeSigil(3.2, C.gold, 0.4);
      sig.position.y = 0.01; g.add(sig);

      const pivot = new THREE.Group();
      pivot.position.y = 2.6; g.add(pivot);

      // Human — 금속 구
      const human = new THREE.Group();
      const hs = new THREE.Mesh(new THREE.SphereGeometry(0.78, 64, 64), new THREE.MeshStandardMaterial({ color: C.gold, metalness: 1, roughness: 0.2, envMapIntensity: 1.3 }));
      human.add(hs);
      const hRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.012, 8, 120), M.gold);
      hRing.rotation.x = Math.PI / 2.3; human.add(hRing);
      human.add(glow(0xffcf7a, 2.6, 0.35));
      pivot.add(human);

      // AI — 피보나치 입자 구
      const ai = new THREE.Group();
      const N = opts.lowPower ? 500 : 1100;
      const pos = new Float32Array(N * 3);
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
        pos.set([Math.cos(th) * r * 0.85, y * 0.85, Math.sin(th) * r * 0.85], i * 3);
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const aiPts = new THREE.Points(pg, new THREE.PointsMaterial({ color: C.cyan, size: 0.035, sizeAttenuation: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      ai.add(aiPts);
      const aiWire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.9, 1)), M.line(C.cyan, 0.3));
      ai.add(aiWire);
      ai.add(glow(C.cyan, 2.4, 0.3));
      pivot.add(ai);

      // 두 구 사이의 연성 흐름
      const S = opts.lowPower ? 90 : 180;
      const sp = new Float32Array(S * 3), sc = new Float32Array(S * 3);
      const sgeo = new THREE.BufferGeometry();
      sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
      sgeo.setAttribute("color", new THREE.BufferAttribute(sc, 3));
      const stream = new THREE.Points(sgeo, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
      pivot.add(stream);
      const offs = Array.from({ length: S }, (_, i) => i / S);
      const cGold = new THREE.Color(C.pale), cCyan = new THREE.Color(C.cyan), tmp = new THREE.Color();

      // 중앙 'ㅅ' 결합점
      const nexus = glow(0xffffff, 0.9, 0.5);
      pivot.add(nexus);

      const l1 = new THREE.PointLight(0xffc976, 6, 9, 1.8); pivot.add(l1);
      const l2 = new THREE.PointLight(C.cyan, 5, 9, 1.8); pivot.add(l2);

      const R = 1.55;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), ctrl = new THREE.Vector3(), p = new THREE.Vector3();
      animators.push((t, dt, near) => {
        sig.rotation.y = -t * 0.04;
        if (!near) return;
        const ang = t * 0.35;
        human.position.set(Math.cos(ang) * R, Math.sin(t * 0.7) * 0.15, Math.sin(ang) * R * 0.55);
        ai.position.set(-Math.cos(ang) * R, -Math.sin(t * 0.7) * 0.15, -Math.sin(ang) * R * 0.55);
        hs.rotation.y = t * 0.3;
        aiPts.rotation.y = -t * 0.25; aiPts.rotation.x = t * 0.1;
        aiWire.rotation.copy(aiPts.rotation);
        l1.position.copy(human.position); l2.position.copy(ai.position);
        a.copy(human.position); b.copy(ai.position);
        ctrl.addVectors(a, b).multiplyScalar(0.5); ctrl.y += 0.9;
        for (let i = 0; i < S; i++) {
          let u = (offs[i] + t * 0.12) % 1;
          const dir = i % 2 === 0;
          const k = dir ? u : 1 - u;
          // 2차 베지어
          p.set(0, 0, 0)
            .addScaledVector(a, (1 - k) * (1 - k))
            .addScaledVector(ctrl, 2 * (1 - k) * k)
            .addScaledVector(b, k * k);
          const jitter = Math.sin(i * 12.9 + t * 3) * 0.06;
          sp[i * 3] = p.x + jitter; sp[i * 3 + 1] = p.y + (dir ? 0 : -1.6 * k * (1 - k)) + jitter; sp[i * 3 + 2] = p.z;
          tmp.copy(cGold).lerp(cCyan, k);
          sc[i * 3] = tmp.r; sc[i * 3 + 1] = tmp.g; sc[i * 3 + 2] = tmp.b;
        }
        sgeo.attributes.position.needsUpdate = true;
        sgeo.attributes.color.needsUpdate = true;
        nexus.position.copy(ctrl).y -= 0.45;
        nexus.material.opacity = 0.35 + Math.sin(t * 3) * 0.15;
      });
    })();

    /* ======================================================================
       2 · 미래형 오피스 데스크
       ====================================================================== */
    function dashboardTexture(kind) {
      const W = 1024, H = 600;
      const [c, g] = makeCanvas(W, H);
      g.fillStyle = "rgba(20,60,110,.28)"; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(143,212,232,.7)"; g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12);
      g.fillStyle = "rgba(143,212,232,.16)"; g.fillRect(6, 6, W - 12, 70);
      g.fillStyle = "#cdeffa"; g.font = `600 34px Pretendard, sans-serif`; g.textBaseline = "middle";
      const rnd = seeded(kind === "a" ? 7 : 21);
      if (kind === "a") {
        g.fillText("AI 비서 · 오늘의 업무", 30, 42);
        const rows = ["09:00  주간 회의 — 회의록 자동 요약", "10:30  거래처 메일 회신 초안", "13:00  VIP 의전 동선 확인", "15:00  보고서 데이터 정리", "17:00  내일 일정 브리핑"];
        g.font = `400 30px Pretendard, sans-serif`;
        rows.forEach((r, i) => {
          const y = 130 + i * 88;
          g.fillStyle = i === 1 ? "rgba(235,217,166,.22)" : "rgba(143,212,232,.08)";
          g.fillRect(30, y - 34, W - 60, 68);
          g.fillStyle = i === 1 ? "#f3e2b0" : "#bfe6f3";
          g.fillText(r, 52, y);
          g.fillStyle = i < 1 ? "#8fd4e8" : "rgba(143,212,232,.35)";
          g.beginPath(); g.arc(W - 70, y, 12, 0, Math.PI * 2); g.fill();
        });
      } else {
        g.fillText("업무 흐름 분석", 30, 42);
        // 막대
        for (let i = 0; i < 12; i++) {
          const h = 80 + rnd() * 240;
          g.fillStyle = i === 8 ? "rgba(235,217,166,.9)" : "rgba(143,212,232,.55)";
          g.fillRect(50 + i * 44, 520 - h, 26, h);
        }
        // 라인
        g.strokeStyle = "#f3e2b0"; g.lineWidth = 4; g.beginPath();
        for (let i = 0; i <= 10; i++) { const x = 620 + i * 34, y = 470 - i * 22 - rnd() * 40; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        // 도넛
        g.lineWidth = 26;
        g.strokeStyle = "rgba(143,212,232,.25)"; g.beginPath(); g.arc(790, 220, 90, 0, Math.PI * 2); g.stroke();
        g.strokeStyle = "#8fd4e8"; g.beginPath(); g.arc(790, 220, 90, -Math.PI / 2, Math.PI * 1.1); g.stroke();
        g.fillStyle = "#e9f8fd"; g.font = `600 44px Pretendard, sans-serif`; g.textAlign = "center"; g.fillText("HI × AI", 790, 222);
      }
      // 스캔라인
      g.fillStyle = "rgba(255,255,255,.035)";
      for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    }

    (function buildDesk() {
      const g = new THREE.Group();
      g.position.set(-6.2, 0, -20.5);
      g.rotation.y = 0.55;
      world.add(g);

      const sig = makeSigil(3.6, C.gold, 0.32);
      sig.position.y = 0.01; g.add(sig);

      // 책상
      const top = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 1.9), M.lacquer);
      top.position.y = 1.08; g.add(top);
      const trim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.22, 0.11, 1.92)), M.line(C.gold, 0.9));
      trim.position.copy(top.position); g.add(trim);
      [-1.9, 1.9].forEach((x) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.03, 1.7), M.lacquer);
        leg.position.set(x, 0.515, 0); g.add(leg);
        const ledge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.1, 1.03, 1.7)), M.line(C.gold, 0.5));
        ledge.position.copy(leg.position); g.add(ledge);
      });
      const modesty = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.6, 0.05), M.lacquer);
      modesty.position.set(0, 0.72, -0.8); g.add(modesty);

      // 홀로그램 모니터 2대
      const screens = [];
      [["a", -0.95, 0.18], ["b", 0.95, -0.18]].forEach(([k, x, ry]) => {
        const sg = new THREE.Group();
        sg.position.set(x, 2.15, -0.45); sg.rotation.y = ry;
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.03), new THREE.MeshBasicMaterial({ map: dashboardTexture(k), transparent: true, opacity: 0.92, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        sg.add(scr);
        const fr = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.8, 1.08)), M.line(C.pale, 0.8));
        sg.add(fr);
        // 투사 빔
        const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.0), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.05, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
        beam.rotation.x = -Math.PI / 2.6; beam.position.set(0, -0.82, 0.15);
        sg.add(beam);
        g.add(sg);
        screens.push(sg);
      });
      // 프로젝터 받침
      const proj = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.05, 48), M.gold);
      proj.position.set(0, 1.16, -0.45); g.add(proj);

      // 증류기(알렘빅)
      const flaskPts = [];
      for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + (i / 24) * Math.PI * 0.82; flaskPts.push(new THREE.Vector2(Math.cos(a) * 0.32 + 0.0001, Math.sin(a) * 0.32 + 0.32)); }
      flaskPts.push(new THREE.Vector2(0.07, 0.68), new THREE.Vector2(0.07, 0.95), new THREE.Vector2(0.095, 0.98));
      const flask = new THREE.Mesh(new THREE.LatheGeometry(flaskPts, 48), M.glass);
      flask.position.set(1.45, 1.13, 0.35); g.add(flask);
      const liquid = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 16, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), new THREE.MeshStandardMaterial({ color: 0xffc35a, emissive: 0xffa526, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 }));
      liquid.position.set(1.45, 1.13 + 0.32, 0.35); g.add(liquid);
      const fl = new THREE.PointLight(0xffb347, 3, 4, 2); fl.position.set(1.45, 1.6, 0.35); g.add(fl);

      // 서류 더미
      for (let i = 0; i < 5; i++) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.86), M.paper);
        sh.position.set(-1.4 + Math.sin(i) * 0.02, 1.14 + i * 0.016, 0.3); sh.rotation.y = (i - 2) * 0.05; g.add(sh);
      }
      // 만년필
      const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.5, 16), M.gold);
      pen.rotation.set(0, 0.4, Math.PI / 2); pen.position.set(-0.7, 1.15, 0.55); g.add(pen);

      // 의자
      const chair = new THREE.Group();
      chair.position.set(0, 0, 1.25); chair.rotation.y = Math.PI + 0.25;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.75), M.navyMetal); seat.position.y = 0.62; chair.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.08), M.navyMetal); back.position.set(0, 1.15, 0.36); back.rotation.x = -0.08; chair.add(back);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 12), M.gold); stem.position.y = 0.3; chair.add(stem);
      const base = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 8, 40), M.gold); base.rotation.x = Math.PI / 2; base.position.y = 0.04; chair.add(base);
      g.add(chair);

      // 책상 위 떠 있는 기호 고리
      const halo = new THREE.Group(); halo.position.set(0, 3.15, -0.45); g.add(halo);
      const h1 = lineFrom(circlePoints(0.55, 96), M.line(C.cyan, 0.6)); h1.rotation.x = Math.PI / 2; halo.add(h1);
      const h2 = lineFrom(polyPoints(0.55, 3, 0), M.line(C.pale, 0.7)); h2.rotation.x = Math.PI / 2; halo.add(h2);

      const dl = new THREE.PointLight(C.cyan, 5, 8, 1.8); dl.position.set(0, 2.4, 0.6); g.add(dl);
      const dl2 = new THREE.PointLight(0xffd8a0, 3, 7, 2); dl2.position.set(-1.5, 2.2, 1.2); g.add(dl2);

      animators.push((t, dt, near) => {
        sig.rotation.y = t * 0.035;
        if (!near) return;
        screens.forEach((s, i) => { s.position.y = 2.15 + Math.sin(t * 1.1 + i) * 0.035; });
        halo.rotation.y = t * 0.6;
        halo.position.y = 3.15 + Math.sin(t) * 0.05;
        liquid.material.emissiveIntensity = 1.1 + Math.sin(t * 3) * 0.25;
      });
    })();

    /* ======================================================================
       3 · 작품 액자 갤러리
       ====================================================================== */
    const frames = []; // { group, pic, frameMat, id, hover }
    const textureLoader = new THREE.TextureLoader();
    (function buildGallery() {
      const g = new THREE.Group();
      world.add(g);
      const center = new THREE.Vector3(0, 3.1, -24.2);

      const sig = makeSigil(6, C.gold, 0.35);
      sig.position.set(0, 0.01, -32); g.add(sig);

      const works = opts.works || [];
      const n = works.length;
      if (!n) { animators.push((t) => { sig.rotation.y = -t * 0.025; }); return; }
      const perRow = Math.min(n, 7);
      const rows = Math.ceil(n / perRow);
      const R = 9.2;
      const FW = 2.3, FH = 1.72;

      const outer = new THREE.Shape();
      outer.moveTo(-FW / 2 - 0.12, -FH / 2 - 0.12); outer.lineTo(FW / 2 + 0.12, -FH / 2 - 0.12); outer.lineTo(FW / 2 + 0.12, FH / 2 + 0.12); outer.lineTo(-FW / 2 - 0.12, FH / 2 + 0.12); outer.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-FW / 2, -FH / 2); hole.lineTo(-FW / 2, FH / 2); hole.lineTo(FW / 2, FH / 2); hole.lineTo(FW / 2, -FH / 2); hole.closePath();
      outer.holes.push(hole);
      const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 1 });
      frameGeo.translate(0, 0, -0.04);
      const picGeo = new THREE.PlaneGeometry(FW, FH);
      const backGeo = new THREE.PlaneGeometry(FW + 0.24, FH + 0.24);
      const backMat = new THREE.MeshStandardMaterial({ color: 0x0a1230, metalness: 0.4, roughness: 0.6 });

      works.forEach((w, i) => {
        const row = Math.floor(i / perRow);
        const inRow = row === rows - 1 ? n - row * perRow : perRow;
        const col = i - row * perRow;
        const spread = Math.min(0.32 * (inRow - 1), 1.9);
        const a = inRow === 1 ? 0 : -spread / 2 + (col / (inRow - 1)) * spread;
        const y = 3.1 + (rows - 1) * 1.15 - row * 2.3;

        const fg = new THREE.Group();
        fg.position.set(center.x + Math.sin(a) * R, y, center.z - Math.cos(a) * R);
        fg.lookAt(center.x, y, center.z);

        const frameMat = M.gold.clone();
        frameMat.emissive = new THREE.Color(C.gold);
        frameMat.emissiveIntensity = 0.05;
        fg.add(new THREE.Mesh(frameGeo, frameMat));
        const back = new THREE.Mesh(backGeo, backMat); back.position.z = -0.03; back.rotation.y = Math.PI; fg.add(back);

        const picMat = new THREE.MeshBasicMaterial({ color: 0xdedede, toneMapped: false });
        const pic = new THREE.Mesh(picGeo, picMat);
        pic.position.z = 0.005;
        pic.userData.workId = w.id;
        fg.add(pic);
        if (w.thumb) {
          textureLoader.load(w.thumb, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 4;
            // 비율 유지(cover)
            const ia = tex.image.width / tex.image.height, fa = FW / FH;
            if (ia > fa) { tex.repeat.set(fa / ia, 1); tex.offset.set((1 - fa / ia) / 2, 0); }
            else { tex.repeat.set(1, ia / fa); tex.offset.set(0, (1 - ia / fa) / 2); }
            picMat.map = tex; picMat.needsUpdate = true;
          }, undefined, () => { picMat.color.set(0x1b2a5c); });
        }
        const halo = glow(0xffd27a, 4.2, 0);
        halo.position.z = -0.2;
        fg.add(halo);

        g.add(fg);
        frames.push({ group: fg, pic, frameMat, halo, id: w.id, hover: 0, baseY: y, phase: i * 0.7 });
      });

      const gl = new THREE.PointLight(0xffd59a, 9, 18, 1.6);
      gl.position.set(0, 5.5, -28); g.add(gl);

      animators.push((t, dt, near) => {
        sig.rotation.y = -t * 0.025;
        frames.forEach((f) => {
          const target = f.id === hoveredId ? 1 : 0;
          f.hover += (target - f.hover) * Math.min(1, dt * 10);
          if (near) f.group.position.y = f.baseY + Math.sin(t * 0.7 + f.phase) * 0.06;
          const s = 1 + f.hover * 0.07;
          f.group.scale.setScalar(s);
          f.frameMat.emissiveIntensity = 0.05 + f.hover * 0.5;
          f.halo.material.opacity = f.hover * 0.45;
        });
      });
    })();

    /* ======================================================================
       4 · 아스트롤라베 & 모래시계
       ====================================================================== */
    function numeralRingTexture() {
      const S = 1024;
      const [c, g] = makeCanvas(S, S);
      g.translate(S / 2, S / 2);
      g.strokeStyle = hexCss(C.pale, 0.8); g.lineWidth = 3;
      [0.49, 0.39].forEach((k) => { g.beginPath(); g.arc(0, 0, S * k, 0, Math.PI * 2); g.stroke(); });
      const nums = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
      g.fillStyle = hexCss(C.pale, 0.95);
      g.font = `600 ${S * 0.052}px Hahmlet, serif`;
      g.textAlign = "center"; g.textBaseline = "middle";
      nums.forEach((n, i) => { g.save(); g.rotate((i / 12) * Math.PI * 2); g.translate(0, -S * 0.44); g.fillText(n, 0, 0); g.restore(); });
      for (let i = 0; i < 60; i++) {
        g.save(); g.rotate((i / 60) * Math.PI * 2);
        g.fillRect(-1.5, -S * 0.39, 3, i % 5 === 0 ? -18 : -9);
        g.restore();
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return t;
    }

    (function buildAstrolabe() {
      const g = new THREE.Group();
      g.position.set(6.8, 0, -45);
      world.add(g);
      const sig = makeSigil(3.4, C.gold, 0.35);
      sig.position.y = 0.01; g.add(sig);

      const astro = new THREE.Group();
      astro.position.y = 3.4;
      astro.rotation.y = -0.45;
      g.add(astro);

      const face = new THREE.Mesh(new THREE.CircleGeometry(2.15, 96), new THREE.MeshBasicMaterial({ map: numeralRingTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, opacity: 0.95 }));
      astro.add(face);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 96), new THREE.MeshStandardMaterial({ color: 0x0b1535, metalness: 0.7, roughness: 0.35, transparent: true, opacity: 0.85 }));
      disc.position.z = -0.02; astro.add(disc);
      const outerRing = new THREE.Mesh(new THREE.TorusGeometry(2.17, 0.06, 16, 160), M.gold);
      astro.add(outerRing);
      // 고리 손잡이
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 12, 40), M.gold);
      shackle.position.y = 2.4; astro.add(shackle);

      // 레테(별자리 판)
      const rete = new THREE.Group(); astro.add(rete);
      const r1 = lineFrom(circlePoints(1.15, 120), M.line(C.pale, 0.8)); r1.rotation.x = Math.PI / 2; r1.position.set(0.25, 0.1, 0.02); rete.add(r1);
      const starPts = [];
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 0.55 : 1.45; starPts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, 0.03)); }
      rete.add(lineFrom(starPts, M.line(C.gold, 0.85)));
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2, rr = 0.7 + (i % 3) * 0.3;
        const st = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), M.goldGlow);
        st.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.04); rete.add(st);
      }
      // 시곗바늘
      const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.02), M.gold); hand1.geometry.translate(0, 0.8, 0); hand1.position.z = 0.06; astro.add(hand1);
      const hand2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.02), M.gold); hand2.geometry.translate(0, 0.55, 0); hand2.position.z = 0.07; astro.add(hand2);
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 20), M.goldGlow); pin.position.z = 0.08; astro.add(pin);

      // 3D 아밀러리 고리 (입체감)
      const orbitA = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.018, 8, 200), M.gold); astro.add(orbitA);
      const orbitB = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.012, 8, 200), M.gold); astro.add(orbitB);

      // 받침
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 12), M.gold); stand.position.y = 0.55; g.add(stand);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.12, 48), M.navyMetal); foot.position.y = 0.06; g.add(foot);

      // 모래시계
      const hg = new THREE.Group(); hg.position.set(-2.4, 0, 1.6); g.add(hg);
      const glassPts = [];
      for (let i = 0; i <= 30; i++) { const y = i / 30; const w = 0.05 + Math.pow(Math.abs(Math.cos(y * Math.PI)), 1.4) * 0.34; glassPts.push(new THREE.Vector2(w, y * 1.4)); }
      const hgGlass = new THREE.Mesh(new THREE.LatheGeometry(glassPts, 40), M.glass); hgGlass.position.y = 0.12; hg.add(hgGlass);
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xe9c46a, emissive: 0xb07a1c, emissiveIntensity: 0.5, roughness: 0.8 });
      const sandTop = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.35, 32), sandMat); sandTop.rotation.x = Math.PI; sandTop.position.y = 0.12 + 1.0; hg.add(sandTop);
      const sandBot = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 32), sandMat); sandBot.position.y = 0.12 + 0.17; hg.add(sandBot);
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.55, 6), sandMat); stream.position.y = 0.12 + 0.55; hg.add(stream);
      [0.06, 1.58].forEach((y) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.08, 40), M.gold); d.position.y = y; hg.add(d); });
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), M.gold); post.position.set(Math.cos(a) * 0.42, 0.82, Math.sin(a) * 0.42); hg.add(post); }

      const al = new THREE.PointLight(0xffcf8a, 8, 12, 1.7); al.position.set(-0.5, 4, 2.2); g.add(al);
      const glowS = glow(0xffd27a, 5.5, 0.18); glowS.position.set(0, 3.4, -0.3); g.add(glowS);

      animators.push((t, dt, near) => {
        sig.rotation.y = t * 0.03;
        if (!near) return;
        rete.rotation.z = t * 0.08;
        hand1.rotation.z = -t * 0.5;
        hand2.rotation.z = -t * 0.06;
        orbitA.rotation.set(t * 0.2, t * 0.12, 0);
        orbitB.rotation.set(-t * 0.1, Math.PI / 3 + t * 0.15, 0);
        astro.position.y = 3.4 + Math.sin(t * 0.6) * 0.06;
        const k = (t * 0.05) % 1;
        sandTop.scale.set(1 - k * 0.7, 1 - k * 0.7, 1 - k * 0.7);
        sandBot.scale.set(0.3 + k * 0.7, 0.3 + k * 0.7, 0.3 + k * 0.7);
      });
    })();

    /* ======================================================================
       5 · 홀로그램 지도 테이블
       ====================================================================== */
    function mapTexture() {
      const S = 1024;
      const [c, g] = makeCanvas(S, S);
      g.fillStyle = "#081232"; g.fillRect(0, 0, S, S);
      const rnd = seeded(2026);
      // 블록
      for (let i = 0; i < 140; i++) {
        g.fillStyle = `rgba(143,212,232,${0.04 + rnd() * 0.08})`;
        g.fillRect(rnd() * S, rnd() * S, 30 + rnd() * 80, 30 + rnd() * 80);
      }
      // 격자
      g.strokeStyle = "rgba(143,212,232,.12)"; g.lineWidth = 1;
      for (let i = 0; i <= S; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
      // 하천
      g.strokeStyle = "rgba(143,212,232,.55)"; g.lineWidth = 22; g.lineCap = "round";
      g.beginPath(); g.moveTo(-20, 760); g.bezierCurveTo(260, 640, 420, 900, 700, 760); g.bezierCurveTo(860, 690, 940, 540, 1050, 520); g.stroke();
      // 도로
      g.strokeStyle = "rgba(235,217,166,.75)"; g.lineWidth = 7;
      [[0, 300, 1024, 380], [380, 0, 460, 1024], [0, 560, 1024, 470], [700, 0, 620, 1024]].forEach(([a, b, cx, d]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(cx, d); g.stroke(); });
      g.strokeStyle = "rgba(235,217,166,.35)"; g.lineWidth = 3;
      for (let i = 0; i < 16; i++) { g.beginPath(); const x = rnd() * S, y = rnd() * S; g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 500, y + (rnd() - 0.5) * 500); g.stroke(); }
      // 캠퍼스 영역
      g.fillStyle = "rgba(235,217,166,.18)"; g.strokeStyle = "rgba(235,217,166,.9)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(470, 400); g.lineTo(620, 390); g.lineTo(640, 520); g.lineTo(480, 545); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = "#f3e2b0"; g.font = `600 34px Pretendard, sans-serif`; g.textAlign = "center";
      g.fillText("인덕대학교", 556, 600);
      // 원형 마스크 테두리
      g.globalCompositeOperation = "destination-in";
      const grd = g.createRadialGradient(S / 2, S / 2, S * 0.38, S / 2, S / 2, S * 0.5);
      grd.addColorStop(0, "rgba(0,0,0,1)"); grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd; g.fillRect(0, 0, S, S);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return t;
    }

    (function buildMapTable() {
      const g = new THREE.Group();
      g.position.set(-6.4, 0, -57);
      world.add(g);
      const sig = makeSigil(4, C.gold, 0.3);
      sig.position.y = 0.01; g.add(sig);

      const top = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.12, 96), M.lacquer); top.position.y = 1.0; g.add(top);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.045, 12, 160), M.gold); rim.rotation.x = Math.PI / 2; rim.position.y = 1.06; g.add(rim);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 0.95, 48), M.navyMetal); leg.position.y = 0.47; g.add(leg);
      const legRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 10, 64), M.gold); legRing.rotation.x = Math.PI / 2; legRing.position.y = 0.3; g.add(legRing);

      const map = new THREE.Mesh(new THREE.CircleGeometry(2.45, 96), new THREE.MeshBasicMaterial({ map: mapTexture(), transparent: true, toneMapped: false }));
      map.rotation.x = -Math.PI / 2; map.position.y = 1.065; g.add(map);

      // 홀로그램 원뿔
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 1.6, 2.6, 64, 1, true), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.06, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      cone.position.set(0.25, 2.4, -0.2); cone.rotation.x = Math.PI; g.add(cone);

      // 위치 핀 (지도 위 '인덕대학교' 지점 근처)
      const pinG = new THREE.Group(); pinG.position.set(0.22, 1.9, -0.18); g.add(pinG);
      const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), M.goldGlow); pinHead.position.y = 0.32; pinG.add(pinHead);
      const pinTip = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 32), M.gold); pinTip.rotation.x = Math.PI; pinTip.position.y = 0.0; pinG.add(pinTip);
      pinG.add(glow(0xffd27a, 1.6, 0.6));

      // 파동 링
      const pulses = [0, 1, 2].map((i) => {
        const r = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 64), new THREE.MeshBasicMaterial({ color: C.pale, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
        r.rotation.x = -Math.PI / 2; r.position.set(0.22, 1.075, -0.18); r.userData.o = i / 3;
        g.add(r); return r;
      });
      // 등고선
      const contours = [0.6, 1.0, 1.5].map((rr, i) => {
        const l = lineFrom(circlePoints(rr, 96), M.line(C.cyan, 0.35 - i * 0.08));
        l.position.set(0.22, 1.6 + i * 0.35, -0.18); g.add(l); return l;
      });

      const ml = new THREE.PointLight(C.cyan, 5, 9, 1.8); ml.position.set(0, 3, 0); g.add(ml);
      const ml2 = new THREE.PointLight(0xffd59a, 4, 8, 2); ml2.position.set(1.5, 2.5, 2); g.add(ml2);

      animators.push((t, dt, near) => {
        sig.rotation.y = -t * 0.03;
        if (!near) return;
        pinG.position.y = 1.9 + Math.sin(t * 2) * 0.1;
        pinG.rotation.y = t * 0.8;
        pulses.forEach((p) => {
          const k = (t * 0.45 + p.userData.o) % 1;
          p.scale.setScalar(1 + k * 7);
          p.material.opacity = (1 - k) * 0.55;
        });
        contours.forEach((c, i) => { c.rotation.y = t * (0.2 + i * 0.1); });
        cone.material.opacity = 0.05 + Math.sin(t * 2.4) * 0.015;
      });
    })();

    /* ======================================================================
       금빛 먼지 입자 (공간 전체)
       ====================================================================== */
    (function buildDust() {
      const N = opts.lowPower ? 700 : 1800;
      const pos = new Float32Array(N * 3), seed = new Float32Array(N), size = new Float32Array(N);
      const rnd = seeded(28);
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (rnd() - 0.5) * 28;
        pos[i * 3 + 1] = rnd() * 11;
        pos[i * 3 + 2] = 12 - rnd() * 80;
        seed[i] = rnd() * 100;
        size[i] = 0.4 + Math.pow(rnd(), 3) * 2.2;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
      geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uPR: { value: dpr }, uColor: { value: new THREE.Color(0xffd98a) } },
        vertexShader: `
          uniform float uTime; uniform float uPR;
          attribute float aSeed; attribute float aSize;
          varying float vA;
          void main(){
            vec3 p = position;
            p.y += sin(uTime*0.25 + aSeed)*0.35 + mod(uTime*0.08 + aSeed*0.13, 11.0) - 5.5;
            p.y = mod(p.y, 11.0);
            p.x += sin(uTime*0.2 + aSeed*1.7)*0.4;
            vec4 mv = modelViewMatrix * vec4(p,1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = aSize * uPR * (34.0 / -mv.z);
            float tw = 0.55 + 0.45*sin(uTime*1.6 + aSeed*3.0);
            vA = tw * smoothstep(42.0, 6.0, -mv.z);
          }`,
        fragmentShader: `
          uniform vec3 uColor; varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uColor, a*a*vA*0.85);
          }`
      });
      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      scene.add(pts);
      animators.push((t) => { mat.uniforms.uTime.value = t; });
      dust = mat;
    })();
    var dust;

    report(0.85);

    /* ======================================================================
       포스트 프로세싱
       ====================================================================== */
    let composer = null, bloom = null;
    if (post) {
      composer = new post.EffectComposer(renderer);
      composer.setPixelRatio(dpr);
      composer.setSize(window.innerWidth, window.innerHeight);
      composer.addPass(new post.RenderPass(scene, camera));
      bloom = new post.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.62, 0.55, 0.78);
      composer.addPass(bloom);
      composer.addPass(new post.OutputPass());
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
    const vCam = new THREE.Vector3(), vLook = new THREE.Vector3(), vObj = new THREE.Vector3();
    let narrow = window.innerWidth < 900;

    function placeCamera(s) {
      const e = clamp(dwell(s), 0, last) / last;
      camCurve.getPoint(e, vCam);
      lookCurve.getPoint(e, vLook);
      if (narrow) {
        // 모바일: 패널이 화면 전체를 덮으므로 오브젝트를 중앙·상단에 두고 카메라를 조금 뒤로
        objCurve.getPoint(e, vObj);
        vLook.lerp(vObj, 0.85);
        vLook.y -= 0.9;
        const back = vCam.clone().sub(vLook).normalize().multiplyScalar(2.2);
        vCam.add(back);
      }
      vCam.x += pointer.sx * 0.45;
      vCam.y += pointer.sy * 0.25;
      camera.position.copy(vCam);
      camera.lookAt(vLook);
    }

    /* ---------- Picking ---------- */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hoveredId = null;
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
    // 적응형 해상도: 처음 3초 평균 FPS가 낮으면 픽셀 비율을 낮춤
    let perfFrames = 0, perfTime = 0, perfDone = false;
    const nearDist = 1.25;

    function frame() {
      rafId = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!opts.reducedMotion) elapsed += dt;

      const k = opts.reducedMotion ? 1 : 1 - Math.pow(0.0025, dt); // 프레임 독립 감쇠
      current += (target - current) * k;
      pointer.sx += (pointer.x - pointer.sx) * (1 - Math.pow(0.02, dt));
      pointer.sy += (pointer.y - pointer.sy) * (1 - Math.pow(0.02, dt));
      placeCamera(current);

      for (let i = 0; i < animators.length; i++) {
        // 마지막 animator는 먼지, 그 외 station별로 근접할 때만 연산
        animators[i](elapsed, dt, Math.abs(current - Math.min(i, last)) < nearDist + 0.6 || i >= last + 1);
      }

      if (composer) composer.render(); else renderer.render(scene, camera);

      if (!perfDone) {
        perfFrames++; perfTime += dt;
        if (perfTime > 3) {
          perfDone = true;
          const fps = perfFrames / perfTime;
          if (fps < 42 && dpr > 1) { dpr = 1; applySize(); }
          if (fps < 30 && bloom) { bloom.enabled = false; }
        }
      }
    }

    function applySize() {
      const w = window.innerWidth, h = window.innerHeight;
      narrow = w < 900;
      camera.aspect = w / h;
      camera.fov = w / h < 0.8 ? 62 : w / h < 1.2 ? 52 : 45;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      if (composer) { composer.setPixelRatio(dpr); composer.setSize(w, h); }
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

    /* ---------- Public API ---------- */
    return {
      setStation(s) { target = clamp(s, 0, last); },
      jump(s) { target = current = clamp(s, 0, last); },
      setPointer(x, y) { pointer.x = x; pointer.y = y; },
      resize: applySize,
      pick,
      hover(clientX, clientY) {
        const id = clientX == null ? null : pick(clientX, clientY);
        hoveredId = id;
        return id;
      },
      highlight(id) { hoveredId = id; },
      get station() { return current; }
    };
  }

  window.AlchemyScene = { create, STATION_COUNT: STATIONS.length };
})();
