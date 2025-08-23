import { IGraph } from '@spin-network/graph-core';
import { IRenderGraph } from '../../types/rendering';
import { ILayoutEngine, ILayoutOptions, RendererType } from '../types';
import { LayoutCache } from '../cache/LayoutCache';
import { ICacheKey } from '../cache/types';

export abstract class BaseLayoutEngine implements ILayoutEngine {
  abstract readonly type: RendererType;
  protected cache: LayoutCache;

  constructor() {
    this.cache = new LayoutCache();
  }

  transformToRender(graph: IGraph, options: ILayoutOptions): IRenderGraph {
    const cacheKey: ICacheKey = {
      graphId: graph.id,
      options
    };
    
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const layout = this.computeLayout(graph, options);
    this.cache.set(cacheKey, layout);
    return layout;
  }

  updateLayout(renderGraph: IRenderGraph, options: ILayoutOptions): IRenderGraph {
    // By default, just recompute the layout
    // Subclasses can override for more efficient updates
    return this.transformToRender(renderGraph.graph, options);
  }

  protected abstract computeLayout(graph: IGraph, options: ILayoutOptions): IRenderGraph;
}