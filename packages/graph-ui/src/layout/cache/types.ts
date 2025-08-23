import { IRenderGraph } from '../../types/rendering';
import { ILayoutOptions } from '../types';

export interface ICacheKey {
  graphId: string;
  options: ILayoutOptions;
}

export interface ILayoutCache {
  get(key: ICacheKey): IRenderGraph | undefined;
  set(key: ICacheKey, layout: IRenderGraph): void;
  clear(): void;
}