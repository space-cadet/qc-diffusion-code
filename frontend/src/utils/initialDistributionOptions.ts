import type { RandomWalkParams } from "../types/simulationTypes";

export type WalkDimension = "1D" | "2D";
export type WalkInitialDistribution = RandomWalkParams["initialDistType"];

export const INITIAL_DISTRIBUTIONS_BY_DIMENSION: Record<WalkDimension, Array<{
  value: WalkInitialDistribution;
  label: string;
}>> = {
  "1D": [
    { value: "uniform", label: "Uniform" },
    { value: "gaussian", label: "Gaussian" },
    { value: "origin", label: "Point source at origin" },
    { value: "centered", label: "Centered single bump" },
    { value: "bimodal", label: "Symmetric bimodal" },
    { value: "asymmetric", label: "Asymmetric initial profile" },
    { value: "stripe", label: "Stripe" },
    { value: "grid", label: "Grid" },
  ],
  "2D": [
    { value: "uniform", label: "Uniform" },
    { value: "gaussian", label: "Gaussian" },
    { value: "origin", label: "Point source at origin" },
    { value: "ring", label: "Ring" },
    { value: "stripe", label: "Stripe" },
    { value: "grid", label: "Grid" },
  ],
};

export type InitialDistributionsByDimension = Partial<Record<WalkDimension, WalkInitialDistribution>>;

export function isInitialDistributionAvailable(
  dimension: WalkDimension,
  distribution: WalkInitialDistribution | string | undefined,
): distribution is WalkInitialDistribution {
  return INITIAL_DISTRIBUTIONS_BY_DIMENSION[dimension].some(({ value }) => value === distribution);
}

export function getInitialDistributionForDimension(
  dimension: WalkDimension,
  currentDistribution: WalkInitialDistribution,
  remembered: InitialDistributionsByDimension | undefined,
): WalkInitialDistribution {
  const rememberedDistribution = remembered?.[dimension];
  if (isInitialDistributionAvailable(dimension, rememberedDistribution)) return rememberedDistribution;
  if (isInitialDistributionAvailable(dimension, currentDistribution)) return currentDistribution;
  return "uniform";
}

export function rememberInitialDistribution(
  remembered: InitialDistributionsByDimension | undefined,
  dimension: WalkDimension,
  distribution: WalkInitialDistribution,
): InitialDistributionsByDimension {
  return { ...remembered, [dimension]: distribution };
}
