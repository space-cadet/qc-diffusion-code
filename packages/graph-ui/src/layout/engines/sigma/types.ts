import { ILayoutOptions } from '../../types';

export interface ISigmaLayoutOptions extends ILayoutOptions {
  iterations?: number;
  gravity?: number;
  strongGravity?: boolean;
  scalingRatio?: number;
}