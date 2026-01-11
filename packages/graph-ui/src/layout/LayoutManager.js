import { SigmaLayoutEngine } from './engines/sigma/SigmaLayoutEngine';
import { ThreeLayoutEngine } from './engines/three/ThreeLayoutEngine';
export class LayoutManager {
    constructor() {
        this.engines = new Map([
            ['sigma', new SigmaLayoutEngine()],
            ['three', new ThreeLayoutEngine()]
        ]);
    }
    transformToRender(graph, options) {
        const engine = this.engines.get(options.renderer);
        if (!engine) {
            throw new Error(`No layout engine found for renderer: ${options.renderer}`);
        }
        return engine.transformToRender(graph, options);
    }
    updateLayout(renderGraph, options) {
        const engine = this.engines.get(options.renderer);
        if (!engine) {
            throw new Error(`No layout engine found for renderer: ${options.renderer}`);
        }
        return engine.updateLayout(renderGraph, options);
    }
}
