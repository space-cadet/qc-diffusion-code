export class LayoutCache {
    constructor() {
        this.cache = new Map();
    }
    generateKey(key) {
        return `${key.graphId}-${JSON.stringify(key.options)}`;
    }
    get(key) {
        return this.cache.get(this.generateKey(key));
    }
    set(key, layout) {
        this.cache.set(this.generateKey(key), layout);
    }
    clear() {
        this.cache.clear();
    }
}
