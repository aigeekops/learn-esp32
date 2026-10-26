// The reference workbench paints its UI on a fixed artboard and scales that
// artboard to the window, so type, spacing and panels keep the same ratio at
// every desktop size. We get the same behaviour from a rem-based stylesheet:
// every length in style.css is rem, and one factor on the root font-size
// rescales the whole desktop UI. The factor is the geometric mean of the width
// and height ratios, which tracks the reference within a few percent.
const BASE = {width: 1200, height: 904};
const MIN = .74;
const MAX = 1.45;

function scaleFor(width: number, height: number) {
  if (width <= 800) return 1; // The phone layout is a separate, unscaled design.
  const k = Math.sqrt((width / BASE.width) * (height / BASE.height));
  return Math.min(MAX, Math.max(MIN, k));
}

export function installUIScale() {
  const apply = () => {
    const k = scaleFor(window.innerWidth, window.innerHeight);
    document.documentElement.style.setProperty('--k', k.toFixed(4));
  };
  apply();
  window.addEventListener('resize', apply, {passive: true});
  window.addEventListener('orientationchange', apply, {passive: true});
}
