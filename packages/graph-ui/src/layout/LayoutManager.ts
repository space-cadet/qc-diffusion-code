import { IGraph } from '@spin-network/graph-core';
import { IRenderGraph } from '../types/rendering';
import { ILayoutEngine, ILayoutOptions, RendererType } from './types';
import { SigmaLayoutEngine } from './engines/sigma/SigmaLayoutEngine';
import { ThreeLayoutEngine } from './engines/three/ThreeLayoutEngine';

export class LayoutManager {
  private engines: Map<RendererType, ILayoutEngine>;

  constructor() {
    this.engines = new Map([
      ['sigma', new SigmaLayoutEngine()],
      ['three', new ThreeLayoutEngine()]
    ]);
  }

  transformToRender(
    graph: IGraph, 
    options: ILayoutOptions & { renderer: RendererType }
  ): IRenderGraph {
    const engine = this.engines.get(options.renderer);
    if (!engine) {
      throw new Error(`No layout engine found for renderer: ${options.renderer}`);
    }
    return engine.transformToRender(graph, options);
  }

  updateLayout(
    renderGraph: IRenderGraph,
    options: ILayoutOptions & { renderer: RendererType }
  ): IRenderGraph {
    const engine = this.engines.get(options.renderer);
    if (!engine) {
      throw new Error(`No layout engine found for renderer: ${options.renderer}`);
    }
    return engine.updateLayout(renderGraph, options);
  }
}