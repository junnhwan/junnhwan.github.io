/** Timing shared by the real canvas loop and its cadence regression checks. */
export class FrameClock {
  private last: number | null = null;
  private nextPaint: number | null = null;
  private accumulator = 0;

  reset() { this.last = null; this.nextPaint = null; this.accumulator = 0; }

  /** `paintInterval` halves the paint rate on the lowest quality level; physics stays 60 Hz. */
  advance(now: number, paintInterval = 1000 / 60) {
    const step = 1 / 60;
    this.accumulator += this.last === null ? 0 : Math.max(0, Math.min((now - this.last) / 1000, step * 5));
    this.last = now;
    let steps = 0;
    while (this.accumulator + 1e-9 >= step && steps < 5) {
      this.accumulator = Math.max(0, this.accumulator - step);
      steps++;
    }
    // Keep the deadline's remainder: resetting it to `now` drops display frames.
    const draw = this.nextPaint === null || now + .5 >= this.nextPaint;
    if (draw) {
      this.nextPaint = this.nextPaint === null ? now + paintInterval
        : this.nextPaint + Math.max(1, Math.floor((now + .5 - this.nextPaint) / paintInterval) + 1) * paintInterval;
    }
    return { steps, draw };
  }
}
