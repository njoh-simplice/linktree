// One-page navigation for test.html.
//
// Changing section (dock click, wheel, arrow keys, swipe, back/forward) plays a
// circular reveal that grows from the bottom centre until the whole page shows
// the new section. It uses the View Transitions API; without it, or with
// reduced motion, the page falls back to normal smooth scrolling.
(() => {
  const links = [...document.querySelectorAll(".dock .social")];
  const ids = links.map((link) => link.getAttribute("href").slice(1));
  const sections = ids.map((id) => document.getElementById(id));
  if (!links.length || sections.some((section) => !section)) return;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canReveal = typeof document.startViewTransition === "function" && !reduceMotion.matches;

  const DURATION = 850; // ms
  const EASING = "cubic-bezier(0.7, 0, 0.2, 1)";

  let current = 0;
  let busy = false;

  const setCurrent = (index) => {
    current = index;
    links.forEach((link, i) => {
      if (i === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  // Keeps the highlight right when the page scrolls natively (fallback, hash links on load).
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setCurrent(sections.indexOf(entry.target));
        });
      },
      { threshold: 0.55 },
    );
    sections.forEach((section) => observer.observe(section));
  }
  setCurrent(0);

  const jump = (index) => {
    sections[index].scrollIntoView({ behavior: "instant", block: "start" });
    setCurrent(index);
  };

  const goTo = (index, { push = true } = {}) => {
    if (index < 0 || index >= sections.length || index === current || busy) return;

    if (!canReveal) {
      sections[index].scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    busy = true;
    const transition = document.startViewTransition(() => jump(index));

    transition.ready
      .then(() => {
        const radius = Math.hypot(window.innerWidth / 2, window.innerHeight) + 4;
        root.animate(
          {
            clipPath: [`circle(0px at 50% 100%)`, `circle(${radius}px at 50% 100%)`],
          },
          { duration: DURATION, easing: EASING, pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
    transition.finished.catch(() => {}).finally(() => {
      busy = false;
    });

    if (push) history.pushState(null, "", `#${ids[index]}`);
  };

  links.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      if (!canReveal) return; // normal anchor behaviour
      event.preventDefault();
      goTo(index);
    });
  });

  if (!canReveal) return;
  root.classList.add("nav-lock");

  // Mouse wheel / trackpad: one section per gesture.
  let lastWheel = 0;
  let gestureUsed = false;
  window.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const now = performance.now();
      if (now - lastWheel > 150) gestureUsed = false; // a new gesture started
      lastWheel = now;
      if (busy || gestureUsed || Math.abs(event.deltaY) < 8) return;
      gestureUsed = true;
      goTo(current + (event.deltaY > 0 ? 1 : -1));
    },
    { passive: false },
  );

  // Keyboard
  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = {
      ArrowDown: current + 1,
      PageDown: current + 1,
      ArrowUp: current - 1,
      PageUp: current - 1,
      Home: 0,
      End: sections.length - 1,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    goTo(target);
  });

  // Touch: swipe up = next, swipe down = previous
  let touchY = null;
  window.addEventListener(
    "touchstart",
    (event) => {
      touchY = event.touches[0].clientY;
    },
    { passive: true },
  );
  window.addEventListener(
    "touchend",
    (event) => {
      if (touchY === null) return;
      const dy = touchY - event.changedTouches[0].clientY;
      touchY = null;
      if (Math.abs(dy) > 50) goTo(current + (dy > 0 ? 1 : -1));
    },
    { passive: true },
  );

  // Back / forward buttons
  window.addEventListener("popstate", () => {
    const index = ids.indexOf(location.hash.slice(1));
    goTo(index === -1 ? 0 : index, { push: false });
  });
})();
