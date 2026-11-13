/* ==========================================================================
   Hero 3D — "The Atelier"
   --------------------------------------------------------------------------
   첫 화면을 실시간 3D 공간으로 렌더링합니다.
     · 딥 버건디 벨벳 커튼 (sheen 재질 + 주름을 직접 계산한 지오메트리)
     · 블랙 스커트 수트를 입은 드레스폼(마네킹)
     · 벨벳 테이블 위 진주 목걸이 · 가죽 핸드백 · 향수병
     · 투명 아크릴 위 8mm 필름 영사기, 유리 화병의 흰 꽃, 책 (CC0 3D 모델)
     · 포토월 · 유리 커튼월 · 샴페인 골드 빛 스트링 · 도시 야경
     · 유리 리본과 빛의 궤적, 반사되는 블랙 바닥, 블룸
   --------------------------------------------------------------------------
   외부 3D 모델 (모두 CDN에서 불러오며, 실패해도 장면은 정상 표시됩니다)
     · GlassVaseFlowers — Khronos glTF Sample Assets (CC0)
     · filmstrip_projector_8mm, book_encyclopedia_set_01 — Poly Haven (CC0)
   데스크톱(가로 1024px 이상, WebGL2)에서만 실행되며, 그 외에는 사진이 그대로 보입니다.
   ========================================================================== */
