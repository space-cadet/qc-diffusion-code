import { IRenderGraph } from '../../types/rendering';
import { ILayoutOptions } from '../types';
import { ICacheKey, ILayoutCache } from './types';

export class LayoutCache implements ILayoutCache {
  private cache: Map<string, IRenderGraph>;

  constructor() {
    this.cache = new Map();
  }

  private generateKey(key: ICacheKey): string {
    return `${key.graphId}-${JSON.stringify(key.options)}`;
  }

  get(key: ICacheKey): IRenderGraph | undefined {
    return this.cache.get(this.generateKey(key));
  }

  set(key: ICacheKey, layout: IRenderGraph): void {
    this.cache.set(this.generateKey(key), layout);
  }

  clear(): void {
    this.cache.clear();
  }
}