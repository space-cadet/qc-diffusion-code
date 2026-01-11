export class CircularBuffer {
    constructor(capacity) {
        this.head = 0;
        this.tail = 0;
        this.size = 0;
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }
    push(item) {
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        if (this.size < this.capacity) {
            this.size++;
        }
        else {
            this.head = (this.head + 1) % this.capacity;
        }
    }
    get(index) {
        if (index < 0 || index >= this.size) {
            return undefined;
        }
        const actualIndex = (this.head + index) % this.capacity;
        return this.buffer[actualIndex];
    }
    getAll() {
        const result = [];
        for (let i = 0; i < this.size; i++) {
            result.push(this.buffer[(this.head + i) % this.capacity]);
        }
        return result;
    }
    clear() {
        this.head = 0;
        this.tail = 0;
        this.size = 0;
    }
    getSize() {
        return this.size;
    }
    getCapacity() {
        return this.capacity;
    }
    isFull() {
        return this.size === this.capacity;
    }
    isEmpty() {
        return this.size === 0;
    }
}
