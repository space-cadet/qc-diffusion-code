import { afterEach, describe, expect, test, vi } from "vitest";
import { RandomWalkSimulator } from "../RandomWalkSimulator";
import { SeededRandom } from "../utils/SeededRandom";

function runSeeded(seed: number) {
  const source = new SeededRandom(seed);
  const simulator = new RandomWalkSimulator({
    collisionRate: 1,
    jumpLength: 1,
    velocity: 1,
    dt: 0.01,
    particleCount: 16,
    dimension: "2D",
    interparticleCollisions: false,
    strategies: ["masoliver-lindenbergh"],
    boundaryCondition: "unbounded",
    initialDistType: "gaussian",
    distSigmaX: 10,
    distSigmaY: 10,
    distR0: 20,
    distDR: 2,
    distThickness: 4,
    distNx: 4,
    distNy: 4,
    distJitter: 0,
    temperature: 1,
    useNewEngine: true,
    random: () => source.next(),
  });
  for (let step = 0; step < 20; step++) simulator.step(0.01);
  const snapshot = simulator.getParticleManager().getAllParticles().map((particle) => ({
    position: particle.position,
    velocity: particle.velocity,
    events: particle.collisionCount,
  }));
  simulator.dispose();
  return snapshot;
}

describe("RandomWalkSimulator seeded headless execution", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("repeats initialization and engine steps for the same random source", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(runSeeded(15026)).toEqual(runSeeded(15026));
  });

  test("changes the initialized ensemble when the seed changes", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(runSeeded(15026)).not.toEqual(runSeeded(15027));
  });
});
