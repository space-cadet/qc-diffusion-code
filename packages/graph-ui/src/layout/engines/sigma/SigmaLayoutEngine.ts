import { circular, random } from 'graphology-layout';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { IGraph, GraphologyAdapter } from '@spin-network/graph-core';
import { IRenderGraph } from '../../../types/rendering';
import { BaseLayoutEngine } from '../../common/BaseLayoutEngine';
import { ILayoutOptions } from '../../types';
import { adaptGraphologyLayout } from './adapters';
import { ISigmaLayoutOptions } from './types';

export class SigmaLayoutEngine extends BaseLayoutEngine {
  readonly type = 'sigma';

  protected computeLayout(graph: IGraph, options: ILayoutOptions): IRenderGraph {
    const graphology = (graph as GraphologyAdapter).getGraphologyInstance();
    const sigmaOptions = options as ISigmaLayoutOptions;

    // First apply initial layout
    switch (options.type) {
      case 'grid':
        circular.assign(graphology);
        break;
      case 'force':
        forceAtlas2.assign(graphology, {
          iterations: sigmaOptions.iterations || 50,
          settings: {
            gravity: sigmaOptions.gravity || 1,
            strongGravity: sigmaOptions.strongGravity || false,
            scalingRatio: sigmaOptions.scalingRatio || 1
          }
        });
        break;
      case 'circular':
        circular.assign(graphology);
        break;
      default:
        // Default to random layout
        random.assign(graphology);
    }

    return adaptGraphologyLayout(graphology, sigmaOptions);
  }

  updateLayout(renderGraph: IRenderGraph, options: ILayoutOptions): IRenderGraph {
    // For force layout, we can continue from current positions
    if (options.type === 'force') {
      const graphology = renderGraph.graph as Graphology;
      const sigmaOptions = options as ISigmaLayoutOptions;

      forceAtlas2.assign(graphology, {
        iterations: sigmaOptions.iterations || 10, // Fewer iterations for updates
        settings: {
          gravity: sigmaOptions.gravity || 1,
          strongGravity: sigmaOptions.strongGravity || false,
          scalingRatio: sigmaOptions.scalingRatio || 1
        }
      });

      return adaptGraphologyLayout(graphology, sigmaOptions);
    }

    // For other layouts, just recompute
    return this.transformToRender(renderGraph.graph, options);
  }
}