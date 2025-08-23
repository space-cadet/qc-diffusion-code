import { IGraph } from '@spin-network/graph-core';
import { IRenderGraph } from '../../../types/rendering';
import { BaseLayoutEngine } from '../../common/BaseLayoutEngine';
import { ILayoutOptions } from '../../types';
import { PhysicsSimulation } from './physics';
import { IThreeLayoutOptions } from './types';

export class ThreeLayoutEngine extends BaseLayoutEngine {
  readonly type = 'three';
  private simulation: PhysicsSimulation;

  constructor() {
    super();
    this.simulation = new PhysicsSimulation();
  }

  protected computeLayout(graph: IGraph, options: ILayoutOptions): IRenderGraph {
    const threeOptions = options as IThreeLayoutOptions;
    return this.simulation.computeLayout(graph, threeOptions);
  }

  updateLayout(renderGraph: IRenderGraph, options: ILayoutOptions): IRenderGraph {
    // For Three.js, we always want to continue the simulation
    return this.computeLayout(renderGraph.graph, options);
  }
}