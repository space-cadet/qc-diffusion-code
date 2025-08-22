export class Vector {
  x: number;
  y?: number;
  z?: number;

  constructor(x: number, y?: number, z?: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  magnitude(): number {
    if (this.y === undefined) return Math.abs(this.x);
    if (this.z === undefined) return Math.sqrt(this.x**2 + this.y**2);
    return Math.sqrt(this.x**2 + this.y**2 + this.z**2);
  }

  normalize(): Vector {
    const mag = this.magnitude();
    return new Vector(
      this.x / mag,
      this.y && this.y / mag,
      this.z && this.z / mag
    );
  }
}
