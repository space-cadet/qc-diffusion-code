export class Vector {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    magnitude() {
        if (this.y === undefined)
            return Math.abs(this.x);
        if (this.z === undefined)
            return Math.sqrt(this.x ** 2 + this.y ** 2);
        return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
    }
    normalize() {
        const mag = this.magnitude();
        return new Vector(this.x / mag, this.y && this.y / mag, this.z && this.z / mag);
    }
}
