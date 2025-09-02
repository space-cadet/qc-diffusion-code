import type { Observable } from '../interfaces/Observable';
import type { Particle } from '../types/Particle';
import type { ParsedObservable } from './TextObservableParser';
import { TextObservableParser } from './TextObservableParser';
import { ExpressionEvaluator } from './ExpressionEvaluator';

export class TextObservable implements Observable {
  private definition: ParsedObservable;
  public readonly id: string;

  constructor(definition: ParsedObservable) {
    this.definition = definition;
    this.id = `text_${this.definition.name}`;
  }

  calculate(particles: Particle[], timestamp: number): number {
    return this.compute(particles, timestamp);
  }

  reset(): void {}

  getName(): string {
    return this.definition.name;
  }

  getDescription(): string {
    const parts = [];
    if (this.definition.filter) parts.push(`filter: ${this.definition.filter}`);
    if (this.definition.select) parts.push(`select: ${this.definition.select}`);
    parts.push(`reduce: ${this.definition.reduce}`);
    return parts.join(', ');
  }

  getInterval(): number {
    return this.definition.interval || 1000; // Default 1 second
  }

  private compute(particles: Particle[], timestamp: number): number {
    const bounds = { width: 800, height: 600 }; // Default bounds, should be passed from context
    
    let filteredParticles = particles;
    
    // Apply filter if specified
    if (this.definition.filter) {
      filteredParticles = particles.filter(particle => {
        const context = ExpressionEvaluator.createContext(particle, bounds, timestamp);
        return ExpressionEvaluator.evaluateFilter(this.definition.filter!, context);
      });
    }

    // Handle count reduction early (no select needed)
    if (this.definition.reduce === 'count') {
      return filteredParticles.length;
    }

    // Apply select to get values
    let values: number[];
    if (this.definition.select) {
      values = filteredParticles.map(particle => {
        const context = ExpressionEvaluator.createContext(particle, bounds, timestamp);
        return ExpressionEvaluator.evaluateSelect(this.definition.select!, context);
      });
    } else {
      // Default to particle count if no select specified
      values = filteredParticles.map(() => 1);
    }

    // Apply reduce function
    return ExpressionEvaluator.applyReduce(values, this.definition.reduce);
  }

  static fromText(text: string): TextObservable[] {
    const parsed = TextObservableParser.parse(text);
    return parsed.map(definition => new TextObservable(definition));
  }

  static validate(text: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const parsed = TextObservableParser.parse(text);
      
      for (const def of parsed) {
        if (!def.name) errors.push('Observable missing name');
        if (!def.reduce) errors.push(`Observable "${def.name}" missing reduce function`);
        
        if (def.filter) {
          const filterValidation = TextObservableParser.validateExpression(def.filter);
          if (!filterValidation.valid) {
            errors.push(`Invalid filter in "${def.name}": ${filterValidation.error}`);
          }
        }
        
        if (def.select) {
          const selectValidation = TextObservableParser.validateExpression(def.select);
          if (!selectValidation.valid) {
            errors.push(`Invalid select in "${def.name}": ${selectValidation.error}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Parse error: ${(error as Error).message}`);
    }
    
    return { valid: errors.length === 0, errors };
  }
}
