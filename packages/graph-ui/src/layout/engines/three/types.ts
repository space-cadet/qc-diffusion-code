import { ILayoutOptions } from '../../types';

export interface IPhysicsOptions {
  gravity: number;
  spring: number;
  damping: number;
}

export interface IThreeLayoutOptions extends ILayoutOptions {
  physics?: IPhysicsOptions;
}