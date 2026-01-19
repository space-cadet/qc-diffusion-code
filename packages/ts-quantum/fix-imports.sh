#!/bin/bash

# Fix import type syntax for all files in ts-quantum
cd /Users/deepak/code/qc-diffusion-code/packages/ts-quantum

# Fix Complex imports
find src -name "*.ts" -exec sed -i '' 's/import { Complex,/import type { Complex,/g' {} \;

# Fix IStateVector imports  
find src -name "*.ts" -exec sed -i '' 's/import { IStateVector,/import type { IStateVector,/g' {} \;

# Fix IOperator imports
find src -name "*.ts" -exec sed -i '' 's/import { IOperator,/import type { IOperator,/g' {} \;

# Fix OperatorType imports
find src -name "*.ts" -exec sed -i '' 's/import { OperatorType,/import type { OperatorType,/g' {} \;

# Fix ISparseMatrix imports
find src -name "*.ts" -exec sed -i '' 's/import { ISparseMatrix,/import type { ISparseMatrix,/g' {} \;

# Fix ISparseEntry imports
find src -name "*.ts" -exec sed -i '' 's/import { ISparseEntry,/import type { ISparseEntry,/g' {} \;

# Fix IDensityMatrix imports
find src -name "*.ts" -exec sed -i '' 's/import { IDensityMatrix,/import type { IDensityMatrix,/g' {} \;

# Fix IQuantumChannel imports
find src -name "*.ts" -exec sed -i '' 's/import { IQuantumChannel,/import type { IQuantumChannel,/g' {} \;

# Fix IMeasurementOutcome imports
find src -name "*.ts" -exec sed -i '' 's/import { IMeasurementOutcome,/import type { IMeasurementOutcome,/g' {} \;

# Fix ComplexMatrix imports
find src -name "*.ts" -exec sed -i '' 's/import { ComplexMatrix,/import type { ComplexMatrix,/g' {} \;

# Fix IMatrixDimensions imports
find src -name "*.ts" -exec sed -i '' 's/import { IMatrixDimensions,/import type { IMatrixDimensions,/g' {} \;

# Fix IValidationResult imports
find src -name "*.ts" -exec sed -i '' 's/import { IValidationResult,/import type { IValidationResult,/g' {} \;

# Fix AngularMomentumMetadata imports
find src -name "*.ts" -exec sed -i '' 's/import { AngularMomentumMetadata,/import type { AngularMomentumMetadata,/g' {} \;

echo "Fixed import type syntax"
