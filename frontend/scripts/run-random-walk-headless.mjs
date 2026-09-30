#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = { config: undefined, out: undefined, format: "both", help: false };
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value === "--help" || value === "-h") args.help = true;
    else if (["--config", "--out", "--format"].includes(value)) {
      const next = argv[++index];
      if (!next) throw new Error(`${value} needs a value`);
      args[value.slice(2)] = next;
    } else {
      throw new Error(`Unknown argument: ${value}`);
    }
  }
  if (!(["json", "csv", "both"].includes(args.format))) throw new Error("--format must be json, csv, or both");
  return args;
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function validateConfig(config) {
  const required = ["seed", "steps", "sampleEvery", "densityBins", "simulator"];
  for (const key of required) if (config[key] === undefined) throw new Error(`Configuration is missing ${key}`);
  if (!Number.isInteger(config.seed) || config.seed < 0) throw new Error("seed must be a nonnegative integer");
  if (!Number.isInteger(config.steps) || config.steps < 1) throw new Error("steps must be a positive integer");
  if (!Number.isInteger(config.sampleEvery) || config.sampleEvery < 1) throw new Error("sampleEvery must be a positive integer");
  if (!Number.isInteger(config.densityBins) || config.densityBins < 2 || config.densityBins > 128) throw new Error("densityBins must be an integer from 2 to 128");
  if (!Number.isFinite(config.dt) || config.dt <= 0) throw new Error("dt must be positive and finite");
  const simulator = config.simulator;
  for (const key of ["collisionRate", "jumpLength", "velocity", "particleCount", "dimension", "interparticleCollisions"]) {
    if (simulator[key] === undefined) throw new Error(`simulator.${key} is required`);
  }
  if (!Number.isInteger(simulator.particleCount) || simulator.particleCount < 1) throw new Error("simulator.particleCount must be a positive integer");
  if (!( ["thermal", "strategy"].includes(simulator.initialVelocityMode))) throw new Error("simulator.initialVelocityMode must be thermal or strategy");
  for (const key of ["collisionRate", "jumpLength", "velocity"]) {
    if (!Number.isFinite(simulator[key]) || simulator[key] < 0) throw new Error(`simulator.${key} must be nonnegative and finite`);
  }
  if (typeof simulator.interparticleCollisions !== "boolean") throw new Error("simulator.interparticleCollisions must be a boolean");
  if (!(["1D", "2D"].includes(simulator.dimension))) throw new Error("simulator.dimension must be 1D or 2D");
  if (!Array.isArray(simulator.strategies) || simulator.strategies.length === 0) throw new Error("simulator.strategies must contain at least one strategy");
  const supported = new Set(["simple", "ctrw", "levy", "levy-walk", "fractional", "collisions", "kac-goldstein", "masoliver-lindenbergh"]);
  for (const strategy of simulator.strategies) if (!supported.has(strategy)) throw new Error(`Unsupported strategy: ${strategy}`);
  const motionStrategies = simulator.strategies.filter((strategy) => strategy !== "collisions");
  if (motionStrategies.length !== 1) throw new Error("simulator.strategies must select exactly one motion strategy, with optional collisions");
  if (motionStrategies[0] === "kac-goldstein" && simulator.dimension !== "1D") throw new Error("kac-goldstein requires dimension 1D");
  if (motionStrategies[0] === "masoliver-lindenbergh" && simulator.dimension !== "2D") throw new Error("masoliver-lindenbergh requires dimension 2D");
  if (!( ["periodic", "reflective", "absorbing", "unbounded"].includes(simulator.boundaryCondition ?? "periodic"))) {
    throw new Error("simulator.boundaryCondition must be periodic, reflective, absorbing, or unbounded");
  }
}

