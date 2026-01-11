import { BaseLayoutEngine } from '../../common/BaseLayoutEngine';
import { PhysicsSimulation } from './physics';
export class ThreeLayoutEngine extends BaseLayoutEngine {
    constructor() {
        super();
        this.type = 'three';
        this.simulation = new PhysicsSimulation();
    }
    computeLayout(graph, options) {
        const threeOptions = options;
        return this.simulation.computeLayout(graph, threeOptions);
    }
    updateLayout(renderGraph, options) {
        // For Three.js, we always want to continue the simulation
        return this.computeLayout(renderGraph.graph, options);
    }
}
