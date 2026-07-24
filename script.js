/* =========================================================
   Muaz — Portfolio interactions
   Theme toggle · nav · scroll progress · reveal · counters · scroll-spy
   ========================================================= */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     Dynamic year
  --------------------------------------------------------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Theme (dark / light) — toggle + persistence
     Initial theme is applied pre-paint by an inline <head>
     script; here we sync the UI and handle switching.
  --------------------------------------------------------- */
  const root = document.documentElement;
  const themeToggle = document.getElementById("themeToggle");
  const themeColorMeta = document.getElementById("themeColorMeta");
  const THEME_COLORS = { dark: "#141210", light: "#f4f0e7" };

  // Theme is intentionally NOT persisted — every page load starts in light.
  // The toggle only affects the current view; refresh resets to light.

  const applyTheme = (theme) => {
    root.setAttribute("data-theme", theme);
    const nextLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
    if (themeToggle) {
      themeToggle.setAttribute("aria-label", nextLabel);
      themeToggle.setAttribute("title", nextLabel);
    }
    if (themeColorMeta) themeColorMeta.setAttribute("content", THEME_COLORS[theme]);
  };

  applyTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light");

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      if (!prefersReduced) {
        root.classList.add("theme-transition");
        window.setTimeout(() => root.classList.remove("theme-transition"), 500);
      }
      applyTheme(next);
    });
  }

  // Note: we intentionally do NOT follow the OS color-scheme preference.
  // First-visit default is always light; the user's toggle choice is respected thereafter.

  /* ---------------------------------------------------------
     Top bar: scrolled state + mobile menu
  --------------------------------------------------------- */
  const bar = document.getElementById("bar");
  const navToggle = document.getElementById("navToggle");
  const barNav = document.getElementById("barNav");

  const onScrollBar = () => {
    if (bar) bar.classList.toggle("is-scrolled", window.scrollY > 16);
  };
  onScrollBar();

  if (navToggle && barNav) {
    const setMenu = (open) => {
      barNav.classList.toggle("is-open", open);
      navToggle.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
    };
    navToggle.addEventListener("click", () => setMenu(!barNav.classList.contains("is-open")));
    barNav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => setMenu(false))
    );
  }

  /* ---------------------------------------------------------
     Scroll progress bar
  --------------------------------------------------------- */
  const progress = document.getElementById("scrollProgress");
  const onScrollProgress = () => {
    if (!progress) return;
    const h = document.documentElement;
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    progress.style.width = Math.min(100, scrolled * 100) + "%";
  };
  onScrollProgress();

  /* Combined rAF-throttled scroll listener */
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        onScrollBar();
        onScrollProgress();
        ticking = false;
      });
    },
    { passive: true }
  );

  /* ---------------------------------------------------------
     Reveal on scroll + light stagger for grouped items
  --------------------------------------------------------- */
  const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));

  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    document.querySelectorAll(".hero__main, .hero__tiles, .index, .stack, .timeline, .about").forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        if (child.hasAttribute("data-reveal")) {
          child.style.transitionDelay = Math.min(i * 70, 420) + "ms";
        }
      });
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));

    /* The hero is the entry screen. On phones its info tiles sit just below the
       fold, so waiting for a scroll leaves a blank gap on first paint. Reveal
       everything inside the hero on load (each item keeps its own
       transition-delay, so the staggered entrance is preserved) and stop
       observing those nodes. */
    const heroEls = revealEls.filter((el) => el.closest(".hero"));
    requestAnimationFrame(() => {
      heroEls.forEach((el) => {
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    });
  }

  /* ---------------------------------------------------------
     Animated counters
  --------------------------------------------------------- */
  const counters = document.querySelectorAll("[data-count]");
  if (counters.length && !prefersReduced && "IntersectionObserver" in window) {
    const animateCount = (el) => {
      const target = parseFloat(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || "";
      const dur = 1400;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          countIO.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach((el) => {
      /* Hero counters live in the entry screen (below the fold on phones): run
         them on load so a revealed tile never shows a stale "0". Everything
         else still counts up when scrolled into view. */
      if (el.closest(".hero")) {
        animateCount(el);
      } else {
        countIO.observe(el);
      }
    });
  } else {
    counters.forEach((el) => {
      el.textContent = (el.dataset.count || "0") + (el.dataset.suffix || "");
    });
  }

  /* ---------------------------------------------------------
     Stack section — hidden by default, toggled by nav link
  --------------------------------------------------------- */
  const stackSection = document.getElementById("stack");
  const stackNavLink = document.querySelector('.bar__link[href="#stack"]');

  const openStack = () => {
    if (!stackSection) return;
    stackSection.classList.add("is-open");
    if (stackNavLink) stackNavLink.classList.add("is-active");
  };

  const closeStack = () => {
    if (!stackSection) return;
    stackSection.classList.remove("is-open");
    if (stackNavLink) stackNavLink.classList.remove("is-active");
  };

  if (stackNavLink) {
    stackNavLink.addEventListener("click", (e) => {
      e.preventDefault();
      const isOpen = stackSection.classList.contains("is-open");
      if (isOpen) {
        closeStack();
      } else {
        openStack();
        // Scroll to it after the transition starts
        setTimeout(() => {
          stackSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    });
  }

  // Close stack when any other nav link is clicked
  document.querySelectorAll('.bar__link:not([href="#stack"])').forEach((link) => {
    link.addEventListener("click", closeStack);
  });
  const linkMap = new Map();
  document.querySelectorAll(".bar__link").forEach((link) => {
    const id = link.getAttribute("href");
    if (id && id.startsWith("#") && id !== "#stack") linkMap.set(id.slice(1), link);
  });

  const spyTargets = Array.from(linkMap.keys())
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (spyTargets.length && "IntersectionObserver" in window) {
    const spyIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = linkMap.get(entry.target.id);
          if (!link) return;
          if (entry.isIntersecting) {
            linkMap.forEach((l) => l.classList.remove("is-active"));
            link.classList.add("is-active");
          }
        });
      },
      { threshold: 0.5 }
    );
    spyTargets.forEach((s) => spyIO.observe(s));
  }

  /* ---------------------------------------------------------
     Console easter egg
  --------------------------------------------------------- */
  console.log(
    "%c Hey, curious dev :) — built by Muaz. There's also a Windows XP version at muaz.pro ",
    "background:#141210;color:#ff5a2c;padding:8px 12px;border-radius:6px;font-family:monospace;"
  );
})();