(function () {
  "use strict";

  const MODELS = {
    vase: "https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Assets@main/Models/GlassVaseFlowers/glTF-Binary/GlassVaseFlowers.glb",
    projector: "https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/filmstrip_projector_8mm/filmstrip_projector_8mm_1k.gltf",
    books: "https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/book_encyclopedia_set_01/book_encyclopedia_set_01_1k.gltf"
  };

  const P = {
    burgundy: 0x4a101c,
    obsidian: 0x171315,
    gold: 0xd6b58a,
    fog: 0x120c0e
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function canvas2d(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }

  /* ======================================================================
     create(canvas, { base, onProgress }) → Promise<api>
     ====================================================================== */
  async function create(canvas, options) {
    const opts = Object.assign({ base: "assets/images/hero3d/", onProgress: () => {}, models: true }, options);
    const progress = (p) => { try { opts.onProgress(p); } catch (_) {} };

    const THREE = await import("three");
    const [{ Reflector }, { RoundedBoxGeometry }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import("three/addons/objects/Reflector.js"),
      import("three/addons/geometries/RoundedBoxGeometry.js"),
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
      import("three/addons/postprocessing/OutputPass.js")
    ]);
    progress(0.3);

    /* ---------- Renderer ---------- */
    const W = () => canvas.clientWidth || window.innerWidth;
    const H = () => canvas.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(dpr);
    renderer.setSize(W(), H(), false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0a0b);
    scene.fog = new THREE.FogExp2(P.fog, 0.042);

    const camera = new THREE.PerspectiveCamera(30, W() / H(), 0.1, 120);

    /* ---------- 환경광: 따뜻한 소프트박스 + 버건디 패널로 직접 만든 스튜디오 ---------- */
    (function buildEnvironment() {
      const env = new THREE.Scene();
      env.background = new THREE.Color(0x080506);
      const panel = (w, h, color, k, pos, look) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(...pos); m.lookAt(...look); env.add(m);
      };
      panel(5, 1.6, 0xffe1c2, 4.2, [1, 7, 3], [0, 0, 0]);       // 천장 소프트박스
      panel(2, 5, 0xffd2a6, 2.2, [7, 2.5, 3], [0, 1, 0]);       // 오른쪽 스트립
      panel(5, 6, 0x6a1424, 1.1, [-7, 2.5, 0], [0, 1, 0]);      // 왼쪽 버건디(커튼 반사)
      for (let i = 0; i < 9; i++) panel(0.08, 6, 0xffcf96, 5, [-4 + i, 2.5, -7], [-4 + i, 2.5, 0]); // 뒤쪽 빛 기둥
      panel(14, 3, 0x2a1d1c, 1, [0, 1.2, -8], [0, 1.2, 0]);     // 도시 야경
      const pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(env, 0.02).texture;
      pm.dispose();
    })();

    /* ---------- 공용 텍스처 ---------- */
    const tex = new THREE.TextureLoader();
    function loadTex(name, srgb = true) {
      const t = tex.load(opts.base + name, undefined, undefined, () => {});
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    }
    // 원단 결 노멀맵 (트윌 패턴 노이즈)
    function fabricNormal(size, freq, strength) {
      const [c, g] = canvas2d(size, size);
      const img = g.createImageData(size, size);
      const rnd = seeded(7);
      const hgt = new Float32Array(size * size);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        hgt[y * size + x] = Math.sin((x + y) * freq) * 0.5 + (rnd() - 0.5) * 0.6;
      }
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const l = hgt[y * size + ((x - 1 + size) % size)], r = hgt[y * size + ((x + 1) % size)];
        const u = hgt[((y - 1 + size) % size) * size + x], d = hgt[((y + 1) % size) * size + x];
        const nx = (l - r) * strength, ny = (u - d) * strength, nz = 1;
        const len = Math.hypot(nx, ny, nz), i = (y * size + x) * 4;
        img.data[i] = (nx / len * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / len * 0.5 + 0.5) * 255; img.data[i + 2] = (nz / len * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }
    const glowTex = (function () {
      const [c, g] = canvas2d(128, 128);
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.12, "rgba(255,240,215,0.9)");
      grd.addColorStop(0.35, "rgba(255,205,150,0.25)"); grd.addColorStop(1, "rgba(255,200,140,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = "rgba(255,230,190,0.5)"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(64, 10); g.lineTo(64, 118); g.moveTo(10, 64); g.lineTo(118, 64); g.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();

    /* ---------- Materials ---------- */
    const twill = fabricNormal(256, 1.4, 1.2);
    twill.repeat.set(10, 10);
    const M = {
      velvetTop: new THREE.MeshPhysicalMaterial({ color: 0x24060c, roughness: 0.9, sheen: 0.6, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x8a2236), envMapIntensity: 0.25 }),
      velvetCloth: new THREE.MeshPhysicalMaterial({ color: 0x2c070f, roughness: 0.85, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(0x9a2a40), envMapIntensity: 0.3, side: THREE.DoubleSide }),
      velvet: new THREE.MeshPhysicalMaterial({ color: 0x3e0b16, roughness: 0.82, metalness: 0, sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color(0xd2405d), envMapIntensity: 0.35, side: THREE.DoubleSide }),
      suit: new THREE.MeshPhysicalMaterial({ color: 0x141012, roughness: 0.72, metalness: 0, sheen: 0.7, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x6a5a60), normalMap: twill, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 0.5 }),
      lapel: new THREE.MeshPhysicalMaterial({ color: 0x0f0c0d, roughness: 0.4, sheen: 0.6, sheenColor: new THREE.Color(0x8a7a80), envMapIntensity: 0.7 }),
      shirt: new THREE.MeshPhysicalMaterial({ color: 0xd9d1c6, roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 0.6 }),
      linen: new THREE.MeshStandardMaterial({ color: 0xa8998a, roughness: 0.9 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xd8b47c, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xb08d5e, metalness: 1, roughness: 0.38, envMapIntensity: 1.1 }),
      leather: new THREE.MeshPhysicalMaterial({ color: 0x0c0a0a, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35, envMapIntensity: 0.9 }),
      lacquer: new THREE.MeshPhysicalMaterial({ color: 0x0b0909, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 }),
      pearl: new THREE.MeshPhysicalMaterial({ color: 0xf3ece2, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 600], envMapIntensity: 1.4 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, transmission: 1, thickness: 0.6, ior: 1.5, envMapIntensity: 1.6, specularIntensity: 1 }),
      acrylic: new THREE.MeshPhysicalMaterial({ color: 0xfaf4ee, roughness: 0.06, transmission: 1, thickness: 0.8, ior: 1.49, envMapIntensity: 1.5, attenuationColor: new THREE.Color(0xe8d8c8), attenuationDistance: 3 }),
      pane: new THREE.MeshPhysicalMaterial({ color: 0x1b1416, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.32, envMapIntensity: 1.4, depthWrite: false }),
      board: new THREE.MeshStandardMaterial({ color: 0xece4d8, roughness: 0.85 }),
      glow: (k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.78, 0.52).multiplyScalar(k), toneMapped: false }),
      line: (k, o) => new THREE.LineBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.56).multiplyScalar(k), transparent: true, opacity: o == null ? 1 : o, toneMapped: false, depthWrite: false })
    };

    const world = new THREE.Group();
    scene.add(world);
    const tickers = [];
    const shadow = (m, c = true, r = true) => { m.castShadow = c; m.receiveShadow = r; return m; };

    /* ======================================================================
       바닥 — 블랙 대리석 위 반사
       ====================================================================== */
    let reflector;
    (function buildFloor() {
      reflector = new Reflector(new THREE.PlaneGeometry(40, 40), {
        textureWidth: Math.round(W() * dpr * 0.5), textureHeight: Math.round(H() * dpr * 0.5),
        color: 0x8a7f80, clipBias: 0.003
      });
      reflector.rotation.x = -Math.PI / 2;
      reflector.position.set(0, -0.001, -6);
      world.add(reflector);
      // 반사를 은은하게 덮는 광택 바닥(그림자를 받음)
      const [c, g] = canvas2d(512, 512);
      g.fillStyle = "#0c0909"; g.fillRect(0, 0, 512, 512);
      const rnd = seeded(3);
      for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(120,100,95,${0.03 + rnd() * 0.05})`; g.lineWidth = 0.6 + rnd() * 1.6; g.beginPath(); let x = rnd() * 512, y = rnd() * 512; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - 0.4) * 140; y += (rnd() - 0.5) * 90; g.lineTo(x, y); } g.stroke(); }
      g.strokeStyle = "rgba(160,130,110,0.10)"; g.lineWidth = 1.2; g.strokeRect(0.5, 0.5, 511, 511);
      const ft = new THREE.CanvasTexture(c); ft.colorSpace = THREE.SRGBColorSpace; ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(16, 16); ft.anisotropy = 8;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: ft, color: 0xffffff, roughness: 0.32, metalness: 0.1, transparent: true, opacity: 0.8, envMapIntensity: 0.6 }));
      floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -6);
      floor.receiveShadow = true;
      world.add(floor);
    })();

    /* ======================================================================
       벨벳 커튼 — 주름 · 타이백 · 바닥 끌림을 직접 계산
       ====================================================================== */
    function curtain(width, height, folds, opt) {
      const o = Object.assign({ tieV: 0.36, tie: 0.62, side: -1, seed: 1, depth: 0.075 }, opt);
      const g = new THREE.PlaneGeometry(width, height, 220, 90);
      const p = g.attributes.position;
      const rnd = seeded(o.seed);
      const ph = Array.from({ length: 4 }, () => rnd() * 6.28);
      const pivot = o.side * width / 2; // 타이백으로 모이는 쪽
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i);
        const u = x / width + 0.5, v = y / height + 0.5;
        const pinch = o.tie * Math.exp(-Math.pow((v - o.tieV) / 0.16, 2)) + o.tie * 0.55 * smoothstep(o.tieV, 0, v) * (v < o.tieV ? 1 : 0);
        const s = 1 - clamp(pinch, 0, 0.85);
        let nx = pivot + (x - pivot) * s;
        nx += o.side * -0.18 * smoothstep(0.25, 0, v) * (1 - u * 0.5); // 바닥에서 살짝 퍼짐
        const amp = o.depth * (0.65 + 0.35 * (1 - v)) * (1 + 1.6 * (1 - s));
        let z = amp * (Math.sin(u * folds * 6.283 + ph[0]) * 0.7 + Math.sin(u * folds * 2.3 * 6.283 + ph[1]) * 0.25 + Math.sin(u * folds * 0.45 * 6.283 + ph[2]) * 0.6);
        z += 0.12 * Math.sin(v * 3.1 + ph[3]) * (1 - s);                 // 늘어진 곡선
        const yy = y - 0.05 * Math.pow(1 - s, 2) * Math.sin(u * 3.14);     // 묶인 부분의 처짐
        p.setXYZ(i, nx, yy, z);
      }
      g.computeVertexNormals();
      const m = shadow(new THREE.Mesh(g, M.velvet), true, true);
      return m;
    }
    (function buildCurtains() {
      const c1 = curtain(3.6, 5.2, 7, { side: -1, seed: 4, tie: 0.58, tieV: 0.34 });
      c1.position.set(-1.3, 2.6, -0.65); c1.rotation.y = 0.18;
      world.add(c1);
      const c2 = curtain(2.6, 5.4, 6, { side: -1, seed: 9, tie: 0.35, tieV: 0.3, depth: 0.09 });
      c2.position.set(-2.7, 2.7, -1.5); c2.rotation.y = 0.32;
      world.add(c2);
      // 상단 발란스(가로로 늘어진 주름)
      const val = curtain(5.2, 0.9, 11, { side: 1, seed: 2, tie: 0, depth: 0.06 });
      val.position.set(-0.8, 5.0, -0.7); val.rotation.y = 0.12;
      world.add(val);
      // 커튼 타이백 골드 링
      const tb = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 12, 48), M.gold);
      tb.position.set(-2.7, 2.35, -0.48); tb.rotation.set(0.2, 0.9, 0); world.add(tb);
      tickers.push((t) => { c1.rotation.z = Math.sin(t * 0.4) * 0.004; c2.rotation.z = Math.sin(t * 0.33 + 1) * 0.005; });
    })();

    /* ======================================================================
       드레스폼 + 블랙 스커트 수트
       ====================================================================== */
    const FORM_POS = new THREE.Vector3(1.5, 0.52, -0.45);
    (function buildDressForm() {
      const g = new THREE.Group();
      g.position.copy(FORM_POS);
      g.rotation.y = -0.18;
      g.scale.setScalar(1.14);
      world.add(g);
      const ZS = 0.66, KS = 0.26, SY0 = 1.04, SY1 = 1.3; // 앞뒤 납작함 · 어깨 폭
      const V = (r, y) => new THREE.Vector2(r, y);
      const JP = [V(0.214, 0.6), V(0.206, 0.64), V(0.178, 0.72), V(0.154, 0.8), V(0.16, 0.86), V(0.181, 0.94), V(0.196, 1.02), V(0.2, 1.1), V(0.193, 1.16), V(0.17, 1.21), V(0.118, 1.255), V(0.076, 1.282), V(0.066, 1.3)];
      const widen = (y) => smoothstep(SY0, SY0 + 0.14, y) * (1 - smoothstep(SY1 - 0.05, SY1, y));
      const shape = (geo, k) => {
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 + k * widen(y))); p.setZ(i, p.getZ(i) * ZS); }
        geo.computeVertexNormals();
        return geo;
      };

      // 재킷 앞판: 셔츠 V존 · 새틴 라펠 · 단추를 원통 UV에 직접 그려 몸판 곡면에 정확히 붙임
      const jacketMap = (function () {
        const Wt = 2048, Ht = 1024;
        const [c, gx] = canvas2d(Wt, Ht);
        gx.fillStyle = "#16121a"; gx.fillRect(0, 0, Wt, Ht);
        gx.fillStyle = "#141013"; gx.fillRect(0, 0, Wt, Ht);
        const ys = JP.map((q) => q.y), rs = JP.map((q) => q.x);
        const vOf = (y) => { for (let j = 0; j < ys.length - 1; j++) if (y <= ys[j + 1]) return (j + (y - ys[j]) / (ys[j + 1] - ys[j])) / (ys.length - 1); return 1; };
        const rOf = (y) => { for (let j = 0; j < ys.length - 1; j++) if (y <= ys[j + 1]) return lerp(rs[j], rs[j + 1], (y - ys[j]) / (ys[j + 1] - ys[j])); return rs[rs.length - 1]; };
        const uv = (x, y) => { const rx = rOf(y) * (1 + KS * widen(y)); const phi = Math.asin(clamp(x / rx, -1, 1)); return [phi / (Math.PI * 2) * Wt, (1 - vOf(y)) * Ht]; };
        const poly = (pts, fill) => {
          [0, Wt].forEach((off) => {
            gx.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = uv(x, y); i ? gx.lineTo(px + off, py) : gx.moveTo(px + off, py); }); gx.closePath();
            gx.fillStyle = fill; gx.fill();
          });
        };
        // 셔츠 V존
        poly([[-0.062, 1.3], [-0.058, 1.26], [0, 0.95], [0.058, 1.26], [0.062, 1.3]], "#ece6dd");
        [-1, 1].forEach((s) => {
          // 셔츠 칼라
          poly([[s * 0.01, 1.3], [s * 0.07, 1.295], [s * 0.05, 1.205]], "#f6f1ea");
          // 새틴 라펠
          poly([[s * 0.06, 1.29], [s * 0.115, 1.215], [s * 0.15, 1.13], [s * 0.112, 1.1], [s * 0.07, 1.0], [s * 0.004, 0.935], [s * 0.054, 1.24]], "#2b2428");
          poly([[s * 0.115, 1.215], [s * 0.15, 1.13], [s * 0.112, 1.1]], "#0c0a0b"); // 노치 그림자
          // 라펠 하이라이트 선
          [0, Wt].forEach((off) => {
            gx.strokeStyle = "rgba(190,170,175,0.35)"; gx.lineWidth = 2; gx.beginPath();
            [[s * 0.15, 1.13], [s * 0.112, 1.1], [s * 0.07, 1.0], [s * 0.004, 0.935]].forEach(([x, y], i) => { const [px, py] = uv(x, y); i ? gx.lineTo(px + off, py) : gx.moveTo(px + off, py); });
            gx.stroke();
          });
          // 가슴 포켓 웰트
          poly([[s * 0.1, 1.055], [s * 0.16, 1.06], [s * 0.16, 1.05], [s * 0.1, 1.045]], "#2a2326");
        });
        // 앞여밈 라인 + 단추
        [0, Wt].forEach((off) => {
          gx.strokeStyle = "rgba(0,0,0,0.6)"; gx.lineWidth = 2; gx.beginPath();
          let [x0, y0] = uv(0.004, 0.935); gx.moveTo(x0 + off, y0); let [x1, y1] = uv(0.03, 0.6); gx.lineTo(x1 + off, y1); gx.stroke();
          [[0.006, 0.9]].forEach(([x, y]) => { const [px, py] = uv(x, y); gx.fillStyle = "#050404"; gx.beginPath(); gx.arc(px + off, py, 9, 0, 6.283); gx.fill(); gx.strokeStyle = "rgba(200,180,150,0.5)"; gx.stroke(); });
        });
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
        return t;
      })();
      const jacketMat = M.suit.clone(); jacketMat.map = jacketMap; jacketMat.color.set(0xffffff);

      const jacket = shape(new THREE.LatheGeometry(JP, 128), KS);
      g.add(shadow(new THREE.Mesh(jacket, jacketMat)));
      const skirt = shape(new THREE.LatheGeometry([V(0.163, 0.0), V(0.172, 0.18), V(0.186, 0.42), V(0.19, 0.56), V(0.17, 0.7), V(0.15, 0.79)], 96), 0);
      g.add(shadow(new THREE.Mesh(skirt, M.suit)));
      // 스커트 뒤트임 라인 대신 앞쪽 주름 한 줄
      // 목 · 캡 · 피니얼 (드레스폼)
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.064, 0.09, 48), M.linen); neck.position.y = 1.33; neck.scale.z = 0.9; g.add(shadow(neck));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.058, 0.018, 48), M.brass); cap.position.y = 1.384; g.add(cap);
      const knobStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 16), M.brass); knobStem.position.y = 1.42; g.add(knobStem);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 24, 16), M.brass); knob.position.y = 1.46; knob.scale.y = 1.3; g.add(shadow(knob));
      [-1, 1].forEach((s) => {
        // 소매 — 어깨선에서 자연스럽게 떨어지도록
        const sleevePts = [[0.222, 1.165, -0.005], [0.243, 1.04, 0.0], [0.246, 0.84, 0.025], [0.232, 0.63, 0.045]].map(([x, y, z]) => new THREE.Vector3(s * x, y, z));
        const sleeve = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sleevePts), 48, 0.047, 28, false), M.suit);
        sleeve.scale.z = 0.92; g.add(shadow(sleeve));
        const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 28, 18), M.suit); shoulderCap.position.set(s * 0.218, 1.163, -0.005); shoulderCap.scale.set(1.05, 0.62, 0.9); g.add(shadow(shoulderCap));
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.02, 24), M.shirt); cuff.position.set(s * 0.232, 0.612, 0.045); g.add(cuff);
        // 포켓 플랩
        const flap = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.026, 0.01, 2, 0.004), M.suit); flap.position.set(s * 0.12, 0.7, 0.124); flap.rotation.y = s * 0.5; g.add(flap);
      });
      // 벨트 + 골드 버클
      const belt = new THREE.Mesh(new THREE.TorusGeometry(0.157, 0.012, 12, 96), M.leather); belt.rotation.x = Math.PI / 2; belt.scale.set(1, ZS, 1); belt.position.y = 0.8; g.add(shadow(belt));
      const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0035, 8, 4), M.gold); buckle.rotation.z = Math.PI / 4; buckle.scale.set(1.35, 0.9, 1); buckle.position.set(0, 0.8, 0.107); g.add(buckle);
      // 브로치
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.007, 16, 12), M.gold); pin.position.set(-0.115, 1.1, 0.128); g.add(pin);
      // 스탠드
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, FORM_POS.y / 1.14 + 0.02, 16), M.brass); pole.position.y = -FORM_POS.y / 1.14 / 2; g.add(shadow(pole));
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.4, 12), M.brass);
        leg.position.set(Math.cos(a) * 0.16, -FORM_POS.y / 1.14 + 0.06, Math.sin(a) * 0.16);
        leg.lookAt(0, -FORM_POS.y / 1.14 + 0.2, 0); leg.rotateX(Math.PI / 2);
        g.add(shadow(leg));
      }
    })();

    /* ======================================================================
       벨벳 테이블 · 진주 목걸이 · 핸드백 · 향수
       ====================================================================== */
    const TABLE = new THREE.Vector3(1.35, 0, 0.75);
    (function buildTable() {
      const g = new THREE.Group(); g.position.copy(TABLE); world.add(g);
      const R = 0.54, Hh = 0.76;
      const cloth = new THREE.CylinderGeometry(R, R + 0.07, Hh, 180, 30, true);
      const p = cloth.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const a = Math.atan2(z, x), h = (y + Hh / 2) / Hh; // 0 바닥 → 1 윗면
        const fold = Math.sin(a * 23) * 0.6 + Math.sin(a * 9 + 1.3) * 0.4;
        const k = 1 + fold * 0.035 * Math.pow(1 - h, 1.3) + 0.03 * (1 - h);
        p.setXYZ(i, x * k, y, z * k);
      }
      cloth.computeVertexNormals();
      const cm = shadow(new THREE.Mesh(cloth, M.velvetCloth)); cm.position.y = Hh / 2; g.add(cm);
      const top = shadow(new THREE.Mesh(new THREE.CircleGeometry(R, 96), M.velvetTop)); top.rotation.x = -Math.PI / 2; top.position.y = Hh; g.add(top);
      const edge = shadow(new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 16, 160), M.velvetCloth)); edge.rotation.x = Math.PI / 2; edge.position.y = Hh - 0.005; g.add(edge);

      // 진주 목걸이 — 테이블 위에서 가장자리를 넘어 늘어짐
      const pts = [];
      for (let i = 0; i <= 60; i++) {
        const u = i / 60;
        const a = -0.2 + u * 2.4;
        let x = Math.cos(a) * 0.24 + 0.1, z = Math.sin(a) * 0.15 + 0.24, y = Hh + 0.009;
        const out = Math.hypot(x, z);
        if (out > R - 0.01) { const drop = (out - (R - 0.01)) * 2.2; x *= (R + 0.01) / out; z *= (R + 0.01) / out; y = Hh - drop; }
        pts.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const N = 120;
      const pearls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0095, 16, 12), M.pearl, N);
      const m4 = new THREE.Matrix4(), v = new THREE.Vector3();
      for (let i = 0; i < N; i++) { curve.getPointAt(i / (N - 1), v); m4.makeTranslation(v.x, v.y, v.z); pearls.setMatrixAt(i, m4); }
      pearls.castShadow = true;
      g.add(pearls);

      // 가죽 핸드백
      const bag = new THREE.Group(); bag.position.set(-0.05, Hh, -0.1); bag.rotation.y = 0.35; g.add(bag);
      const body = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.27, 0.17, 0.1, 4, 0.025), M.leather)); body.position.y = 0.085; bag.add(body);
      const flap = shadow(new THREE.Mesh(new RoundedBoxGeometry(0.272, 0.09, 0.012, 3, 0.005), M.leather)); flap.position.set(0, 0.13, 0.052); flap.rotation.x = -0.08; bag.add(flap);
      const clasp = new THREE.Mesh(new RoundedBoxGeometry(0.042, 0.026, 0.01, 2, 0.003), M.gold); clasp.position.set(0, 0.105, 0.06); bag.add(clasp);
      const handle = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 12, 48, Math.PI), M.leather)); handle.position.y = 0.17; bag.add(handle);
      [-1, 1].forEach((s) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.003, 8, 20), M.gold); r.position.set(s * 0.075, 0.172, 0); bag.add(r); });

      // 향수병 (유리 + 골드 캡)
      const pf = new THREE.Group(); pf.position.set(0.28, Hh, -0.16); g.add(pf);
      const bottle = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.1, 0.045, 3, 0.01), M.glass); bottle.position.y = 0.05; pf.add(bottle);
      const juice = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.032), new THREE.MeshPhysicalMaterial({ color: 0xd9a46a, roughness: 0.1, transmission: 0.6, thickness: 0.05, envMapIntensity: 1 })); juice.position.y = 0.034; pf.add(juice);
      const pcap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.04, 24), M.gold); pcap.position.y = 0.12; pf.add(shadow(pcap));

      // 작은 골드 트레이 + 반지
      const tray = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.012, 48), M.gold)); tray.position.set(0.24, Hh + 0.006, 0.12); g.add(tray);
    })();

    /* ======================================================================
       포토월 · 유리 커튼월 · 빛 스트링
       ====================================================================== */
    (function buildBackdrop() {
      const g = new THREE.Group(); world.add(g);
      // 화이트 보드에 붙은 사진들
      const boards = [
        ["board-grid.jpg", 0.62, 0.88, [2.45, 1.42, -1.25], -0.12],
        ["board-heel.jpg", 0.66, 0.57, [2.15, 2.22, -1.35], -0.08],
        ["board-left.jpg", 0.48, 0.69, [0.62, 1.5, -1.25], 0.14],
        ["print-a.jpg", 0.3, 0.31, [1.38, 2.42, -1.55], 0.02],
        ["print-b.jpg", 0.3, 0.48, [3.28, 2.05, -1.35], -0.22],
        ["print-c.jpg", 0.26, 0.42, [3.86, 2.3, -1.62], -0.26]
      ];
      boards.forEach(([file, w, h, pos, ry]) => {
        const b = new THREE.Group(); b.position.set(...pos); b.rotation.y = ry; g.add(b);
        const back = shadow(new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, 0.012), M.board)); b.add(back);
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: loadTex(file), roughness: 0.75, color: 0xd8cfc6 }));
        pic.position.z = 0.007; pic.receiveShadow = true; b.add(pic);
        const clip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.018, 0.008), M.gold); clip.position.set(0, h / 2 + 0.005, 0.012); b.add(clip);
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 3.2, 6), M.brass); wire.position.y = h / 2 + 1.6; b.add(wire);
      });

      // 유리 커튼월 (반사 유리 + 골드 멀리언)
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(14, 6.5), M.pane); pane.position.set(1.2, 3.25, -2.3); g.add(pane);
      for (let i = 0; i < 15; i++) {
        const x = -4.4 + i * 0.82;
        const bright = i % 3 === 1 ? 1.45 : 0.66;
        const mull = new THREE.Mesh(new THREE.BoxGeometry(0.018, 6.5, 0.018), M.glow(bright)); mull.position.set(x, 3.25, -2.28); g.add(mull);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(14, 0.02, 0.02), M.glow(1.3)); rail.position.set(1.2, 4.6, -2.27); g.add(rail);

      // 빛 스트링 (반짝이는 전구 줄)
      const rnd = seeded(31);
      const pos = [], seeds = [];
      for (let s = 0; s < 26; s++) {
        const x = -3.6 + rnd() * 9.5, z = -1.9 - rnd() * 0.9;
        const n = 26 + Math.floor(rnd() * 14);
        for (let k = 0; k < n; k++) { pos.push(x + Math.sin(k * 0.7 + s) * 0.01, 4.8 - k * 0.17 - rnd() * 0.05, z); seeds.push(rnd() * 100); }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 1));
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        uniforms: { uTime: { value: 0 }, uMap: { value: glowTex }, uPR: { value: dpr } },
        vertexShader: `uniform float uTime; uniform float uPR; attribute float aSeed; varying float vA;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
            float tw = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * (0.8 + fract(aSeed) * 1.6) + aSeed), 2.0);
            vA = tw; gl_PointSize = (10.0 + 10.0 * tw) * uPR * (4.0 / -mv.z); }`,
        fragmentShader: `uniform sampler2D uMap; varying float vA;
          void main(){ vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.6, 1.22, 0.86) * c.rgb, c.a * vA); }`
      });
      const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; g.add(pts);
      tickers.push((t) => { mat.uniforms.uTime.value = t; });
    })();

    /* ======================================================================
       도시 야경 (원경)
       ====================================================================== */
    (function buildCity() {
      const g = new THREE.Group(); world.add(g);
      const [c, gx] = canvas2d(256, 512);
      gx.fillStyle = "#050404"; gx.fillRect(0, 0, 256, 512);
      const rnd = seeded(77);
      for (let y = 8; y < 512; y += 14) for (let x = 6; x < 256; x += 12) {
        if (rnd() < 0.42) { const b = 120 + rnd() * 135; gx.fillStyle = `rgb(${b},${b * 0.82 | 0},${b * 0.6 | 0})`; gx.fillRect(x, y, 6, 8); }
      }
      const win = new THREE.CanvasTexture(c); win.colorSpace = THREE.SRGBColorSpace; win.wrapS = win.wrapT = THREE.RepeatWrapping;
      const r2 = seeded(5);
      for (let i = 0; i < 46; i++) {
        const w = 1.2 + r2() * 2.4, h = 4 + Math.pow(r2(), 1.6) * 16, d = 1.5 + r2() * 2;
        const x = -18 + r2() * 42, z = -26 - r2() * 20;
        const t = win.clone(); t.needsUpdate = true; t.repeat.set(w / 1.6, h / 3.2);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: 0x0b0909, roughness: 0.6, metalness: 0.4, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.75 }));
        m.position.set(x, h / 2, z); g.add(m);
      }
      // 첨탑 빌딩 (컨셉아트의 랜드마크)
      const spire = new THREE.Group(); spire.position.set(6.5, 0, -30); g.add(spire);
      [[3, 10, 0], [2.2, 3, 10], [1.4, 2.4, 13], [0.8, 1.6, 15.4]].forEach(([w, h, y]) => {
        const t = win.clone(); t.needsUpdate = true; t.repeat.set(w / 1.4, h / 3);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ color: 0x0b0909, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.0, roughness: 0.5 }));
        m.position.y = y + h / 2; spire.add(m);
      });
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.25, 3.2, 8), M.glow(2.2)); tip.position.y = 18.6; spire.add(tip);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, 1.2, 0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      halo.position.y = 17.2; halo.scale.set(5, 5, 1); spire.add(halo);
    })();

    /* ======================================================================
       유리 리본 · 빛의 궤적
       ====================================================================== */
    const ribbonMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 2.2, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    function ribbon(points, width, twist, closed) {
      const curve = new THREE.CatmullRomCurve3(points, !!closed, "centripetal");
      const seg = 360;
      const frames = curve.computeFrenetFrames(seg, !!closed);
      const pos = [], idx = [], ea = [], eb = [];
      const p = new THREE.Vector3(), side = new THREE.Vector3();
      for (let i = 0; i <= seg; i++) {
        const u = i / seg; curve.getPointAt(u, p);
        const k = Math.min(i, frames.normals.length - 1);
        const a = twist * u * Math.PI * 2;
        side.copy(frames.binormals[k]).multiplyScalar(Math.cos(a)).addScaledVector(frames.normals[k], Math.sin(a)).normalize();
        const w = width * (0.35 + 0.65 * Math.sin(u * Math.PI));
        const A = p.clone().addScaledVector(side, w / 2), B = p.clone().addScaledVector(side, -w / 2);
        pos.push(A.x, A.y, A.z, B.x, B.y, B.z); ea.push(A); eb.push(B);
        if (i < seg) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const grp = new THREE.Group();
      grp.add(new THREE.Mesh(geo, ribbonMat));
      grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ea), M.line(2.2, 0.95)));
      grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(eb), M.line(1.1, 0.55)));
      grp.userData.edge = ea;
      return grp;
    }
    (function buildRibbons() {
      const V = (x, y, z) => new THREE.Vector3(x, y, z);
      const r1 = ribbon([V(-0.8, 3.55, -1.7), V(0.5, 3.2, -1.0), V(1.9, 3.35, -0.6), V(3.1, 3.1, -0.9), V(4.3, 3.5, -1.7)], 0.3, 0.25);
      const r2 = ribbon([V(-2.6, 0.2, 0.9), V(-1.7, 0.55, 1.2), V(-1.0, 0.95, 0.8), V(-1.4, 1.3, 0.2), V(-2.3, 1.1, 0.3), V(-2.9, 0.7, 0.9)], 0.14, 0.6);
      const r3 = ribbon([V(2.3, 0.2, 1.7), V(3.0, 0.75, 1.1), V(3.3, 1.65, 0.2), V(3.1, 2.6, -0.8)], 0.2, 0.4);
      world.add(r1, r2, r3);
      // 리본을 따라 흐르는 빛
      const runners = [];
      [r1, r2, r3].forEach((r, ri) => {
        for (let k = 0; k < 4; k++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(2.2, 1.7, 1.15), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
          s.scale.setScalar(0.14 + (k % 2) * 0.08); world.add(s);
          runners.push({ s, e: r.userData.edge, o: k / 4 + ri * 0.13, sp: 0.018 + ri * 0.006 });
        }
        // 고정된 반짝임
        for (let k = 0; k < 7; k++) {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.8, 1.4, 1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
          const e = r.userData.edge; s.position.copy(e[Math.floor(((k + 0.5) / 7) * (e.length - 1))]); s.scale.setScalar(0.07); world.add(s);
          runners.push({ s, fixed: true, ph: k * 1.7 + ri });
        }
      });
      tickers.push((t) => {
        runners.forEach((r) => {
          if (r.fixed) { r.s.material.opacity = 0.4 + 0.6 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.3 + r.ph), 3); return; }
          const u = (r.o + t * r.sp) % 1; r.s.position.copy(r.e[Math.floor(u * (r.e.length - 1))]);
          r.s.material.opacity = Math.sin(u * Math.PI);
        });
      });
    })();

    /* ======================================================================
       아크릴 스탠드 (영사기용)
       ====================================================================== */
    const PROJ = new THREE.Vector3(-0.25, 0, 1.25);
    (function buildPlinths() {
      const box = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.36, 0.46, 3, 0.012), M.acrylic); box.position.set(PROJ.x, 0.18, PROJ.z); box.rotation.y = 0.3; world.add(box);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.36, 0.46)), M.line(1.4, 0.6)); edges.position.copy(box.position); edges.rotation.y = 0.3; world.add(edges);
      // 화병용 블랙 기둥
      const ped = shadow(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.82, 64), M.lacquer)); ped.position.set(2.55, 0.41, 0.2); world.add(ped);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.006, 8, 96), M.gold); rim.rotation.x = Math.PI / 2; rim.position.set(2.55, 0.82, 0.2); world.add(rim);
    })();

    /* ======================================================================
       조명
       ====================================================================== */
    scene.add(new THREE.HemisphereLight(0x3a2a2e, 0x080506, 0.55));
    const key = new THREE.SpotLight(0xffe2c2, 120, 16, 0.42, 0.75, 2);
    key.position.set(3.4, 5.6, 4.4); key.target.position.set(1.5, 1.4, -0.3);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    scene.add(key, key.target);
    const curtainLight = new THREE.SpotLight(0xff8f86, 150, 14, 0.6, 0.9, 2);
    curtainLight.position.set(0.6, 5.2, 3.2); curtainLight.target.position.set(-1.6, 2.2, -0.8);
    scene.add(curtainLight, curtainLight.target);
    const rimL = new THREE.SpotLight(0xffd3a8, 80, 10, 0.5, 0.8, 2);
    rimL.position.set(0.6, 3.6, -2.0); rimL.target.position.set(1.5, 1.4, -0.45);
    scene.add(rimL, rimL.target);
    const wallWash = new THREE.SpotLight(0xffe6cc, 40, 10, 0.55, 0.9, 2);
    wallWash.position.set(2.6, 4.6, 1.6); wallWash.target.position.set(2.4, 1.8, -1.3);
    scene.add(wallWash, wallWash.target);
    const tableGlow = new THREE.PointLight(0xffc690, 0.6, 3, 2); tableGlow.position.set(1.2, 1.35, 1.35); scene.add(tableGlow);
    const vaseGlow = new THREE.PointLight(0xffd8b0, 1.6, 2.6, 2); vaseGlow.position.set(2.8, 1.6, 0.9); scene.add(vaseGlow);
    const projGlow = new THREE.PointLight(0xffd0a0, 1.2, 2.4, 2); projGlow.position.set(-0.1, 1.0, 1.9); scene.add(projGlow);

    progress(0.6);

    /* ======================================================================
       외부 CC0 모델 (비동기 — 실패해도 장면은 유지)
       ====================================================================== */
    function fit(obj, height) {
      const box = new THREE.Box3().setFromObject(obj), size = new THREE.Vector3(); box.getSize(size);
      const s = height / (size.y || 1); obj.scale.multiplyScalar(s);
      const b2 = new THREE.Box3().setFromObject(obj), c = new THREE.Vector3(); b2.getCenter(c);
      obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
      return obj;
    }
    const modelTasks = [];
    if (opts.models) {
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      // Poly Haven glTF는 텍스처 경로가 API에만 있으므로 파일명 → 실제 URL로 바꿔 줌
      const loaderFor = async (url) => {
        const m = url.match(/polyhaven\.org\/.*\/1k\/([^/]+)\//);
        if (!m) return new GLTFLoader();
        const info = await (await fetch("https://api.polyhaven.com/files/" + m[1])).json();
        const map = {};
        Object.entries(info.gltf["1k"].gltf.include || {}).forEach(([k, v]) => { map[k.split("/").pop()] = v.url; });
        const mgr = new THREE.LoadingManager();
        mgr.setURLModifier((u) => map[u.split("/").pop().split("?")[0]] || u);
        return new GLTFLoader(mgr);
      };
      const place = (url, height, pos, ry, after) => new Promise((res) => {
        loaderFor(url).catch(() => new GLTFLoader()).then((loader) => loader.load(url, (gltf) => {
          const holder = new THREE.Group(); const o = gltf.scene;
          o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; if (m.material) m.material.envMapIntensity = 1.1; } });
          holder.add(fit(o, height)); holder.position.copy(pos); holder.rotation.y = ry;
          if (after) after(holder, o);
          world.add(holder); res(holder);
        }, undefined, () => res(null)));
      });
      modelTasks.push(place(MODELS.vase, 0.62, new THREE.Vector3(2.55, 0.823, 0.2), 0.4));
      modelTasks.push(place(MODELS.projector, 0.5, new THREE.Vector3(PROJ.x, 0.36, PROJ.z), 0.9));
      modelTasks.push(place(MODELS.books, 0.14, new THREE.Vector3(0.95, 0.76, 0.75), -0.5));
    }

    /* ======================================================================
       포스트 프로세싱 — 빛에만 반응하는 블룸
       ====================================================================== */
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(dpr);
    composer.setSize(W(), H());
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), 0.55, 0.55, 0.92);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    /* ======================================================================
       카메라 — 시네마틱 인트로 · 마우스 패럴랙스 · 스크롤 돌리
       ====================================================================== */
    const CAM = { pos: new THREE.Vector3(0.05, 1.45, 4.9), look: new THREE.Vector3(0.6, 1.2, 0) };
    const INTRO_FROM = { pos: new THREE.Vector3(-0.5, 1.95, 7.2), look: new THREE.Vector3(0.35, 1.45, 0) };
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    let introT = 0, introOn = false;
    const vPos = new THREE.Vector3(), vLook = new THREE.Vector3();
    function placeCamera(t, dt) {
      if (introOn) introT = Math.min(1, introT + dt / 3.4);
      const e = easeOut(introT);
      vPos.lerpVectors(INTRO_FROM.pos, CAM.pos, e);
      vLook.lerpVectors(INTRO_FROM.look, CAM.look, e);
      const sp = clamp(window.scrollY / Math.max(1, window.innerHeight), 0, 1.2);
      vPos.z -= sp * 1.6; vPos.y += sp * 0.25; vLook.y += sp * 0.05; vLook.x += sp * 0.35;
      pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.2);
      pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.2);
      vPos.x += pointer.sx * 0.28 + Math.sin(t * 0.13) * 0.05;
      vPos.y += pointer.sy * 0.12 + Math.sin(t * 0.17) * 0.02;
      vLook.x += pointer.sx * 0.06;
      camera.position.copy(vPos);
      camera.lookAt(vLook);
    }
    const onPointer = (e) => { pointer.x = (e.clientX / window.innerWidth) * 2 - 1; pointer.y = -((e.clientY / window.innerHeight) * 2 - 1); };
    window.addEventListener("pointermove", onPointer, { passive: true });

    /* ======================================================================
       루프 — 히어로가 화면에 있을 때만 렌더
       ====================================================================== */
    const clock = new THREE.Clock();
    let t = 0, raf = 0, running = true, visible = true;
    let perfN = 0, perfT = 0, perfDone = false;
    function frame() {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!introOn && document.documentElement.classList.contains("is-ready")) introOn = true;
      visible = window.scrollY < window.innerHeight * 1.15 && !document.hidden;
      if (!visible) return;
      t += dt;
      tickers.forEach((f) => f(t, dt));
      placeCamera(t, dt);
      composer.render();
      if (!perfDone) {
        perfN++; perfT += dt;
        if (perfT > 2.5) {
          perfDone = true;
          const fps = perfN / perfT;
          if (fps < 40 && dpr > 1) { dpr = 1; resize(); }
          if (fps < 28) { bloom.enabled = false; renderer.shadowMap.enabled = false; }
        }
      }
    }
    function resize() {
      const w = W(), h = H();
      camera.aspect = w / h;
      camera.fov = w / h < 1.5 ? 36 : 30;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      composer.setPixelRatio(dpr); composer.setSize(w, h);
      if (reflector) reflector.getRenderTarget().setSize(Math.round(w * dpr * 0.5), Math.round(h * dpr * 0.5));
    }
    window.addEventListener("resize", resize);
    resize();
    placeCamera(0, 0);

    // 모델이 너무 늦으면 기다리지 않음 (최대 3.5초)
    await Promise.race([Promise.all(modelTasks), new Promise((r) => setTimeout(r, 3500))]);
    progress(0.95);
    composer.render();
    raf = requestAnimationFrame(frame);
    progress(1);

    return {
      THREE, scene, camera, renderer, composer, bloom, M, lights: { key, curtainLight, rimL, wallWash, tableGlow, vaseGlow, projGlow },
      CAM, INTRO_FROM, startIntro() { introOn = true; },
      stop() { cancelAnimationFrame(raf); running = false; }
    };
  }

  window.Hero3D = { create };

  /* ======================================================================
     사이트 자동 연결 — 데스크톱에서만 사진을 3D로 교체
     ====================================================================== */
  function supported() {
    if (window.innerWidth < 1024) return false;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (navigator.connection && navigator.connection.saveData) return false;
    try { const c = document.createElement("canvas"); return !!c.getContext("webgl2"); } catch (_) { return false; }
  }
  function boot() {
    const media = document.querySelector("#hero .hero__media");
    if (!media || !supported()) return Promise.resolve(null);
    const canvas = document.createElement("canvas");
    canvas.className = "hero__canvas";
    canvas.setAttribute("aria-hidden", "true");
    media.insertBefore(canvas, media.querySelector(".hero__shade"));
    const report = (p) => window.dispatchEvent(new CustomEvent("hero3d:progress", { detail: p }));
    return create(canvas, { onProgress: report })
      .then((api) => { document.documentElement.classList.add("hero-3d"); window.__hero3d = api; return api; })
      .catch((err) => { console.warn("[hero3d] 사진 히어로로 표시합니다:", err); canvas.remove(); return null; });
  }
  window.Hero3DReady = (document.querySelector("#hero") ? boot() : Promise.resolve(null));
})();
