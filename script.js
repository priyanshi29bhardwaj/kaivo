/* ============================================================
   KAIVO — Lenis + GSAP (ScrollTrigger, CustomEase)
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

CustomEase.create("InOut", "0.76, 0, 0.24, 1");
CustomEase.create("Out",   "0.25, 1, 0.5, 1");
CustomEase.create("In",    "0.5, 0, 0.75, 0");

/* ---- Lenis ---- */
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
document.documentElement.style.overflow = "hidden";

/* ---------------------------------------------------------
   FRAME 0 — PRELOADER (fades out, no lift)
--------------------------------------------------------- */
function runPreloader() {
  const num = document.getElementById("loadNum");
  const counter = { v: 0 };

  /* hero waits behind, slightly scaled-in */
  gsap.set(["#cabin", "#shutter", ".sky-video"], { scale: 1.12 });
  gsap.set("#shutter", { yPercent: 0 });
  gsap.set("#nav", { opacity: 0 });
  gsap.set(["#titleL", "#titleR"], { opacity: 0, y: 40 });
  gsap.set("#heroFg", { opacity: 0 });

  gsap.set(".brand-lockup", { opacity: 0, filter: "blur(12px)", y: 14 });
  gsap.set(".preloader_tag", { opacity: 0, y: 10 });

  const tl = gsap.timeline();
  tl.to(".brand-lockup", { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, ease: "Out" })
    .to(".preloader_tag", { opacity: 1, y: 0, duration: .8, ease: "Out" }, "-=.5")
    .to(counter, { v: 100, duration: 1.6, ease: "InOut",
      onUpdate: () => (num.textContent = Math.round(counter.v)) }, 0)
    .to(".preloader_count", { opacity: 0, duration: .4 }, "+=.1")
    /* FADE the veil */
    .to("#preloader", { opacity: 0, duration: 1.1, ease: "InOut" }, "-=.2")
    /* settle the cabin + reveal hero copy */
    .to(["#cabin", "#shutter", ".sky-video"], { scale: 1, duration: 1.7, ease: "Out" }, "-=1.1")
    /* lift the window shutter up — its bottom lip + knob come to rest tucked
       just under the top of the window frame (like a real raised shade) */
    .to("#shutter", { yPercent: -68, duration: 3.4, ease: "InOut" }, "-=1.2")
    .to("#nav", { opacity: 1, duration: .9, ease: "Out" }, "-=1.3")
    .to(["#titleL", "#titleR"], { opacity: 1, y: 0, duration: 1.1, ease: "Out", stagger: .12 }, "-=1.2")
    .to("#heroFg", { opacity: 1, duration: 1, ease: "Out" }, "-=1")
    .add(() => {
      document.getElementById("preloader").style.display = "none";
      document.documentElement.style.overflow = "";
      lenis.start();
      document.getElementById("nav").style.pointerEvents = "auto";
      ScrollTrigger.refresh();
    });
}

/* ---------------------------------------------------------
   FRAME 1 — fly THROUGH the window, then keep DESCENDING
   The sky is a persistent fixed layer; the cabin flies past to
   reveal it, then the clouds rise continuously (camera descends)
   straight through the About section — no solid panel ever appears.
--------------------------------------------------------- */
function buildHero() {
  /* cabin fly-through (hero scroll only) */
  gsap.timeline({
    scrollTrigger: { trigger: ".hero_scroll-area", start: "top top", end: "bottom bottom", scrub: true },
  })
    .to("#cabin",     { scale: 9,    ease: "none", duration: .6 }, 0)
    .to(".sky-video", { scale: 1.12, ease: "none", duration: .9 }, 0);

  /* CONTINUOUS DESCENT — objectPosition pans through the video altitude.
     scrub:1.5 adds gentle lag-smoothing to eliminate micro-jank. */
  gsap.fromTo("#skyVideo",
    { objectPosition: "50% 44%" },
    { objectPosition: "50% 92%", ease: "none", overwrite: "auto",
      scrollTrigger: { trigger: ".hero_scroll-area", start: "top top",
                       endTrigger: ".about-s", end: "bottom bottom", scrub: 1.5 } });

  /* Brand reveal — fades in after cabin fully zooms through (~67% hero scroll),
     then fades out as About section approaches */
  gsap.fromTo("#brandReveal",
    { opacity: 0 },
    { opacity: 1, ease: "none",
      scrollTrigger: { trigger: ".hero_scroll-area", start: "55% top", end: "65% top", scrub: 2 } });
  gsap.to("#brandReveal",
    { opacity: 0, ease: "none",
      scrollTrigger: { trigger: ".hero_scroll-area", start: "84% top", end: "bottom top", scrub: 2 } });

  /* Text/UI vanishes instantly the moment any scroll happens */
  let _hidden = false;
  lenis.on("scroll", ({ scroll }) => {
    if (scroll > 10 && !_hidden) {
      _hidden = true;
      gsap.to(["#titleL","#titleR","#heroFg","#nav","#shutter"], { opacity: 0, duration: 0.25, ease: "power2.in", overwrite: true });
    } else if (scroll <= 10 && _hidden) {
      _hidden = false;
      gsap.to(["#titleL","#titleR","#heroFg","#shutter"], { opacity: 1, duration: 0.4, ease: "power2.out", overwrite: true });
      gsap.to("#nav",                           { opacity: 1, duration: 0.4, ease: "power2.out", overwrite: true });
    }
  });
}

/* ---------------------------------------------------------
   FRAME 2 — highlight word reveal
--------------------------------------------------------- */
function buildAbout() {
  const el = document.getElementById("aboutText");
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="word">${w}</span>`).join(" ");
  const spans = el.querySelectorAll(".word");

  let prevLit = -1;
  ScrollTrigger.create({
    trigger: el, start: "top 75%", end: "bottom 90%", scrub: 0.5,
    onUpdate: (self) => {
      const lit = Math.round(self.progress * spans.length);
      if (lit === prevLit) return;
      if (lit > prevLit) {
        for (let i = prevLit < 0 ? 0 : prevLit; i < lit; i++) spans[i]?.classList.add("is-on");
      } else {
        for (let i = lit; i < prevLit; i++) spans[i]?.classList.remove("is-on");
      }
      prevLit = lit;
    },
  });

  gsap.fromTo(".about-s_inner", { y: "8vh" }, {
    y: "-8vh", ease: "none",
    scrollTrigger: { trigger: ".about-s", start: "top bottom", end: "bottom top", scrub: true },
  });
}

/* ---------------------------------------------------------
   BOOT
--------------------------------------------------------- */
function boot() {
  if (boot._done) return; boot._done = true;
  const v = document.getElementById("skyVideo");
  if (v) v.play().catch(() => {});
  buildHero();
  buildAbout();
  runPreloader();
  ScrollTrigger.refresh();
}
if (document.readyState === "complete") boot();
else { window.addEventListener("load", boot); setTimeout(boot, 2500); }

window.addEventListener("resize", () => ScrollTrigger.refresh());

/* ---- Waitlist modal ---- */
function openWaitlist() {
  document.getElementById("wlBackdrop").classList.add("is-open");
  document.getElementById("wlModal").classList.add("is-open");
  document.body.style.overflow = "hidden";
}
function closeWaitlist() {
  document.getElementById("wlBackdrop").classList.remove("is-open");
  document.getElementById("wlModal").classList.remove("is-open");
  document.body.style.overflow = "";
}
function submitWaitlist(e) {
  e.preventDefault();
  document.getElementById("wlForm").style.display = "none";
  document.getElementById("wlSuccess").style.display = "block";
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeWaitlist(); });
