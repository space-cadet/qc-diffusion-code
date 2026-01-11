import { LayoutCache } from '../cache/LayoutCache';
export class BaseLayoutEngine {
    constructor() {
        this.cache = new LayoutCache();
    }
    transformToRender(graph, options) {
        const cacheKey = {
            graphId: graph.id,
            options
        };
        const cached = this.cache.get(cacheKey);
        if (cached)
            return cached;
        const layout = this.computeLayout(graph, options);
        this.cache.set(cacheKey, layout);
        return layout;
    }
    updateLayout(renderGraph, options) {
        // By default, just recompute the layout
        // Subclasses can override for more efficient updates
        return this.transformToRender(renderGraph.graph, options);
    }
}
