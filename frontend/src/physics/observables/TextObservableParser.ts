import { Parser } from 'expr-eval';

// Add debug logger
const debug = (...args: any[]) => console.debug('[TextObservableParser]', ...args);

export interface ParsedObservable {
  name: string;
  source: 'particles' | 'simulation';
  filter?: string;
  select?: string;
  reduce: string;
  interval?: number;
}

export class TextObservableParser {
  private static parser = new Parser();
  // Whitelist of allowed roots and full property paths exposed by ExpressionEvaluator.createContext
  private static allowedProperties: Set<string> = new Set([
    // Scalars
    'speed', 'radius', 'id', 'lastCollisionTime', 'nextCollisionTime', 'collisionCount',
    'interparticleCollisionCount', 'waitingTime', 'time',
    // Nested objects
    'position.x', 'position.y',
    'velocity.vx', 'velocity.vy',
    'bounds.width', 'bounds.height'
  ]);

  // Common math/function identifiers provided by expr-eval that shouldn't be treated as variables
  private static allowedFunctions: Set<string> = new Set([
    'abs','acos','acosh','asin','asinh','atan','atan2','atanh','ceil','cos','cosh','exp','floor','log','log10',
    'max','min','pow','round','sign','sin','sinh','sqrt','tan','tanh','random','ln','mod'
  ]);

  private static extractIdentifiers(expression: string): string[] {
    // Match dot-separated identifiers, ignore numbers and quoted strings
    const tokens = expression.match(/[A-Za-z_][A-Za-z0-9_\.\$]*/g) || [];
    // Filter out function names and boolean/null literals
    const filtered = tokens.filter(t => !this.allowedFunctions.has(t) && !['true','false','null','NaN','Infinity'].includes(t));
    return Array.from(new Set(filtered));
  }

  private static isAllowedIdentifier(id: string): boolean {
    if (this.allowedProperties.has(id)) return true;
    // Allow roots 'position', 'velocity', 'bounds' to be used only with known subkeys
    if (id === 'position' || id === 'velocity' || id === 'bounds') return true; // parser may reference object; runtime selects subfields
    return false;
  }

  static parse(text: string): ParsedObservable[] {
    debug('Parsing text:', text);
    
    const observables: ParsedObservable[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    
    let current: Partial<ParsedObservable> = {};
    let inBlock = false;
    
    for (const line of lines) {
      if (line.match(/^observable\s+"([^"]+)"\s*\{/)) {
        const match = line.match(/^observable\s+"([^"]+)"\s*\{/);
        current = { name: match![1] };
        inBlock = true;
        debug('Parsing observable:', current.name);
      } else if (line === '}') {
        if (current.name && current.reduce) {
          debug('Parsed observable:', current);
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
            debug(`Parsed source: ${current.source}`);
            break;
          case 'filter':
            current.filter = value;
            debug(`Parsed filter: ${current.filter}`);
            break;
          case 'select':
            current.select = value;
            debug(`Parsed select: ${current.select}`);
            break;
          case 'reduce':
            current.reduce = value;
            debug(`Parsed reduce: ${current.reduce}`);
            break;
          case 'interval':
            const intervalValue = parseInt(value);
            if (!isNaN(intervalValue) && intervalValue > 0) {
              current.interval = intervalValue;
              debug(`Parsed interval: ${current.interval}`);
            }
            break;
        }
      }
    }
    
    debug('Total parsed observables:', observables.length);
    return observables;
  }

  static validateExpression(expression: string): { valid: boolean; error?: string } {
    try {
      this.parser.parse(expression);
      // Semantic validation: ensure identifiers map to known context properties
      const ids = this.extractIdentifiers(expression);
      const unknown = ids.filter(id => !this.isAllowedIdentifier(id) && !this.allowedProperties.has(id));
      if (unknown.length > 0) {
        return { valid: false, error: `Unknown identifiers: ${unknown.slice(0, 5).join(', ')}` };
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, error: (error as Error).message };
    }
  }

  static getAvailableProperties(): string[] {
    return [
      'position.x', 'position.y',
      'velocity.vx', 'velocity.vy',
      'speed', 'radius', 'id',
      'lastCollisionTime', 'nextCollisionTime', 'collisionCount',
      'interparticleCollisionCount', 'waitingTime',
      'bounds.width', 'bounds.height',
      'time'
    ];
  }

  static getReduceFunctions(): string[] {
    return ['sum', 'mean', 'count', 'min', 'max', 'std'];
  }
}
