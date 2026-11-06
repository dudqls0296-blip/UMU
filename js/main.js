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
  const stageLabel = (i) => {
    const s = stages[i];
    return s ? `<span class="glyph" aria-hidden="true">${esc(s.glyph)}</span><span class="stage-name">${esc(s.stage)}</span>` : "";
  };

  function renderContent() {
    bind("editionLine").textContent = `${D.university} ${D.department} ${D.edition}`;

    bind("navList").innerHTML = stages.map((s, i) =>
      `<li><a href="#${esc(s.id)}" data-index="${i}"><span class="nav__glyph" aria-hidden="true">${esc(s.glyph)}</span>${esc(s.nav)}</a></li>`).join("");

    bind("rail").innerHTML = stages.map((s, i) =>
      `<li><a href="#${esc(s.id)}" data-index="${i}" aria-label="${esc(s.nav)}">
        <span class="rail__name">${esc(s.stage)}</span><span class="rail__dot" aria-hidden="true">${esc(s.glyph)}</span>
      </a></li>`).join("");

    $$("[data-stage]").forEach((el) => { el.innerHTML = stageLabel(+el.dataset.stage); });

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
    bind("footerTitle").textContent = `${D.university} ${D.department} ${D.edition} 「${D.title}」`;
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
    const tones = [["#14224f", "#c9a44c"], ["#0b2a3c", "#8fd4e8"], ["#1d1840", "#ebd9a6"], ["#101d45", "#d8b765"]];
    const [bg, fg] = tones[i % tones.length];
    const n = 3 + (i % 5);
    const poly = (r, rot) => Array.from({ length: n }, (_, k) => {
      const a = (k / n) * Math.PI * 2 + rot;
      return `${(400 + Math.cos(a) * r).toFixed(1)},${(300 + Math.sin(a) * r).toFixed(1)}`;
    }).join(" ");
    const ticks = Array.from({ length: 48 }, (_, k) => {
      const a = (k / 48) * Math.PI * 2, r1 = 205, r2 = k % 4 ? 197 : 186;
      return `M${(400 + Math.cos(a) * r1).toFixed(1)} ${(300 + Math.sin(a) * r1).toFixed(1)}L${(400 + Math.cos(a) * r2).toFixed(1)} ${(300 + Math.sin(a) * r2).toFixed(1)}`;
    }).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<defs><radialGradient id="g" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#050916"/></radialGradient>
<radialGradient id="h" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${fg}" stop-opacity=".35"/><stop offset="1" stop-color="${fg}" stop-opacity="0"/></radialGradient></defs>
<rect width="800" height="600" fill="url(#g)"/><circle cx="400" cy="300" r="150" fill="url(#h)"/>
<g fill="none" stroke="${fg}" stroke-width="1.6" opacity=".9">
<circle cx="400" cy="300" r="205"/><circle cx="400" cy="300" r="150" opacity=".6"/><circle cx="400" cy="300" r="34"/>
<polygon points="${poly(150, -Math.PI / 2)}"/><polygon points="${poly(150, Math.PI / 2)}" opacity=".45"/><path d="${ticks}" opacity=".7"/></g>
<text x="400" y="560" text-anchor="middle" font-family="Georgia,serif" font-size="22" letter-spacing="6" fill="${fg}" opacity=".85">OPUS ${String(i + 1).padStart(2, "0")}</text></svg>`;
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
            <span class="work__cat">${esc(w.category)}</span>
            <span class="work__title">${esc(w.title)}</span>
            <span class="work__summary">${esc(w.summary)}</span>
            <span class="work__team">${esc(w.team)}<span aria-hidden="true"> / </span>${esc((w.members || []).join(", "))}</span>
          </span>
        </button>
      </li>`).join("");
    updateCount();
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

  function onScroll(y) {
    const s = stationAt(y);
    if (scene) scene.setStation(s);
    const active = Math.round(s);
    if (active !== lastActive) {
      lastActive = active;
      navLinks().forEach((a, i) => { if (i === active) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current"); });
      railLinks().forEach((a, i) => { a.classList.toggle("is-active", i === active); a.classList.toggle("is-past", i < active); });
      body.dataset.station = String(active);
    }
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressEl.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    navEl.classList.toggle("is-scrolled", y > 40);
    navEl.classList.toggle("is-hidden", y > lastY + 4 && y > window.innerHeight * 0.6 && !body.classList.contains("menu-open"));
    if (y < lastY - 4) navEl.classList.remove("is-hidden");
    lastY = y;
  }

  function scrollToEl(el, instant) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { immediate: !!instant || reducedMotion, duration: 1.6, offset: el.id === "hero" ? 0 : 0 });
    else el.scrollIntoView({ behavior: instant || reducedMotion ? "auto" : "smooth" });
  }

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
      gsap.to(".hero__inner", {
        yPercent: -18, opacity: 0, filter: "blur(6px)", ease: "none",
        scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom 30%", scrub: true }
      });
      gsap.to(".scroll-cue", { opacity: 0, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "20% top", scrub: true } });
    }

    window.addEventListener("resize", debounce(() => { if (scene) scene.resize(); refreshLayout(); }, 150));
    window.addEventListener("load", refreshLayout);
    measure();
    onScroll(window.scrollY);
  }

  /* ---------- 스크롤 등장 ---------- */
  function setupReveal() {
    const items = $$("[data-reveal]");
    if (!("IntersectionObserver" in window) || reducedMotion) { items.forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("is-in");
          countUp(en.target);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
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
      works: works.map((w, i) => ({ id: w.id, title: w.title, thumb: thumb3D(w, i) })),
      onProgress
    });
    body.classList.add("has-webgl");
    return s;
  }

  function isUIElement(el) {
    return !!(el && el.closest && el.closest(".panel, .nav, .rail, .modal, .hero__inner, .footer, a, button, iframe, .scroll-cue"));
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
      if (!scene || isUIElement(e.target) || !modal.hidden) return;
      const id = scene.pick(e.clientX, e.clientY);
      if (id) { const i = works.findIndex((w) => w.id === id); if (i >= 0) openModal(i); }
    });

    if (!finePointer || reducedMotion) return;
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
      if (shownPct < 100) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function heroIntro() {
    root.classList.add("is-ready");
    if (!window.gsap || reducedMotion) return;
    const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
    tl.from(".hero__edition", { opacity: 0, y: 14, duration: 1 }, 0.1)
      .from(".hero__title-ko .char", { opacity: 0, yPercent: 60, rotateX: -70, filter: "blur(10px)", duration: 1.6, stagger: 0.07 }, 0.15)
      .from(".hero__title-en", { opacity: 0, letterSpacing: "0.6em", duration: 1.8 }, 0.5)
      .from(".hero__subtitle", { opacity: 0, y: 12, duration: 1.2 }, 0.8)
      .from(".hero__tagline", { opacity: 0, y: 12, duration: 1.2 }, 0.95)
      .from(".hero__cta", { opacity: 0, y: 12, duration: 1.2 }, 1.1)
      .from(".nav", { opacity: 0, y: -20, duration: 1.2 }, 0.6)
      .from(".rail", { opacity: 0, x: 20, duration: 1.2 }, 0.9)
      .from(".scroll-cue", { opacity: 0, duration: 1.2 }, 1.3);
  }

  function hideLoader() {
    targetPct = 100;
    const finish = () => { loader.remove(); };
    setTimeout(() => {
      loader.classList.add("is-done");
      heroIntro();
      setTimeout(finish, 1200);
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
    runLoaderCounter();
    targetPct = 12;

    const t0 = performance.now();
    const safety = new Promise((r) => setTimeout(r, 9000)); // 최대 대기 시간
    const sceneTask = initScene((p) => { targetPct = Math.max(targetPct, Math.round(12 + p * 80)); })
      .then((s) => { scene = s; scene.jump(stationAt(window.scrollY)); })
      .catch((err) => { console.warn("[exhibition] 3D 장면 없이 표시합니다:", err); body.classList.add("no-webgl"); });

    await Promise.race([Promise.all([sceneTask, document.fonts ? document.fonts.ready : null]), safety]);
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
