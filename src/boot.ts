/** Minimum time the boot screen stays visible, measured from navigation start. */
const MIN_VISIBLE = 700;

/**
 * Drives the boot screen in index.html. The markup and its critical CSS are
 * inline so the first paint is the loader, never a blank page or a flash of
 * unstyled workbench.
 */
export class Boot {
  private root: HTMLElement | null;
  private fill: HTMLElement | null;
  private step: HTMLElement | null;
  private value = 0;
  private closed = false;

  constructor(root: HTMLElement | null = document.getElementById('boot')) {
    this.root = root;
    this.fill = root?.querySelector<HTMLElement>('.boot-fill') ?? null;
    this.step = root?.querySelector<HTMLElement>('.boot-step') ?? null;
  }

  /** Advance the bar without ever moving it backwards. */
  progress(label: string, value: number) {
    if (this.closed) return;
    if (label && this.step) this.step.textContent = label;
    if (value > this.value) {
      this.value = value;
      if (this.fill) this.fill.style.transform = `scaleX(${value})`;
    }
  }

  async done(reducedMotion = false) {
    if (this.closed) return;
    this.value = 1;
    if (this.fill) this.fill.style.transform = 'scaleX(1)';
    this.closed = true;
    // performance.now() counts from navigation, so a slow bundle does not
    // stack an extra delay on top of an already long wait.
    const wait = reducedMotion ? 0 : Math.max(0, MIN_VISIBLE - performance.now());
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    document.documentElement.classList.remove('is-loading');
    document.getElementById('app')?.removeAttribute('inert');
    if (!this.root) return;
    this.root.classList.add('is-done');
    const fade = reducedMotion ? 0 : Number.parseFloat(getComputedStyle(this.root).transitionDuration) * 1000 || 450;
    if (fade) await new Promise(resolve => setTimeout(resolve, fade + 60));
    this.root.remove();
  }

  /** Keep the lessons usable if the 3D scene throws during startup. */
  fail(message: string) {
    if (this.closed || !this.root) return;
    this.closed = true;
    document.documentElement.classList.remove('is-loading');
    document.getElementById('app')?.removeAttribute('inert');
    this.root.classList.add('is-failed');
    if (this.step) this.step.textContent = message;
    window.setTimeout(() => this.root?.classList.add('is-done'), 3200);
  }
}
