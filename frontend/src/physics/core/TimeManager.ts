export class TimeManager {
  private simulationTime = 0; // seconds
  private timeStep: number;

  constructor(timeStep: number = 0.016) { // ~60 FPS default
    this.timeStep = timeStep;
  }

  advance(): number {
    this.simulationTime += this.timeStep;
    return this.timeStep;
  }

  getCurrentTime(): number {
    return this.simulationTime;
  }

  reset(): void {
    this.simulationTime = 0;
  }

  setTimeStep(dt: number): void {
    this.timeStep = dt;
  }
}
