// Dock magnification for the social icons.
//
// Each tile's width follows the pointer: BASE at RANGE px away (or more),
// rising linearly to MAX directly under it. Widths are real layout sizes, so
// neighbours are pushed apart and the bar widens, and each width is driven
// by a spring so the motion stays smooth.
(() => {
  const nav = document.querySelector(".dock");
  if (!nav) return;

  const mouseOnly = window.matchMedia("(hover: hover)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!mouseOnly.matches || reduceMotion.matches) return;

  const tiles = [...nav.querySelectorAll(".social")];

  const BASE = 40; // px, resting tile size
  const MAX = 80; // px, tile size right under the pointer
  const RANGE = 200; // px, distance over which the effect fades out

  // Spring (same feel as framer-motion's mass 0.1 / stiffness 120 / damping 12)
  const MASS = 0.1;
  const STIFFNESS = 120;
  const DAMPING = 12;

  const size = tiles.map(() => BASE);
  const velocity = tiles.map(() => 0);
  const target = tiles.map(() => BASE);
  let mouseX = Infinity;
  let running = false;
  let last = 0;

  // Recomputed whenever the pointer moves, from the tiles' live positions.
  const aim = () => {
    tiles.forEach((tile, i) => {
      const r = tile.getBoundingClientRect();
      const d = Math.abs(mouseX - (r.left + r.width / 2));
      target[i] = d >= RANGE ? BASE : BASE + (MAX - BASE) * (1 - d / RANGE);
    });
    start();
  };

  const frame = (now) => {
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    let moving = false;

    for (let i = 0; i < tiles.length; i++) {
      for (let s = 0; s < steps; s++) {
        const accel = (STIFFNESS * (target[i] - size[i]) - DAMPING * velocity[i]) / MASS;
        velocity[i] += accel * h;
        size[i] += velocity[i] * h;
      }

      const settled = Math.abs(target[i] - size[i]) < 0.01 && Math.abs(velocity[i]) < 0.01;
      if (settled) {
        size[i] = target[i];
        velocity[i] = 0;
      } else {
        moving = true;
      }
      tiles[i].style.width = size[i] === BASE ? "" : `${size[i].toFixed(2)}px`;
    }

    if (moving) requestAnimationFrame(frame);
    else running = false;
  };

  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };

  nav.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    mouseX = e.clientX;
    aim();
  });

  nav.addEventListener("pointerleave", () => {
    mouseX = Infinity;
    aim();
  });
})();

// Letter scramble for the name: plays on load, then on hover.
(() => {
  const brand = document.querySelector(".brand span");
  if (!brand) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const original = brand.textContent.trim();
  const LOWER = "abcdefghijklmnopqrstuvwxyz";
  const UPPER = LOWER.toUpperCase();
  const FRAME_MS = 40; // how often the random letters change
  const BASE_MS = 150; // delay before the first letter settles
  const STEP_MS = 60; // extra delay for each following letter
  const total = BASE_MS + original.length * STEP_MS;
  let raf = 0;

  const randomLike = (ch) => {
    if (/[a-z]/.test(ch)) return LOWER[Math.floor(Math.random() * LOWER.length)];
    if (/[A-Z]/.test(ch)) return UPPER[Math.floor(Math.random() * UPPER.length)];
    return ch;
  };

  const scramble = () => {
    cancelAnimationFrame(raf);
    let start = null;
    let last = 0;

    const tick = (now) => {
      if (start === null) start = now;
      const elapsed = now - start;
      if (elapsed >= total) {
        brand.textContent = original;
        return;
      }
      if (now - last >= FRAME_MS) {
        last = now;
        let out = "";
        for (let i = 0; i < original.length; i++) {
          out += elapsed >= BASE_MS + i * STEP_MS ? original[i] : randomLike(original[i]);
        }
        brand.textContent = out;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
  };

  brand.parentElement.addEventListener("mouseenter", scramble);
  scramble();
})();

// Today's date in Roman numerals, top right (e.g. XXVII · X · MMXXVI).
(() => {
  const el = document.getElementById("today");
  if (!el) return;

  const NUMERALS = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  const roman = (n) =>
    NUMERALS.reduce((out, [value, sym]) => {
      while (n >= value) {
        out += sym;
        n -= value;
      }
      return out;
    }, "");

  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  el.dateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  el.textContent = [now.getDate(), now.getMonth() + 1, now.getFullYear()].map(roman).join(" · ");
})();

// The empty "+" project card opens a toast at the bottom right.
(() => {
  const trigger = document.querySelector(".project-empty");
  const toast = document.getElementById("toast");
  if (!trigger || !toast) return;

  const text = toast.querySelector(".toast-text");
  const MESSAGE = "Thanks for clicking! Now follow me on my social media.";
  const VISIBLE_MS = 4500;
  let timer = 0;

  const hide = () => {
    toast.classList.remove("is-visible");
    clearTimeout(timer);
  };

  trigger.addEventListener("click", () => {
    text.textContent = MESSAGE;
    toast.classList.add("is-visible");
    clearTimeout(timer);
    timer = setTimeout(hide, VISIBLE_MS);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
})();