function summarize(simulator, time, config) {
  const particles = simulator.getParticleManager().getAllParticles();
  const active = particles.filter((particle) => particle.isActive);
  const count = Math.max(1, active.length);
  const totalCount = Math.max(1, particles.length);
  const displacements = active.map((particle) => ({
    x: particle.position.x - (particle.initial?.position.x ?? particle.position.x),
    y: config.simulator.dimension === "2D"
      ? particle.position.y - (particle.initial?.position.y ?? particle.position.y)
      : 0,
  }));
  const meanX = displacements.reduce((sum, value) => sum + value.x, 0) / count;
  const meanY = displacements.reduce((sum, value) => sum + value.y, 0) / count;
  const covarianceXX = displacements.reduce((sum, value) => sum + value.x * value.x, 0) / count - meanX * meanX;
  const covarianceYY = displacements.reduce((sum, value) => sum + value.y * value.y, 0) / count - meanY * meanY;
  const covarianceXY = displacements.reduce((sum, value) => sum + value.x * value.y, 0) / count - meanX * meanY;
  const meanSquareDisplacement = displacements.reduce((sum, value) => sum + value.x * value.x + value.y * value.y, 0) / count;
  const maxDisplacement = Math.max(0, ...displacements.map((value) => Math.hypot(value.x, value.y)));
  const strategy = config.simulator.strategies[0];
  const hasPairCollisions = config.simulator.interparticleCollisions || config.simulator.strategies.includes("collisions");
  const finiteSpeedStrategy = !["levy", "fractional"].includes(strategy)
    && !hasPairCollisions
    && config.simulator.initialVelocityMode === "strategy";
  const strategySpeed = strategy === "kac-goldstein"
    ? config.simulator.velocity * Math.max(config.simulator.canvasWidth / 12, 1)
    : ["masoliver-lindenbergh", "levy-walk"].includes(strategy)
      ? config.simulator.velocity * Math.max(Math.min(config.simulator.canvasWidth, config.simulator.canvasHeight) / 6, 1)
      : config.simulator.velocity;
  const theoreticalFront = finiteSpeedStrategy ? strategySpeed * time : null;
  const frontRatio = theoreticalFront > 0 ? maxDisplacement / theoreticalFront : null;
  const collisions = simulator.getCollisionStats();
  const bins = config.densityBins;
  const positions = active.map((particle) => particle.position);
  const minX = Math.min(0, ...positions.map((position) => position.x));
  const maxX = Math.max(0, ...positions.map((position) => position.x));
  const minY = config.simulator.dimension === "2D" ? Math.min(0, ...positions.map((position) => position.y)) : 0;
  const maxY = config.simulator.dimension === "2D" ? Math.max(0, ...positions.map((position) => position.y)) : 0;
  const paddingX = Math.max((maxX - minX) * 0.05, config.simulator.velocity * config.dt, 1e-6);
  const paddingY = config.simulator.dimension === "2D" ? Math.max((maxY - minY) * 0.05, config.simulator.velocity * config.dt, 1e-6) : 0;
  const bounds = { xMin: minX - paddingX, xMax: maxX + paddingX, yMin: minY - paddingY, yMax: maxY + paddingY };
  const dx = (bounds.xMax - bounds.xMin) / bins;
  const dy = config.simulator.dimension === "2D" ? (bounds.yMax - bounds.yMin) / bins : 1;
  const density = Array.from({ length: config.simulator.dimension === "2D" ? bins : 1 }, () => Array(bins).fill(0));
  for (const position of positions) {
    const ix = Math.min(bins - 1, Math.max(0, Math.floor((position.x - bounds.xMin) / dx)));
    const iy = config.simulator.dimension === "2D" ? Math.min(bins - 1, Math.max(0, Math.floor((position.y - bounds.yMin) / dy))) : 0;
    density[iy][ix] += 1 / (totalCount * dx * dy);
  }
  return {
    time,
    metrics: {
      particleCount: particles.length,
      activeParticles: active.length,
      mass: active.length / Math.max(1, particles.length),
      meanDisplacementX: meanX,
      meanDisplacementY: meanY,
      meanSquareDisplacement,
      covarianceXX,
      covarianceYY,
      covarianceXY,
      totalStrategyEvents: collisions.totalCollisions,
      meanStrategyEvents: collisions.avgCollisions,
      interparticleCollisionPairs: collisions.totalInterparticleCollisions,
      maxDisplacement,
      theoreticalFront,
      frontRatio,
    },
    density: { binsX: bins, binsY: density.length, bounds, values: density },
  };
}

