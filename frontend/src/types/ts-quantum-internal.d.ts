declare module 'ts-quantum/sparse' {
  import { Complex } from 'mathjs';
  export interface ISparseEntry {
    row: number;
    col: number;
    value: Complex;
  }
  export interface ISparseMatrix {
    rows: number;
    cols: number;
    entries: ISparseEntry[];
    nnz: number;
  }
  export function createSparseMatrix(rows: number, cols: number): ISparseMatrix;
  export function setSparseEntry(matrix: ISparseMatrix, row: number, col: number, value: Complex): void;
  export function sparseVectorMultiply(matrix: ISparseMatrix, vector: Complex[]): Complex[];
  export function sparseMatrixMultiply(a: ISparseMatrix, b: ISparseMatrix): ISparseMatrix;
}
