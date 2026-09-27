export interface RandomSource {
  next(): number;
  reset(seed: number): void;
}

export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    // Mulberry32 gives a compact, deterministic source suitable for reproducible
    // simulation runs. It is not intended for cryptographic use.
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  reset(seed: number): void {
    this.state = seed >>> 0;
  }
}