function csvEscape(value) {
  const string = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function toCsv(result) {
  const columns = ["time", "dimension", "binX", "binY", "density", ...Object.keys(result.samples[0]?.metrics ?? {})];
  const rows = [columns.join(",")];
  for (const sample of result.samples) {
    for (let binY = 0; binY < sample.density.binsY; binY++) {
      for (let binX = 0; binX < sample.density.binsX; binX++) {
        rows.push([
          sample.time,
          result.config.simulator.dimension,
          binX,
          binY,
          sample.density.values[binY][binX],
          ...columns.slice(5).map((key) => sample.metrics[key]),
        ].map(csvEscape).join(","));
      }
    }
  }
  return `${rows.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: pnpm random-walk:headless -- --config scripts/examples/random-walk-headless.json [--format json|csv|both] [--out path]");
    return;
  }
  const configPath = path.resolve(args.config ?? path.join(frontendRoot, "scripts/examples/random-walk-headless.json"));
  const inputConfig = JSON.parse(await readFile(configPath, "utf8"));
  const config = {
    ...inputConfig,
    dt: inputConfig.dt ?? 0.01,
    simulator: {
      temperature: 1,
      canvasWidth: 800,
      canvasHeight: 600,
      initialDistType: "uniform",
      boundaryCondition: "periodic",
      distSigmaX: 80,
      distSigmaY: 80,
      distR0: 150,
      distDR: 20,
      distThickness: 40,
      distNx: 20,
      distNy: 15,
      distJitter: 4,
      levyAlpha: 1.5,
      levyScale: 0.1,
      fractionalBeta: 0.7,
      fractionalWaitingScale: 0.1,
      fractionalJumpLength: 0.1,
      initialVelocityMode: "strategy",
      ...inputConfig.simulator,
    },
  };
  validateConfig(config);
  const out = path.resolve(args.out ?? path.join(frontendRoot, `random-walk-run-${config.seed}`));
  const extension = path.extname(out);
  const stem = extension ? out.slice(0, -extension.length) : out;
  const jsonPath = extension === ".json" ? out : `${stem}.json`;
  const csvPath = extension === ".csv" ? out : `${stem}.csv`;
  if ((args.format === "json" || args.format === "both") && jsonPath === configPath) {
    throw new Error("Output path would overwrite the input configuration file");
  }
  if ((args.format === "csv" || args.format === "both") && csvPath === configPath) {
    throw new Error("Output path would overwrite the input configuration file");
  }
  const server = await createServer({
    configFile: path.join(frontendRoot, "vite.config.ts"),
    root: frontendRoot,
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
    logLevel: "error",
  });
  const previousLog = console.log;
  const previousWarn = console.warn;
  let simulator;
  try {
    const { RandomWalkSimulator } = await server.ssrLoadModule("/src/physics/RandomWalkSimulator.ts");
    const random = createRandom(config.seed);
    console.log = () => {};
    console.warn = () => {};
    simulator = new RandomWalkSimulator({
      ...config.simulator,
      dt: config.dt,
      temperature: config.simulator.temperature ?? 1,
      canvasWidth: config.simulator.canvasWidth ?? 800,
      canvasHeight: config.simulator.canvasHeight ?? 600,
      initialDistType: config.simulator.initialDistType ?? "uniform",
      useNewEngine: true,
      useStreamingObservables: false,
      initialVelocityMode: config.simulator.initialVelocityMode ?? "strategy",
      random,
    });
    const samples = [summarize(simulator, 0, config)];
    for (let step = 1; step <= config.steps; step++) {
      simulator.step(config.dt);
      if (step % config.sampleEvery === 0 || step === config.steps) samples.push(summarize(simulator, simulator.getTime(), config));
    }
    const result = {
      schemaVersion: 1,
      seed: config.seed,
      config,
      sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: frontendRoot, encoding: "utf8" }).trim(),
      sourceDirty: execFileSync("git", ["status", "--porcelain"], { cwd: frontendRoot, encoding: "utf8" }).trim().length > 0,
      runner: "RandomWalkSimulator + PhysicsEngine",
      samples,
    };
    console.log = previousLog;
    console.warn = previousWarn;
    await mkdir(path.dirname(jsonPath), { recursive: true });
    if (args.format === "json" || args.format === "both") await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
    if (args.format === "csv" || args.format === "both") await writeFile(csvPath, toCsv(result));
    previousLog(`Wrote ${args.format === "csv" ? csvPath : jsonPath}${args.format === "both" ? ` and ${csvPath}` : ""}; ${samples.length} samples, ${config.simulator.particleCount} walkers, final time ${samples.at(-1).time.toFixed(4)}.`);
  } finally {
    console.log = previousLog;
    console.warn = previousWarn;
    simulator?.dispose();
    await server.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
