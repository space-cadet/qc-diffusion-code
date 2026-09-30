import React from "react";

export function RandomWalkHeader() {
  return (
    <header className="flex items-center p-4">
      <div>
        <h1 className="mb-2 text-2xl font-bold">Random Walk → Telegraph Equation</h1>
        <p className="text-gray-600">
          Interactive simulation showing stochastic particle motion converging
          to telegraph equation
        </p>
      </div>
    </header>
  );
}
