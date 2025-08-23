import { IGraph } from '@spin-network/graph-core';
import { IRenderGraph, IRenderPosition } from '../types/rendering';

export type RendererType = 'sigma' | 'three';

export interface ILayoutOptions {
  type: 'grid' | 'force' | 'circular';
  dimensions: 2 | 3;
  preserveTopology?: boolean;
  centerGraph?: boolean;
  spacing?: number;
}

export interface ILayoutEngine {
  readonly type: RendererType;
  transformToRender(graph: IGraph, options: ILayoutOptions): IRenderGraph;
  updateLayout(renderGraph: IRenderGraph, options: ILayoutOptions): IRenderGraph;
}