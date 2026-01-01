#!/bin/bash

# This script updates import statements in TypeScript files to reflect the new directory structure

# Make the script executable
chmod +x "$0"

cd "$(dirname "$0")"

# Update imports in core files
for file in src/core/*.ts; do
  # Replace './types' with relative paths
  sed -i '' 's|from "./types"|from "./types"|g' "$file"
  
  # Replace imports from lib/quantum with relative paths
  sed -i '' 's|from "../|from "../../|g' "$file"
  sed -i '' 's|from "\.\/|from "\.\/?|g' "$file"
  sed -i '' 's|from "\.\/?|from "\.\/|g' "$file"
  
  # Update imports from specific files
  sed -i '' 's|from "../types"|from "./types"|g' "$file"
  sed -i '' 's|from "../utils/|from "../utils/|g' "$file"
  
  echo "Updated imports in $file"
done

# Update imports in state files
for file in src/states/*.ts; do
  # Replace imports from lib/quantum with relative paths
  sed -i '' 's|from "./types"|from "../core/types"|g' "$file"
  sed -i '' 's|from "./utils/|from "../utils/|g' "$file"
  sed -i '' 's|from "./stateVector"|from "./stateVector"|g' "$file"
  sed -i '' 's|from "./composition"|from "./composite"|g' "$file"
  
  echo "Updated imports in $file"
done

# Update imports in operator files
for file in src/operators/*.ts; do
  # Replace imports from lib/quantum with relative paths
  sed -i '' 's|from "./types"|from "../core/types"|g' "$file"
  sed -i '' 's|from "./utils/|from "../utils/|g' "$file"
  sed -i '' 's|from "./stateVector"|from "../states/stateVector"|g' "$file"
  sed -i '' 's|from "./operator"|from "./operator"|g' "$file"
  sed -i '' 's|from "./operatorAlgebra"|from "./algebra"|g' "$file"
  
  echo "Updated imports in $file"
done

# Update imports in utils files
for file in src/utils/*.ts; do
  # Replace imports from lib/quantum with relative paths
  sed -i '' 's|from "./types"|from "../core/types"|g' "$file"
  sed -i '' 's|from "../types"|from "../core/types"|g' "$file"
  
  echo "Updated imports in $file"
done

# Update imports in test files
for file in __tests__/*.ts; do
  # Replace imports from lib/quantum with relative paths
  sed -i '' 's|from "../|from "../src/|g' "$file"
  sed -i '' 's|from "../types"|from "../src/core/types"|g' "$file"
  sed -i '' 's|from "../stateVector"|from "../src/states/stateVector"|g' "$file"
  sed -i '' 's|from "../operator"|from "../src/operators/operator"|g' "$file"
  sed -i '' 's|from "../operatorAlgebra"|from "../src/operators/algebra"|g' "$file"
  sed -i '' 's|from "../gates"|from "../src/operators/gates"|g' "$file"
  sed -i '' 's|from "../measurement"|from "../src/operators/measurement"|g' "$file"
  sed -i '' 's|from "../hamiltonian"|from "../src/operators/hamiltonian"|g' "$file"
  sed -i '' 's|from "../matrixOperations"|from "../src/utils/matrixOperations"|g' "$file"
  sed -i '' 's|from "../matrixFunctions"|from "../src/utils/matrixFunctions"|g' "$file"
  sed -i '' 's|from "../information"|from "../src/utils/information"|g' "$file"
  sed -i '' 's|from "../oscillator"|from "../src/utils/oscillator"|g' "$file"
  sed -i '' 's|from "../composition"|from "../src/states/composite"|g' "$file"
  sed -i '' 's|from "../densityMatrix"|from "../src/states/densityMatrix"|g' "$file"
  sed -i '' 's|from "../states"|from "../src/states/states"|g' "$file"
  sed -i '' 's|from "../circuit"|from "../src/operators/circuit"|g' "$file"
  sed -i '' 's|from "../hilbertSpace"|from "../src/core/hilbertSpace"|g' "$file"
  sed -i '' 's|from "../utils/|from "../src/utils/|g' "$file"
  
  echo "Updated imports in $file"
done

echo "Import statements updated!"
