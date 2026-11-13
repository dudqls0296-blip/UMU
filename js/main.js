/* ==========================================================================
   UI 컨트롤러
   --------------------------------------------------------------------------
   1. data.js → 화면 렌더링
   2. 작품 목록 · 필터 · 상세 모달 (공유 가능한 #work-id 링크)
   3. 부드러운 스크롤(Lenis) ↔ 3D 카메라 연동
   4. 로딩 화면 · 메인 등장 연출 · 스크롤 등장 애니메이션
   5. 내비게이션 · 커서 · 주소 복사 · 캘린더 추가
   CDN(GSAP/Lenis/three.js)이 하나라도 실패해도 콘텐츠는 항상 보이도록 설계했습니다.
   ========================================================================== */
(function () {
  "use strict";

  const D = window.EXHIBITION;
  if (!D) { console.error("[exhibition] js/data.js를 불러오지 못했습니다."); return; }

  /* ---------- 환경 ---------- */
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const bind = (name) => $(`[data-bind="${name}"]`);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nl2br = (s) => esc(s).replace(/\n/g, "<br>");
  const paragraphs = (s) => String(s || "").split(/\n{2,}/).map((p) => `<p>${nl2br(p.trim())}</p>`).join("");

  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedMotion = mqReduce.matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isNarrow = () => window.innerWidth < 900;
  const lowPower =
    !finePointer ||
    isNarrow() ||
    (navigator.deviceMemory && navigator.deviceMemory < 4) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  const isFile = location.protocol === "file:";

  const root = document.documentElement;
  const body = document.body;
  if (reducedMotion) root.classList.add("reduced-motion");

  /* ======================================================================
     1. 콘텐츠 렌더링
     ====================================================================== */
  const stages = D.stages || [];
  const pad2 = (n) => String(n).padStart(2, "0");
  const stageLabel = (i, label) => {
    const s = stages[i];
    return s ? `<span class="stage-num" aria-hidden="true">${pad2(i)}</span><span class="stage-rule" aria-hidden="true"></span><span class="stage-name" lang="en">${esc(label || s.stage)}</span>` : "";
  };

  function renderContent() {
    bind("editionLine").textContent = `${D.university} ${D.department} ${D.edition}`;

    bind("navList").innerHTML = stages.map((s, i) =>
      `<li><a href="#${esc(s.id)}" data-index="${i}"><span class="nav__glyph" aria-hidden="true">${pad2(i)}</span><span class="nav__label">${esc(s.nav)}</span></a></li>`).join("");

    bind("rail").innerHTML = stages.map((s, i) =>
      `<li><a href="#${esc(s.id)}" data-index="${i}" aria-label="${esc(s.nav)}">
        <span class="rail__name">${esc(s.stage)}</span><span class="rail__num" aria-hidden="true">${pad2(i)}</span><span class="rail__dot" aria-hidden="true"></span>
      </a></li>`).join("");

    $$("[data-stage]").forEach((el) => { el.innerHTML = stageLabel(+el.dataset.stage, el.dataset.label); });

    // 메인 브랜드 문구 (data.js의 brand — 없으면 기본값)
    const B = D.brand || {};
    const bEye = bind("brandEyebrow"); if (bEye && B.eyebrow) bEye.textContent = B.eyebrow;
    const bTitle = bind("brandTitle");
    if (bTitle && Array.isArray(B.title) && B.title.length) bTitle.innerHTML = B.title.map((l) => `<span class="line"><span>${esc(l)}</span></span>`).join("");
    const bCopy = bind("brandCopy"); if (bCopy) bCopy.innerHTML = nl2br(B.copy || D.hero.tagline);

    // Hero
    bind("heroEdition").textContent = `${D.university} ${D.department} ${D.edition}`;
    const t = bind("title");
    t.setAttribute("aria-label", D.title);
    t.innerHTML = Array.from(D.title).map((ch, i) =>
      ch === " " ? `<span class="char char--space" aria-hidden="true"> </span>` : `<span class="char" aria-hidden="true" style="--i:${i}">${esc(ch)}</span>`).join("");
    bind("titleEn").textContent = D.titleEn;
    bind("subtitle").innerHTML = esc(D.subtitle).replace("×", `<span class="times" aria-hidden="true">×</span><span class="sr-only">and</span>`);
    bind("tagline").innerHTML = nl2br(D.hero.tagline);
    bind("heroCta").textContent = D.hero.cta || "전시 둘러보기";
    const heroMeta = bind("heroMeta");
    if (heroMeta) {
      const S0 = D.schedule || {};
      heroMeta.innerHTML = [["Period", "기간", S0.period], ["Venue", "장소", S0.venue], ["Admission", "관람", S0.admission]]
        .filter((r) => r[2])
        .map(([en, ko, v]) => `<div class="hero__meta-item"><dt><span lang="en">${en}</span>${ko}</dt><dd>${esc(v)}</dd></div>`).join("");
    }

    // Concept
    const cpt = D.concept;
    bind("conceptHeading").innerHTML = nl2br(cpt.heading);
    bind("conceptParagraphs").innerHTML = cpt.paragraphs.map((p) => `<p>${nl2br(p)}</p>`).join("");
    bind("pillars").innerHTML = cpt.pillars.map((p, i) => `
      <div class="triad__item${i === 1 ? " triad__item--mid" : ""}">
        <span class="triad__symbol" aria-hidden="true">${esc(p.symbol)}</span>
        <h3 class="triad__title">${esc(p.ko || p.title)}<small lang="en">${esc(p.title)}</small></h3>
        <p>${esc(p.text)}</p>
      </div>`).join("");

    // Department
    const dep = D.department_info;
    bind("deptHeading").innerHTML = nl2br(dep.heading);
    bind("deptIntro").textContent = dep.intro;
    const facts = dep.facts || [];
    bind("facts").innerHTML = facts.map((f) => `<div><dt class="sr-only">${esc(f.label)}</dt><dd><strong data-count="${esc(f.value)}">${esc(f.value)}</strong><span>${esc(f.label)}</span></dd></div>`).join("");
    bind("facts").hidden = !facts.length;
    bind("highlights").innerHTML = dep.highlights.map((h) => `
      <li><h3>${esc(h.ko || h.label)}<small lang="en">${esc(h.label)}</small></h3><p>${esc(h.text)}</p></li>`).join("");

    // Schedule
    const s = D.schedule;
    bind("scheduleHeading").textContent = s.heading;
    bind("scheduleInfo").innerHTML = [["기간", s.period], ["관람 시간", s.hours], ["장소", s.venue], ["관람료", s.admission]]
      .filter(([, v]) => v)
      .map(([k, v]) => `<div class="info__row"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    bind("events").innerHTML = (s.events || []).map((e) => `
      <li><time>${esc(e.date)}<span>${esc(e.time)}</span></time><p>${esc(e.title)}</p></li>`).join("");
    bind("events").hidden = !(s.events && s.events.length);
    bind("scheduleActions").innerHTML = s.startDate && s.endDate
      ? `<button type="button" class="btn btn--gold" id="addCalendar">내 캘린더에 추가</button>` : "";

    // Location
    const L = D.location;
    const q = encodeURIComponent(L.mapQuery || L.address);
    bind("locationHeading").textContent = L.heading;
    bind("address").textContent = L.address;
    bind("map").innerHTML = `<iframe title="${esc(L.mapQuery)} 위치 지도" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen
      src="https://maps.google.com/maps?q=${q}&z=16&output=embed"></iframe>`;
    bind("transit").innerHTML = L.transit.map((t) => `<li><b>${esc(t.type)}</b><span>${esc(t.text)}</span></li>`).join("");
    bind("mapLinks").innerHTML = `
      <a class="btn btn--gold" href="https://map.naver.com/p/search/${q}" target="_blank" rel="noopener">네이버 지도에서 보기</a>
      <a class="btn btn--quiet" href="https://map.kakao.com/?q=${q}" target="_blank" rel="noopener">카카오맵에서 보기</a>`;

    // Footer
    bind("footerTitle").innerHTML = `${esc(D.university)} ${esc(D.department)}<br>${esc(D.edition)} 「${esc(D.title)}」`;
    const fEn = bind("footerEn");
    if (fEn) fEn.textContent = `${D.titleEn} — ${D.editionShort || ""}`;
    const fInfo = bind("footerInfo");
    if (fInfo) {
      fInfo.innerHTML = [["기간", s.period], ["관람 시간", s.hours], ["장소", s.venue], ["주소", L.address]]
        .filter(([, v]) => v)
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
    }
    bind("contact").innerHTML = esc(D.footer.contact) +
      (D.footer.instagram ? ` <a href="${esc(D.footer.instagram)}" target="_blank" rel="noopener">Instagram</a>` : "");
    bind("copyright").textContent = D.footer.copyright;
  }

  /* ======================================================================
     2. 작품
     ====================================================================== */
  const works = D.works || [];

  // 이미지가 없을 때 쓰는 자동 썸네일 (작품마다 다른 연성진 문양)
  function placeholderThumb(w, i) {
    // 실제 작품 이미지가 들어오기 전까지 쓰는 시네마틱 자동 썸네일
    const tones = [
      ["#2a0c14", "#120d0f", "#d6b58a"],
      ["#1d1719", "#0d0a0b", "#e8ded3"],
      ["#3a121e", "#140d10", "#d6b58a"],
      ["#221b1d", "#0f0b0c", "#c9a77a"]
    ];
    const [hi, lo, acc] = tones[i % tones.length];
    const kind = i % 3;
    const cx = 400 + ((i % 2) ? 90 : -90);
    let obj = "";
    if (kind === 0) {
      obj = `<circle cx="${cx}" cy="270" r="120" fill="url(#gl)"/><circle cx="${cx}" cy="270" r="120" fill="none" stroke="${acc}" stroke-opacity=".55"/>
<ellipse cx="${cx}" cy="270" rx="200" ry="44" fill="none" stroke="${acc}" stroke-opacity=".7" transform="rotate(-12 ${cx} 270)"/>
<circle cx="${cx - 44}" cy="226" r="16" fill="#fff" opacity=".35"/>`;
    } else if (kind === 1) {
      obj = `<rect x="${cx - 120}" y="150" width="240" height="250" fill="#fff" fill-opacity=".04" stroke="${acc}" stroke-opacity=".5"/>
<rect x="${cx - 92}" y="180" width="184" height="12" fill="${acc}" opacity=".5"/>${[0, 1, 2, 3, 4, 5].map((k) => `<rect x="${cx - 92}" y="${214 + k * 24}" width="${150 - (k % 3) * 30}" height="5" fill="#e8ded3" opacity=".22"/>`).join("")}`;
    } else {
      obj = `<g transform="rotate(-24 ${cx} 300)"><rect x="${cx - 170}" y="292" width="300" height="14" rx="7" fill="#4a101c"/>
<rect x="${cx + 40}" y="290" width="44" height="18" fill="${acc}"/><path d="M${cx - 170} 299 l-40 -7 v14z" fill="${acc}"/></g>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<defs><radialGradient id="bg" cx=".5" cy=".35" r=".85"><stop offset="0" stop-color="${hi}"/><stop offset="1" stop-color="${lo}"/></radialGradient>
<radialGradient id="gl" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff" stop-opacity=".35"/><stop offset=".6" stop-color="#ffffff" stop-opacity=".05"/><stop offset="1" stop-color="${acc}" stop-opacity=".25"/></radialGradient>
<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${acc}" stop-opacity=".12"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></linearGradient>
<radialGradient id="sp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff2dc" stop-opacity=".9"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient></defs>
<rect width="800" height="600" fill="url(#bg)"/>
${[110, 230, 590, 700].map((x) => `<rect x="${x}" y="0" width="1" height="600" fill="${acc}" opacity=".12"/>`).join("")}
<rect x="0" y="430" width="800" height="170" fill="url(#fl)"/><line x1="0" y1="430" x2="800" y2="430" stroke="${acc}" stroke-opacity=".25"/>
<path d="M-20 520 C 200 420, 380 560, 560 470 S 760 330, 820 300" fill="none" stroke="${acc}" stroke-opacity=".55" stroke-width="1.2"/>
${obj}
<circle cx="${(i * 137) % 700 + 50}" cy="${(i * 89) % 200 + 60}" r="16" fill="url(#sp)"/>
<text x="44" y="560" font-family="Georgia,'Times New Roman',serif" font-style="italic" font-size="24" letter-spacing="2" fill="${acc}" opacity=".85">Opus ${String(i + 1).padStart(2, "0")}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  const thumbOf = (w, i) => w.image || placeholderThumb(w, i);
  // file://로 열면 브라우저 보안 정책상 로컬 이미지를 WebGL 텍스처로 쓸 수 없어 3D 액자에는 자동 썸네일을 씁니다.
  const thumb3D = (w, i) => (isFile && w.image ? placeholderThumb(w, i) : thumbOf(w, i));

  let activeCat = "전체";

  function renderWorks() {
    const cats = ["전체", ...(D.categories || [])];
    bind("filters").innerHTML = cats.map((c) => {
      const count = c === "전체" ? works.length : works.filter((w) => w.category === c).length;
      return `<button type="button" class="filter" aria-pressed="${c === activeCat}" data-cat="${esc(c)}">${esc(c)}<span class="filter__count">${count}</span></button>`;
    }).join("");

    bind("worksGrid").innerHTML = works.map((w, i) => `
      <li class="work" data-cat="${esc(w.category)}" data-id="${esc(w.id)}" style="--i:${i}">
        <button type="button" class="work__btn" data-index="${i}" aria-haspopup="dialog">
          <span class="work__media"><img src="${esc(thumbOf(w, i))}" alt="" loading="lazy" decoding="async" /></span>
          <span class="work__meta">
            <span class="work__cat"><span class="work__no">No. ${pad2(i + 1)}</span>${esc(w.category)}</span>
            <span class="work__title">${esc(w.title)}</span>
            <span class="work__summary">${esc(w.summary)}</span>
            <span class="work__team">${esc(w.team)}<span aria-hidden="true"> / </span>${esc((w.members || []).join(", "))}</span>
          </span>
        </button>
      </li>`).join("");
    layoutWorks();
    updateCount();
  }

  // 보이는 작품 순서에 따라 비대칭 그리드 크기를 배정 (a 큰 가로 · b 작은 세로 · c 작은 세로 · d 중간 가로)
  const SIZES = ["a", "b", "c", "d"];
  function layoutWorks() {
    let k = 0;
    $$(".work").forEach((el) => { if (!el.hidden) el.dataset.size = SIZES[k++ % SIZES.length]; });
  }

  function updateCount() {
    const n = activeCat === "전체" ? works.length : works.filter((w) => w.category === activeCat).length;
    bind("worksCount").textContent = `${activeCat} · ${n}개의 작품`;
  }

  function setupWorks() {
    bind("filters").addEventListener("click", (e) => {
      const btn = e.target.closest(".filter");
      if (!btn || btn.dataset.cat === activeCat) return;
      activeCat = btn.dataset.cat;
      $$(".filter").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      const items = $$(".work");
      const apply = () => {
        let k = 0;
        items.forEach((el) => {
          const show = activeCat === "전체" || el.dataset.cat === activeCat;
          el.hidden = !show;
          if (show) el.style.setProperty("--i", k++);
        });
        layoutWorks();
        updateCount();
        refreshLayout();
      };
      if (window.gsap && !reducedMotion) {
        gsap.to(items, { autoAlpha: 0, y: 12, duration: 0.18, stagger: 0.015, onComplete: () => {
          apply();
          gsap.fromTo(items.filter((el) => !el.hidden), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.05, clearProps: "transform,opacity,visibility" });
        } });
      } else apply();
    });

    bind("worksGrid").addEventListener("click", (e) => {
      const b = e.target.closest(".work__btn");
      if (b) openModal(+b.dataset.index, b);
    });

    // 카드 위 커서 위치에 따라 빛 반사 이동
    if (finePointer && !reducedMotion) {
      bind("worksGrid").addEventListener("pointermove", (e) => {
        const b = e.target.closest(".work__btn");
        if (!b) return;
        const r = b.getBoundingClientRect();
        b.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        b.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    }
  }

  /* ---------- 작품 상세 모달 ---------- */
  const modal = $("#workModal");
  const card = $(".modal__card", modal);
  let modalIndex = -1, lastFocus = null;

  function fillModal(i) {
    const w = works[i];
    modalIndex = i;
    const img = $(".modal__hero-img", modal);
    img.src = thumbOf(w, i);
    img.alt = `${w.title} 대표 이미지`;
    const shots = [thumbOf(w, i), ...(w.gallery || [])];
    const thumbs = $(".modal__thumbs", modal);
    thumbs.innerHTML = shots.length > 1 ? shots.map((src, k) =>
      `<button type="button" aria-label="이미지 ${k + 1} 보기" aria-pressed="${k === 0}" data-src="${esc(src)}"><img src="${esc(src)}" alt="" loading="lazy" /></button>`).join("") : "";
    thumbs.hidden = shots.length < 2;

    $(".modal__cat", modal).textContent = w.category;
    $(".modal__title", modal).textContent = w.title;
    $(".modal__summary", modal).textContent = w.summary || "";
    $(".modal__credits", modal).innerHTML =
      `<div><dt>팀</dt><dd>${esc(w.team)}</dd></div><div><dt>참여</dt><dd>${esc((w.members || []).join(", "))}</dd></div>`;
    $(".modal__desc", modal).innerHTML = paragraphs(w.description);
    const v = $(".modal__video", modal);
    v.hidden = !w.video;
    if (w.video) v.href = w.video; else v.removeAttribute("href");
    $(".modal__index", modal).textContent = `${i + 1} / ${works.length}`;
    const body2 = $(".modal__body", modal);
    body2.scrollTop = 0;
    if (scene) scene.highlight(w.id);
  }

  function openModal(i, trigger) {
    if (!works[i]) return;
    lastFocus = trigger || document.activeElement;
    fillModal(i);
    modal.hidden = false;
    body.classList.add("modal-open");
    if (lenis) lenis.stop();
    history.replaceState(null, "", `#work-${works[i].id}`);
    if (window.gsap && !reducedMotion) {
      gsap.fromTo($(".modal__backdrop", modal), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
      gsap.fromTo(card, { opacity: 0, y: 30, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expo.out" });
    }
    requestAnimationFrame(() => $(".modal__close", modal).focus());
  }

  function closeModal() {
    if (modal.hidden) return;
    const done = () => {
      modal.hidden = true;
      body.classList.remove("modal-open");
      if (lenis) lenis.start();
      if (scene) scene.highlight(null);
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    };
    history.replaceState(null, "", location.pathname + location.search);
    if (window.gsap && !reducedMotion) {
      gsap.to(card, { opacity: 0, y: 16, scale: 0.98, duration: 0.25, ease: "power2.in" });
      gsap.to($(".modal__backdrop", modal), { opacity: 0, duration: 0.3, onComplete: done });
    } else done();
  }

  function stepModal(d) {
    const n = works.length;
    const next = (modalIndex + d + n) % n;
    if (window.gsap && !reducedMotion) {
      gsap.to($(".modal__body", modal), { opacity: 0, x: -12 * d, duration: 0.16, onComplete: () => {
        fillModal(next);
        history.replaceState(null, "", `#work-${works[next].id}`);
        gsap.fromTo($(".modal__body", modal), { opacity: 0, x: 12 * d }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" });
      } });
    } else { fillModal(next); history.replaceState(null, "", `#work-${works[next].id}`); }
  }

  function setupModal() {
    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) return closeModal();
      const th = e.target.closest(".modal__thumbs button");
      if (th) {
        $(".modal__hero-img", modal).src = th.dataset.src;
        $$(".modal__thumbs button", modal).forEach((b) => b.setAttribute("aria-pressed", String(b === th)));
      }
      if (e.target.closest(".modal__prev")) stepModal(-1);
      if (e.target.closest(".modal__next")) stepModal(1);
      if (e.target.closest(".modal__share")) copyText(location.href, "작품 링크를 복사했습니다.");
    });
    document.addEventListener("keydown", (e) => {
      if (modal.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); closeModal(); }
      else if (e.key === "ArrowRight") stepModal(1);
      else if (e.key === "ArrowLeft") stepModal(-1);
      else if (e.key === "Tab") {
        const f = $$('button:not([hidden]), a[href]:not([hidden])', modal).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    $(".modal__body", modal).setAttribute("data-lenis-prevent", "");
  }

  function openFromHash() {
    const m = location.hash.match(/^#work-(.+)$/);
    if (!m) return;
    const i = works.findIndex((w) => w.id === decodeURIComponent(m[1]));
    if (i >= 0) {
      scrollToEl($("#works"), true);
      setTimeout(() => openModal(i), 350);
    }
  }

  /* ======================================================================
     3. 스크롤 · 카메라 · 내비게이션
     ====================================================================== */
  let lenis = null;
  let scene = null;
  const sections = $$("[data-station]");
  let centers = [];

  function measure() {
    const y = window.scrollY;
    centers = sections.map((s) => {
      const r = s.getBoundingClientRect();
      // 패널이 화면 중앙에 오는 지점을 정류장으로
      // 전시 구성: 3D 액자 갤러리가 화면에 가득 보이는 지점(작품 목록 패널은 그 아래)
      if (s.id === "works" && body.classList.contains("has-webgl")) return y + r.top + window.innerHeight / 2;
      const panel = $(".panel, .hero__inner", s);
      const pr = panel ? panel.getBoundingClientRect() : r;
      return y + pr.top + Math.min(pr.height, window.innerHeight) / 2;
    });
    centers[0] = window.innerHeight / 2; // 메인은 맨 위에서 시작
  }

  function stationAt(scrollY) {
    const c = scrollY + window.innerHeight / 2;
    if (!centers.length || c <= centers[0]) return 0;
    const n = centers.length - 1;
    if (c >= centers[n]) return n;
    for (let i = 0; i < n; i++) {
      if (c < centers[i + 1]) return i + (c - centers[i]) / (centers[i + 1] - centers[i]);
    }
    return n;
  }

  const navLinks = () => $$(".nav__list a");
  const railLinks = () => $$(".rail__list a");
  const progressEl = $("#navProgress");
  const navEl = $("#nav");
  let lastActive = -1, lastY = 0;

  function markActive(active) {
    if (active === lastActive) return;
    lastActive = active;
    {
      navLinks().forEach((a, i) => { if (i === active) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current"); });
      moveIndicator();
      railLinks().forEach((a, i) => { a.classList.toggle("is-active", i === active); a.classList.toggle("is-past", i < active); });
      body.dataset.station = String(active);
      updateNextCue(active);
    }
  }

  function onScroll(y) {
    if (deck.on) return; // 화면 전환 모드에서는 스크롤 대신 deck이 제어
    const s = stationAt(y);
    if (scene) scene.setStation(s);
    markActive(Math.round(s));
    scheduleAutoFrame();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressEl.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    navEl.classList.toggle("is-scrolled", y > 40);
    body.classList.toggle("at-footer", y + window.innerHeight > document.documentElement.scrollHeight - footerH());
    navEl.classList.toggle("is-hidden", y > lastY + 4 && y > window.innerHeight * 0.6 && !body.classList.contains("menu-open"));
    if (y < lastY - 4) navEl.classList.remove("is-hidden");
    lastY = y;
  }

  // 메뉴 활성 상태: 골드 라인이 현재 항목 아래로 미끄러지듯 이동
  const indicator = $(".nav__indicator");
  function moveIndicator() {
    if (!indicator) return;
    const a = $(".nav__list a[aria-current]");
    if (!a || lastActive === 0) { indicator.classList.remove("is-on"); return; }
    const menu = indicator.parentElement.getBoundingClientRect(), r = a.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(a).paddingLeft) || 0;
    indicator.style.setProperty("--x", `${r.left - menu.left + pad}px`);
    indicator.style.setProperty("--w", `${Math.max(0, r.width - pad * 2)}px`);
    indicator.classList.add("is-on");
  }

  let _fh = 0;
  const footerH = () => _fh || (_fh = ($(".footer") || { offsetHeight: 0 }).offsetHeight * 0.6);
  window.addEventListener("resize", () => { _fh = 0; });

  function scrollToEl(el, instant) {
    if (!el) return;
    if (deck.on) { const i = deckLayers().findIndex((L) => L === el || L.contains(el)); if (i >= 0) deckGo(i, instant); return; }
    if (lenis) lenis.scrollTo(el, { immediate: !!instant || reducedMotion, duration: 1.6, offset: el.id === "hero" ? 0 : 0 });
    else el.scrollIntoView({ behavior: instant || reducedMotion ? "auto" : "smooth" });
  }

  /* ---------- 한 번에 다음 섹션 · 자동 구도 맞춤 ---------- */
  let autoMoving = false, idleTimer = 0, pointerDown = false;
  const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;
  // i번째 정류장(카메라 구도가 딱 맞는 지점)의 스크롤 위치
  function stationY(i) {
    if (!centers.length) measure();
    if (i <= 0) return 0;
    return Math.max(0, Math.min(maxScroll(), centers[i] - window.innerHeight / 2));
  }
  function scrollToY(y, duration) {
    autoMoving = true;
    const done = () => { autoMoving = false; };
    if (lenis) lenis.scrollTo(y, { duration: reducedMotion ? 0 : duration, immediate: reducedMotion, easing: (t) => 1 - Math.pow(1 - t, 4), onComplete: done });
    else { window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" }); setTimeout(done, duration * 1000 + 200); }
    setTimeout(done, duration * 1000 + 600); // 안전장치
  }
  function goStation(i) {
    const n = sections.length - 1;
    if (i > n) { scrollToY(maxScroll(), 1.6); return; } // 마지막 다음은 푸터
    scrollToY(stationY(Math.max(0, i)), 1.8);
  }
  function currentIndex() { return Math.round(stationAt(window.scrollY)); }
  function goNext() {
    if (deck.on) { deckGo(deck.index >= deckLayers().length - 1 ? 0 : deck.index + 1); return; }
    const s = stationAt(window.scrollY), n = sections.length - 1;
    if (window.scrollY >= stationY(n) + 4) { scrollToY(maxScroll(), 1.4); return; }
    // 정류장보다 아래에서 읽던 중이면 반올림 대신 그다음 정류장으로
    let next = Math.floor(s + 0.08) + 1;
    goStation(next);
  }
  function goPrev() { if (deck.on) { deckGo(deck.index - 1); return; } goStation(Math.ceil(stationAt(window.scrollY) - 0.08) - 1); }

  // 스크롤이 멈추면 가까운 정류장으로 카메라 구도를 자동으로 맞춤
  function scheduleAutoFrame() {
    clearTimeout(idleTimer);
    if (deck.on || autoMoving || reducedMotion) return;
    idleTimer = setTimeout(() => {
      if (autoMoving || pointerDown || !modal.hidden || body.classList.contains("menu-open")) return;
      const y = window.scrollY;
      if (y + window.innerHeight > document.documentElement.scrollHeight - footerH()) return; // 푸터 근처는 그대로
      const i = Math.round(stationAt(y)), target = stationY(i), dy = target - y;
      // 가까울 때만 맞춤 — 긴 작품 목록을 읽는 중에는 끌어당기지 않음
      if (Math.abs(dy) > 6 && Math.abs(dy) < window.innerHeight * 0.36) scrollToY(target, 1.1);
    }, 520);
  }
  window.addEventListener("pointerdown", () => { pointerDown = true; }, { passive: true });
  window.addEventListener("pointerup", () => { pointerDown = false; scheduleAutoFrame(); }, { passive: true });
  window.addEventListener("touchend", () => { pointerDown = false; }, { passive: true });

  // 다음 버튼
  const nextCue = $("#nextCue"), nextCueName = $("#nextCueName");
  function updateNextCue(active) {
    if (!nextCue) return;
    const n = sections.length - 1;
    let atEnd = active >= n;
    if (deck.on) { atEnd = deck.index > n; nextCueName.textContent = atEnd ? "처음으로" : deck.index === n ? "Contact" : ((stages[deck.index + 1] || {}).nav || ""); }
    else nextCueName.textContent = atEnd ? "처음으로" : ((stages[active + 1] || {}).nav || "");
    nextCue.classList.toggle("is-last", atEnd);
    nextCue.setAttribute("aria-label", atEnd ? "맨 위로 이동" : `다음 섹션으로 이동: ${nextCueName.textContent}`);
  }
  if (nextCue) nextCue.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!deck.on && currentIndex() >= sections.length - 1 && body.classList.contains("at-footer")) { scrollToY(0, 2.2); return; }
    goNext();
  });
  // 키보드: PageDown/PageUp · 스페이스는 기본 스크롤 유지, ←/→ 로도 섹션 이동
  document.addEventListener("keydown", (e) => {
    if (!modal.hidden || body.classList.contains("menu-open") || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (deck.on) return;
    if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
  });

  /* ======================================================================
     화면 전환 모드 (데스크톱 + 3D) — 한 화면씩 넘기는 전시 관람
     · 각 섹션이 화면 한 장. 휠/키/클릭/스와이프/Next로 다음 장면
     · 카메라는 장면 사이를 한 번에 부드럽게 비행하고, 도착하면 구도가 고정
     · 내용이 긴 장면은 그 안에서 스크롤 → 끝에 닿은 뒤 한 번 더 내리면 다음 장면
     ====================================================================== */
  const deck = { on: false, index: 0, lockUntil: 0, cam: { s: 0 }, tween: null };
  const deckMQ = window.matchMedia("(min-width: 1024px) and (min-height: 560px)");
  const deckLayers = () => [...sections, $(".footer")].filter(Boolean);
  const LOCK_MS = 1150;

  function revealIn(layer, delay) {
    const items = $$("[data-reveal], [data-reveal-media], [data-reveal-line], .display", layer);
    items.forEach((el) => el.classList.remove("is-in"));
    void layer.offsetWidth;
    setTimeout(() => { items.forEach((el) => el.classList.add("is-in")); countUp(layer); }, reducedMotion ? 0 : (delay || 0) * 1000 + 250);
  }

  function deckGo(i, instant) {
    const L = deckLayers(), last = L.length - 1;
    i = Math.max(0, Math.min(last, i));
    const prev = deck.index, now = performance.now();
    if (i === prev && !instant && deck.started) return;
    deck.started = true;
    deck.index = i;
    // ── 연출 타이밍 ──────────────────────────────
    // 카메라 비행 시간: 이웃 장면 2.8초, 멀수록 조금씩 길게(최대 4.2초)
    const camTarget = Math.min(i, sections.length - 1);
    const dist = Math.abs(camTarget - deck.cam.s);
    const flight = instant || reducedMotion ? 0 : Math.min(4.2, 2.8 + 0.45 * Math.max(0, dist - 1));
    // 사진 장면(메인)과 푸터는 3D를 가리므로 겹쳐서 바로 이어지고,
    // 3D 장면은 카메라가 거의 도착할 즈음 글 패널이 천천히 떠오름
    const photoLayer = (el) => el && (el.id === "hero" || el.classList.contains("footer"));
    const inDelay = flight === 0 ? 0 : photoLayer(L[i]) ? 0.35 : (photoLayer(L[prev]) ? flight * 0.5 : flight * 0.58);
    body.style.setProperty("--deck-in-delay", inDelay.toFixed(2) + "s");
    body.classList.toggle("deck-back", i < prev);
    deck.lockUntil = now + (instant ? 0 : Math.max(900, (inDelay + 0.6) * 1000));
    L.forEach((el, k) => {
      const cur = k === i, leaving = k === prev && !cur && !instant;
      el.classList.toggle("is-current", cur);
      el.classList.toggle("is-leaving", leaving);
      el.classList.toggle("is-before", k < i);
      el.inert = !cur;
      if (leaving) setTimeout(() => el.classList.remove("is-leaving"), 1700);
    });
    const layer = L[i];
    layer.scrollTop = 0;
    $$(".about__text, .dept__text, .schedule__board", layer).forEach((el) => { el.scrollTop = 0; markMore(el); });
    revealIn(layer, inDelay);
    // 카메라: 장면 사이를 한 번에 비행 (거리가 멀수록 조금 더 길게)
    if (scene) {
      if (deck.tween) deck.tween.kill();
      if (!flight || !window.gsap) { deck.cam.s = camTarget; scene.jump(camTarget); }
      // 부드럽게 출발해 부드럽게 멈추는 곡선 (중간에 끊기지 않도록 dwell 없이 한 번에)
      else deck.tween = gsap.to(deck.cam, { s: camTarget, duration: flight, ease: "sine.inOut", onUpdate: () => scene.jump(deck.cam.s) });
    }
    markActive(Math.min(i, sections.length - 1));
    updateNextCue(Math.min(i, sections.length - 1));
    body.dataset.station = String(i === last ? "end" : Math.min(i, sections.length - 1));
    body.classList.toggle("at-footer", i === last);
    navEl.classList.toggle("is-scrolled", i > 0);
    navEl.classList.remove("is-hidden");
    progressEl.style.transform = `scaleX(${last > 0 ? i / last : 0})`;
    const id = layer.id;
    if (id && !location.hash.startsWith("#work-")) history.replaceState(null, "", i === 0 ? location.pathname + location.search : "#" + id);
  }

  // 패널 안에 아래로 더 읽을 내용이 있으면 아래쪽을 살짝 흐리게
  function markMore(el) { el.classList.toggle("has-more", el.scrollTop + el.clientHeight < el.scrollHeight - 4); }
  document.addEventListener("scroll", (e) => { const t = e.target; if (deck.on && t.classList && t.matches(".about__text, .dept__text, .schedule__board")) markMore(t); }, true);

  function enableDeck() {
    if (deck.on || !scene) return;
    const from = Math.round(stationAt(window.scrollY));
    deck.on = true; deck.started = false; deck.index = -1;
    if (scene && scene.setDwell) scene.setDwell(false);
    document.documentElement.classList.add("is-deck"); body.classList.add("is-deck");
    deckLayers().forEach((el) => el.setAttribute("data-lenis-prevent", ""));
    if (lenis) lenis.stop();
    window.scrollTo(0, 0);
    deck.cam.s = from;
    lastActive = -1;
    deckGo(from, true);
  }
  function disableDeck() {
    if (!deck.on) return;
    const i = Math.min(deck.index, sections.length - 1), el = deckLayers()[deck.index];
    deck.on = false;
    if (deck.tween) deck.tween.kill();
    if (scene && scene.setDwell) scene.setDwell(true);
    document.documentElement.classList.remove("is-deck"); body.classList.remove("is-deck");
    deckLayers().forEach((L) => { L.removeAttribute("data-lenis-prevent"); L.classList.remove("is-current", "is-leaving", "is-before"); L.inert = false; });
    if (lenis) lenis.start();
    refreshLayout();
    requestAnimationFrame(() => { if (el) { if (lenis) lenis.scrollTo(el, { immediate: true }); else el.scrollIntoView(); } if (scene) scene.jump(i); });
  }
  function syncDeck() { if (scene && deckMQ.matches && !body.classList.contains("no-webgl")) enableDeck(); else disableDeck(); }

  // 안쪽 스크롤이 남았는지: 대상에서 장면 레이어까지 올라가며 스크롤 가능한 요소를 찾음
  function innerCanScroll(target, dir) {
    const layer = deckLayers()[deck.index];
    for (let el = target; el && el !== document.body; el = el.parentElement) {
      const st = getComputedStyle(el);
      if (/(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 2) {
        if (dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 2 : el.scrollTop > 1) return true;
      }
      if (el === layer) break;
    }
    return false;
  }
  function deckBlocked() { return !deck.on || !modal.hidden || body.classList.contains("menu-open"); }

  function setupDeckInput() {
    let lastWheel = 0, gestureStart = 0, accum = 0, innerAt = 0;
    window.addEventListener("wheel", (e) => {
      if (deckBlocked() || e.ctrlKey) return;
      const now = performance.now();
      if (now - lastWheel > 220) { gestureStart = now; accum = 0; }
      lastWheel = now;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : 0;
      const dir = Math.sign(d);
      if (!dir) return;
      if (innerCanScroll(e.target, dir)) { innerAt = now; return; } // 장면 안의 긴 내용은 그대로 스크롤
      e.preventDefault();
      // 관성 스크롤 꼬리로 두 장면을 연달아 넘기지 않도록: 새 제스처일 때만
      if (now < deck.lockUntil || gestureStart < deck.lockUntil || now - innerAt < 320) return;
      accum += d;
      if (Math.abs(accum) < 40) return;
      accum = 0;
      deckGo(deck.index + dir);
    }, { passive: false });

    let ty = 0, tx = 0, tt = 0, tTarget = null;
    window.addEventListener("touchstart", (e) => { if (deckBlocked()) return; ty = e.touches[0].clientY; tx = e.touches[0].clientX; tt = performance.now(); tTarget = e.target; }, { passive: true });
    window.addEventListener("touchend", (e) => {
      if (deckBlocked() || !tTarget) return;
      const dy = ty - e.changedTouches[0].clientY, dx = tx - e.changedTouches[0].clientX;
      if (Math.abs(dy) < 60 || Math.abs(dy) < Math.abs(dx) || performance.now() - tt > 900) return;
      const dir = Math.sign(dy);
      if (innerCanScroll(tTarget, dir) || performance.now() < deck.lockUntil) return;
      deckGo(deck.index + dir);
    }, { passive: true });

    document.addEventListener("keydown", (e) => {
      if (deckBlocked() || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable], .map")) return;
      const k = e.key;
      let dir = 0;
      if (k === "ArrowRight") dir = 1; else if (k === "ArrowLeft") dir = -1;
      else if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) dir = innerCanScroll(document.activeElement && document.activeElement !== body ? document.activeElement : deckLayers()[deck.index], 1) ? 0 : 1;
      else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) dir = innerCanScroll(document.activeElement && document.activeElement !== body ? document.activeElement : deckLayers()[deck.index], -1) ? 0 : -1;
      else if (k === "Home") { e.preventDefault(); deckGo(0); return; }
      else if (k === "End") { e.preventDefault(); deckGo(deckLayers().length - 1); return; }
      if (!dir) return;
      e.preventDefault();
      if (performance.now() < deck.lockUntil) return;
      deckGo(deck.index + dir);
    });
    if (deckMQ.addEventListener) deckMQ.addEventListener("change", syncDeck);
  }

  /* ---------- F 키: 전체화면 켜기/끄기 ---------- */
  function toggleFullscreen() {
    const d = document, el = d.documentElement;
    const isFull = d.fullscreenElement || d.webkitFullscreenElement;
    try {
      if (!isFull) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) { const r = req.call(el); if (r && r.catch) r.catch(() => {}); toast("전체화면 · F 또는 Esc로 나가기"); }
      } else {
        const exit = d.exitFullscreen || d.webkitExitFullscreen;
        if (exit) { const r = exit.call(d); if (r && r.catch) r.catch(() => {}); }
      }
    } catch (_) {}
  }
  document.addEventListener("keydown", (e) => {
    if (e.key !== "f" && e.key !== "F" && e.code !== "KeyF") return;
    if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    e.preventDefault();
    toggleFullscreen();
  });
  const onFsChange = () => { if (scene) scene.resize(); refreshLayout(); };
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);

  function refreshLayout() {
    requestAnimationFrame(() => {
      measure();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      onScroll(window.scrollY);
    });
  }

  function setupScroll() {
    const hasGsap = !!(window.gsap && window.ScrollTrigger);
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);

    if (window.Lenis && !reducedMotion) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4, smoothWheel: true });
      lenis.on("scroll", (e) => { onScroll(e.scroll); if (hasGsap) ScrollTrigger.update(); });
      if (hasGsap) {
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    } else {
      window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });
    }

    // 앵커 링크 → 부드러운 이동
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (id.length < 2 || id.startsWith("#work-")) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(el);
      if (id === "#main") { el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }
    });

    // 메인 영역이 스크롤될 때 히어로 텍스트가 흐려지며 빠짐
    if (hasGsap && !reducedMotion) {
      gsap.to(".hero__inner, .hero__meta", {
        yPercent: -14, opacity: 0, ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom 30%", scrub: true }
      });
      gsap.to(".scroll-cue", { opacity: 0, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "20% top", scrub: true } });
    }

    if (hasGsap && !reducedMotion) setupCinematics();

    window.addEventListener("resize", debounce(() => { if (scene) scene.resize(); refreshLayout(); moveIndicator(); }, 150));
    window.addEventListener("load", refreshLayout);
    measure();
    onScroll(window.scrollY);
  }

  /* ---------- 시네마틱 스크롤: 패럴랙스 · 이미지 확대 ---------- */
  function setupCinematics() {
    const mobile = isNarrow();
    // 히어로 사진: 스크롤 시 천천히 내려가며 확대
    gsap.to(".hero__photo img", { yPercent: mobile ? 6 : 10, scale: 1.14, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });
    gsap.to(".hero__velvet", { xPercent: -6, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });
    // 섹션 이미지: 느린 패럴랙스 + 스크롤에 따른 자연스러운 축소(1.16 → 1.02)
    $$("[data-parallax]").forEach((el) => {
      const amt = (parseFloat(el.dataset.parallax) || 10) * (mobile ? 0.4 : 1);
      gsap.fromTo(el, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      const img = el.querySelector("img");
      if (img) gsap.fromTo(img, { scale: 1.16 }, { scale: 1.02, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });
    // 대형 영문 타이틀: 아주 약한 가로 이동
    if (!mobile) $$(".display").forEach((el, i) => {
      gsap.fromTo(el, { x: i % 2 ? 24 : -24 }, { x: i % 2 ? -24 : 24, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  /* ---------- 스크롤 등장 ---------- */
  function setupReveal() {
    const items = $$("[data-reveal], [data-reveal-media], [data-reveal-line]");
    $$(".display").forEach((el) => { if (!el.closest("[data-reveal]") && !items.includes(el)) items.push(el); });
    if (!("IntersectionObserver" in window) || reducedMotion) { items.forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          countUp(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));
  }

  function countUp(scope) {
    if (reducedMotion) return;
    $$("[data-count]", scope).forEach((el) => {
      const end = parseFloat(el.dataset.count);
      if (!isFinite(end)) return;
      const t0 = performance.now(), dur = 1400;
      const tick = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ---------- 모바일 메뉴 ---------- */
  const toggle = $("#navToggle");
  function closeMenu() {
    if (!body.classList.contains("menu-open")) return;
    body.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "메뉴 열기");
    if (lenis) lenis.start();
  }
  function setupMenu() {
    toggle.addEventListener("click", () => {
      const open = !body.classList.contains("menu-open");
      body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      if (lenis) open ? lenis.stop() : lenis.start();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  /* ======================================================================
     4. 3D 씬 · 포인터 · 커서
     ====================================================================== */
  function webglOK() {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (_) { return false; }
  }

  async function initScene(onProgress) {
    if (!window.AlchemyScene || !webglOK()) throw new Error("WebGL unavailable");
    const s = await window.AlchemyScene.create($("#scene"), {
      lowPower,
      reducedMotion,
      works: works.map((w, i) => ({ id: w.id, title: w.title, category: w.category, team: w.team, image: isFile ? "" : w.image, thumb: thumb3D(w, i) })),
      onProgress
    });
    body.classList.add("has-webgl");
    refreshLayout(); // 3D용 레이아웃으로 바뀌었으니 정류장 위치를 다시 잼
    return s;
  }

  function isUIElement(el) {
    return !!(el && el.closest && el.closest(".panel, .nav, .rail, .modal, .hero__inner, .hero__meta, .footer, a, button, iframe, .scroll-cue"));
  }

  function setupPointer() {
    const cursor = $(".cursor");
    let px = window.innerWidth / 2, py = window.innerHeight / 2, cx = px, cy = py, pending = false, lastEv = null;

    window.addEventListener("pointermove", (e) => {
      px = e.clientX; py = e.clientY; lastEv = e;
      if (scene) scene.setPointer((px / window.innerWidth) * 2 - 1, -((py / window.innerHeight) * 2 - 1));
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          if (!scene || !lastEv || e.pointerType !== "mouse") return;
          const id = isUIElement(lastEv.target) ? scene.hover(null) : scene.hover(px, py);
          body.classList.toggle("is-picking", !!id);
        });
      }
    }, { passive: true });

    window.addEventListener("click", (e) => {
      if (isUIElement(e.target) || !modal.hidden || body.classList.contains("menu-open")) return;
      if (scene) {
        const id = scene.pick(e.clientX, e.clientY);
        if (id) { const i = works.findIndex((w) => w.id === id); if (i >= 0) openModal(i); return; }
      }
      // 빈 곳을 한 번 클릭하면 다음 섹션으로 (글자를 드래그해 선택한 경우는 제외)
      const sel = window.getSelection && window.getSelection();
      if (sel && String(sel).trim()) return;
      goNext();
    });

    if (!finePointer || reducedMotion) return;
    // 마우스 위치에 따른 히어로의 미세한 반응
    const officePhoto = $("[data-office-photo]");
    if (officePhoto && window.gsap) {
      const ox = gsap.quickTo(officePhoto, "x", { duration: 1.6, ease: "power3.out" });
      const oy = gsap.quickTo(officePhoto, "y", { duration: 1.6, ease: "power3.out" });
      window.addEventListener("pointermove", (e) => {
        ox(((e.clientX / window.innerWidth) - 0.5) * -16);
        oy(((e.clientY / window.innerHeight) - 0.5) * -9);
      }, { passive: true });
    }
    const heroPhoto = $("[data-hero-photo]");
    if (heroPhoto && window.gsap) {
      const qx = gsap.quickTo(heroPhoto, "x", { duration: 1.4, ease: "power3.out" });
      const qy = gsap.quickTo(heroPhoto, "y", { duration: 1.4, ease: "power3.out" });
      window.addEventListener("pointermove", (e) => {
        if (window.scrollY > window.innerHeight) return;
        qx(((e.clientX / window.innerWidth) - 0.5) * -18);
        qy(((e.clientY / window.innerHeight) - 0.5) * -10);
      }, { passive: true });
    }
    return; // 커스텀 커서는 사용하지 않음 (아래 코드는 비활성)
    body.classList.add("has-cursor");
    const loop = () => {
      cx += (px - cx) * 0.2; cy += (py - cy) * 0.2;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener("pointerover", (e) => {
      body.classList.toggle("cursor-hover", !!e.target.closest("a, button, [role='button'], .work__btn"));
    });
    document.addEventListener("pointerleave", () => body.classList.add("cursor-out"));
    document.addEventListener("pointerenter", () => body.classList.remove("cursor-out"));
  }

  /* ======================================================================
     5. 유틸 기능: 토스트 · 복사 · 캘린더
     ====================================================================== */
  const toastEl = $("#toast");
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-on"), 2200);
  }
  async function copyText(text, msg) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      }
      toast(msg);
    } catch (_) { toast("복사하지 못했습니다. 직접 선택해 복사해 주세요."); }
  }

  function downloadICS() {
    const s = D.schedule, L = D.location;
    const ymd = (iso) => iso.replace(/-/g, "");
    const end = new Date(s.endDate + "T00:00:00");
    end.setDate(end.getDate() + 1); // 종일 일정은 종료일 다음 날로 지정
    const pad = (n) => String(n).padStart(2, "0");
    const endStr = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}`;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const escI = (t) => String(t).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Induk Univ//Graduation Exhibition//KO", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${ymd(s.startDate)}-exhibition@induk`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(s.startDate)}`,
      `DTEND;VALUE=DATE:${endStr}`,
      `SUMMARY:${escI(`${D.edition} 「${D.title}」`)}`,
      `LOCATION:${escI(`${s.venue}, ${L.address}`)}`,
      `DESCRIPTION:${escI(`${D.university} ${D.department} ${D.edition}\n관람 시간 ${s.hours}`)}`,
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "graduation-exhibition.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("캘린더 파일을 내려받았습니다.");
  }

  function setupUtilities() {
    $("#copyAddress").addEventListener("click", () => copyText(D.location.address, "주소를 복사했습니다."));
    document.addEventListener("click", (e) => { if (e.target.closest("#addCalendar")) downloadICS(); });
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  /* ======================================================================
     6. 로딩 → 등장
     ====================================================================== */
  const loader = $("#loader");
  const pctEl = $("#loaderPct");
  let shownPct = 0, targetPct = 0;

  function runLoaderCounter() {
    const tick = () => {
      shownPct += (targetPct - shownPct) * 0.12;
      if (targetPct - shownPct < 0.5) shownPct = targetPct;
      pctEl.textContent = Math.round(shownPct);
      loader.style.setProperty("--p", (shownPct / 100).toFixed(3));
      if (shownPct < 100) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function heroIntro() {
    root.classList.add("is-ready");
    moveIndicator();
    if (!window.gsap || reducedMotion) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.fromTo(".hero__photo img", { scale: 1.2 }, { scale: 1.06, duration: 2.8, ease: "power3.out" }, 0)
      .from(".hero__velvet", { xPercent: -8, opacity: 0, duration: 2.2, ease: "power3.out" }, 0)
      .from(".hero__eyebrow", { opacity: 0, x: -16, duration: 1.2 }, 0.45)
      .from(".hero__title-en .line > span", { yPercent: 110, duration: 1.5, stagger: 0.12 }, 0.5)
      .from(".hero__copy", { opacity: 0, y: 16, duration: 1.3 }, 0.95)
      .from(".hero__exhibit", { opacity: 0, y: 16, duration: 1.3 }, 1.1)
      .from(".hero__actions > *", { opacity: 0, y: 12, duration: 1.2, stagger: 0.08 }, 1.25)
      .from(".hero__meta-item", { opacity: 0, y: 14, duration: 1.2, stagger: 0.08 }, 1.35)
      .from(".hero__caption", { opacity: 0, duration: 1.4 }, 1.5)
      .from(".nav", { opacity: 0, y: -14, duration: 1.2 }, 0.8)
      .from(".rail", { opacity: 0, x: 14, duration: 1.2 }, 1.2)
      .from(".scroll-cue", { opacity: 0, duration: 1.2 }, 1.6);
  }

  function hideLoader() {
    targetPct = 100;
    const finish = () => { loader.remove(); };
    setTimeout(() => {
      loader.classList.add("is-done");
      heroIntro();
      setTimeout(finish, 1300);
    }, reducedMotion ? 0 : 450);
  }

  /* ======================================================================
     부팅
     ====================================================================== */
  async function boot() {
    renderContent();
    renderWorks();
    setupWorks();
    setupModal();
    setupMenu();
    setupUtilities();
    setupScroll();
    setupReveal();
    setupPointer();
    setupDeckInput();
    runLoaderCounter();
    targetPct = 12;

    const t0 = performance.now();
    const safety = new Promise((r) => setTimeout(r, 9000)); // 최대 대기 시간
    const sceneTask = initScene((p) => { targetPct = Math.max(targetPct, Math.round(12 + p * 80)); })
      .then((s) => { scene = s; scene.jump(stationAt(window.scrollY)); syncDeck(); })
      .catch((err) => { console.warn("[exhibition] 3D 장면 없이 표시합니다:", err); body.classList.add("no-webgl"); });

    // 히어로 3D 로딩 진행률을 로더에 반영 (데스크톱에서만 실행됨)
    window.addEventListener("hero3d:progress", (e) => { targetPct = Math.max(targetPct, Math.round(12 + e.detail * 84)); });
    await Promise.race([Promise.all([sceneTask, document.fonts ? document.fonts.ready : null, window.Hero3DReady || null]), safety]);
    const minShow = reducedMotion ? 0 : 1100;
    const wait = Math.max(0, minShow - (performance.now() - t0));
    setTimeout(() => {
      hideLoader();
      refreshLayout();
      openFromHash();
    }, wait);
  }

  // defer 스크립트이므로 DOM은 이미 준비됨
  boot();
})();
