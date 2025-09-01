import { Parser } from 'expr-eval';

export interface ParsedObservable {
  name: string;
  source: 'particles' | 'simulation';
  filter?: string;
  select?: string;
  reduce: string;
}

export class TextObservableParser {
  private static parser = new Parser();

  static parse(text: string): ParsedObservable[] {
    const observables: ParsedObservable[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    
    let current: Partial<ParsedObservable> = {};
    let inBlock = false;
    
    for (const line of lines) {
      if (line.match(/^observable\s+"([^"]+)"\s*\{/)) {
        const match = line.match(/^observable\s+"([^"]+)"\s*\{/);
        current = { name: match![1] };
        inBlock = true;
      } else if (line === '}') {
        if (current.name && current.reduce) {
          observables.push({
            source: current.source || 'particles',
            ...current
          } as ParsedObservable);
        }
        current = {};
        inBlock = false;
      } else if (inBlock) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        switch (key.trim()) {
          case 'source':
            current.source = value as 'particles' | 'simulation';
            break;
          case 'filter':
            current.filter = value;
            break;
          case 'select':
            current.select = value;
            break;
          case 'reduce':
            current.reduce = value;
            break;
        }
      }
    }
    
    return observables;
  }

  static validateExpression(expression: string): { valid: boolean; error?: string } {
    try {
      this.parser.parse(expression);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  static getAvailableProperties(): string[] {
    return [
      'position.x', 'position.y', 'speed', 'velocity.x', 'velocity.y',
      'mass', 'id', 'age', 'bounds.width', 'bounds.height', 'time'
    ];
  }

  static getReduceFunctions(): string[] {
    return ['sum', 'mean', 'count', 'min', 'max', 'std'];
  }
}
