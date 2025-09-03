import { Parser } from 'expr-eval';

// Add debug logger (gated)
const DEBUG_ENABLED = false;
const debug = (...args: any[]) => { if (DEBUG_ENABLED) console.debug('[TextObservableParser]', ...args); };

export interface ParsedObservable {
  name: string;
  source: 'particles' | 'simulation';
  filter?: string;
  select?: string;
  reduce: string;
  interval?: number;
  transform?: string; // post-aggregation unary transform
}

export class TextObservableParser {
  private static parser = new Parser();
  // Whitelist of allowed roots and full property paths exposed by ExpressionEvaluator.createContext
  private static allowedProperties: Set<string> = new Set([
    // Scalars
    'speed', 'radius', 'id', 'lastCollisionTime', 'nextCollisionTime', 'collisionCount',
    'interparticleCollisionCount', 'waitingTime', 'time',
    // Nested objects
    'position.x', 'position.y', 'position.magnitude',
    'velocity.vx', 'velocity.vy', 'velocity.magnitude',
    'bounds.width', 'bounds.height',
    // Initial state (positions, velocities, timestamp)
    'initial.position.x', 'initial.position.y', 'initial.position.magnitude',
    'initial.velocity.vx', 'initial.velocity.vy', 'initial.velocity.magnitude',
    'initial.timestamp'
  ]);

  // Common math/function identifiers provided by expr-eval that shouldn't be treated as variables
  private static allowedFunctions: Set<string> = new Set([
    'abs','acos','acosh','asin','asinh','atan','atan2','atanh','ceil','cos','cosh','exp','floor','log','log10',
    'max','min','pow','round','sign','sin','sinh','sqrt','tan','tanh','random','ln','mod',
    'and','or','not'
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
    if (id === 'position' || id === 'velocity' || id === 'bounds' || id === 'initial') return true; // parser may reference object; runtime selects subfields
    return false;
  }

  static parse(text: string): ParsedObservable[] {
    debug('Parsing text:', text);
    
    // Detect syntax type: block syntax has '{' or inline syntax has ','
    const hasBlockSyntax = text.includes('{') && text.includes('}');
    const hasInlineSyntax = text.includes(',') && text.includes(':');
    
    // New rule: Only block-with-braces syntax is accepted.
    // Inline-without-braces is no longer supported.
    if (!hasBlockSyntax) {
      if (hasInlineSyntax) {
        throw new Error('Inline syntax without braces is not supported. Use: observable "name" { key: value, ... }');
      }
      // If no braces at all, nothing to parse
      return [];
    }
    return this.parseBlock(text);
  }

  private static parseInline(text: string): ParsedObservable[] {
    debug('Parsing inline syntax:', text);
    
    const observables: ParsedObservable[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    
    for (const line of lines) {
      const current: Partial<ParsedObservable> = {};
      const pairs = line.split(',').map(pair => pair.trim());
      
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split(':');
        const value = valueParts.join(':').trim();
        
        switch (key.trim()) {
          case 'name':
            current.name = value;
            break;
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
          case 'interval':
            const intervalValue = parseInt(value);
            if (!isNaN(intervalValue) && intervalValue > 0) {
              current.interval = intervalValue;
            }
            break;
        }
      }
      
      if (current.name && current.reduce) {
        debug('Parsed inline observable:', current);
        observables.push({
          source: current.source || 'particles',
          ...current
        } as ParsedObservable);
      }
    }
    
    debug('Total parsed inline observables:', observables.length);
    return observables;
  }

  private static splitTopLevelByComma(input: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depthParen = 0;
    let depthBrace = 0;
    let depthBracket = 0;
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      const prev = i > 0 ? input[i - 1] : '';
      // Toggle quotes (ignore escaped quotes)
      if (!inDouble && ch === '\'' && prev !== '\\') inSingle = !inSingle;
      else if (!inSingle && ch === '"' && prev !== '\\') inDouble = !inDouble;
      else if (!inSingle && !inDouble) {
        if (ch === '(') depthParen++;
        else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
        else if (ch === '{') depthBrace++;
        else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
        else if (ch === '[') depthBracket++;
        else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);
      }
      if (ch === ',' && !inSingle && !inDouble && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
        if (current.trim().length > 0) parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim().length > 0) parts.push(current.trim());
    return parts;
  }

  private static parseBlock(text: string): ParsedObservable[] {
    debug('Parsing block syntax:', text);
    
    const observables: ParsedObservable[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    
    let current: Partial<ParsedObservable> = {};
    let inBlock = false;
    let buffer: string[] = [];
    
    for (const line of lines) {
      if (line.match(/^observable\s+"([^"]+)"\s*\{/)) {
        const match = line.match(/^observable\s+"([^"]+)"\s*\{/);
        current = { name: match![1] };
        inBlock = true;
        debug('Parsing observable:', current.name);
      } else if (line === '}') {
        // Join all content captured within braces and parse comma-separated pairs
        const content = buffer.join(' ').replace(/\s+/g, ' ').trim();
        buffer = [];
        if (content.length > 0) {
          const pairs = this.splitTopLevelByComma(content);
          for (const pair of pairs) {
            const colonIdx = pair.indexOf(':');
            if (colonIdx === -1) continue; // skip invalid segments
            const key = pair.substring(0, colonIdx).trim();
            const value = pair.substring(colonIdx + 1).trim().replace(/,$/, '');
            switch (key) {
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
              case 'transform':
              case 'post': {
                const t = value.replace(/['"]/g, '').trim();
                current.transform = t;
                debug(`Parsed transform: ${current.transform}`);
                break;
              }
              case 'interval':
                const intervalValue = parseInt(value);
                if (!isNaN(intervalValue) && intervalValue > 0) {
                  current.interval = intervalValue;
                  debug(`Parsed interval: ${current.interval}`);
                }
                break;
              case 'name':
                current.name = value;
                debug(`Parsed name: ${current.name}`);
                break;
            }
          }
        }
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
        // Accumulate raw lines between braces; parsing happens when we hit '}'
        // Allow trailing commas and multiple pairs per line
        buffer.push(line);
      }
    }
    
    debug('Total parsed block observables:', observables.length);
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
      'time',
      'initial.position.x', 'initial.position.y', 'initial.position.magnitude',
      'initial.velocity.vx', 'initial.velocity.vy', 'initial.velocity.magnitude',
      'initial.timestamp'
    ];
  }

  static getReduceFunctions(): string[] {
    return ['sum', 'mean', 'count', 'min', 'max', 'std'];
  }
}
