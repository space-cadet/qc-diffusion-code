import { Parser } from 'expr-eval';
// Add debug logger (gated)
const DEBUG_ENABLED = false;
const debug = (...args) => { if (DEBUG_ENABLED)
    console.debug('[TextObservableParser]', ...args); };
export class TextObservableParser {
    static extractIdentifiers(expression) {
        // Match dot-separated identifiers, ignore numbers and quoted strings
        const tokens = expression.match(/[A-Za-z_][A-Za-z0-9_\.\$]*/g) || [];
        // Filter out function names and boolean/null literals
        const filtered = tokens.filter(t => !this.allowedFunctions.has(t) && !['true', 'false', 'null', 'NaN', 'Infinity'].includes(t));
        return Array.from(new Set(filtered));
    }
    static isAllowedIdentifier(id) {
        if (this.allowedProperties.has(id))
            return true;
        // Allow roots 'position', 'velocity', 'bounds' to be used only with known subkeys
        if (id === 'position' || id === 'velocity' || id === 'bounds' || id === 'initial')
            return true; // parser may reference object; runtime selects subfields
        return false;
    }
    static parse(text) {
        debug('Parsing text:', text);
        // Normalize input - remove extra whitespace
        const normalized = text.trim().replace(/\s+/g, ' ');
        // Check for observable blocks
        if (normalized.includes('observable "')) {
            return this.parseBlock(text);
        }
        // Fallback to empty array if no valid syntax detected
        return [];
    }
    static parseInline(text) {
        debug('Parsing inline syntax:', text);
        const observables = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
        for (const line of lines) {
            const current = {};
            const pairs = line.split(',').map(pair => pair.trim());
            for (const pair of pairs) {
                const [key, ...valueParts] = pair.split(':');
                const value = valueParts.join(':').trim();
                switch (key.trim()) {
                    case 'name':
                        current.name = value;
                        break;
                    case 'source':
                        current.source = value;
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
                });
            }
        }
        debug('Total parsed inline observables:', observables.length);
        return observables;
    }
    static splitTopLevelByComma(input) {
        const parts = [];
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
            if (!inDouble && ch === '\'' && prev !== '\\')
                inSingle = !inSingle;
            else if (!inSingle && ch === '"' && prev !== '\\')
                inDouble = !inDouble;
            else if (!inSingle && !inDouble) {
                if (ch === '(')
                    depthParen++;
                else if (ch === ')')
                    depthParen = Math.max(0, depthParen - 1);
                else if (ch === '{')
                    depthBrace++;
                else if (ch === '}')
                    depthBrace = Math.max(0, depthBrace - 1);
                else if (ch === '[')
                    depthBracket++;
                else if (ch === ']')
                    depthBracket = Math.max(0, depthBracket - 1);
            }
            if (ch === ',' && !inSingle && !inDouble && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
                if (current.trim().length > 0)
                    parts.push(current.trim());
                current = '';
            }
            else {
                current += ch;
            }
        }
        if (current.trim().length > 0)
            parts.push(current.trim());
        return parts;
    }
    static parseBlock(text) {
        debug('Parsing block syntax:', text);
        const observables = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        let current = {};
        let inBlock = false;
        for (const line of lines) {
            if (line.startsWith('observable "')) {
                const nameMatch = line.match(/observable \"([^\"]+)\"/);
                if (nameMatch) {
                    current = { name: nameMatch[1] };
                    inBlock = true;
                }
            }
            else if (inBlock) {
                if (line.includes('source:')) {
                    current.source = line.split(':')[1].trim();
                }
                else if (line.includes('filter:')) {
                    current.filter = line.split(':')[1].trim();
                }
                else if (line.includes('reduce:')) {
                    current.reduce = line.split(':')[1].trim();
                }
                else if (line.includes('interval:')) {
                    current.interval = parseInt(line.split(':')[1].trim());
                }
                else if (line === '}') {
                    if (current.name && current.reduce) {
                        observables.push({
                            source: current.source || 'particles',
                            ...current
                        });
                    }
                    inBlock = false;
                }
            }
        }
        return observables;
    }
    static validateExpression(expression) {
        try {
            this.parser.parse(expression);
            // Semantic validation: ensure identifiers map to known context properties
            const ids = this.extractIdentifiers(expression);
            const unknown = ids.filter(id => !this.isAllowedIdentifier(id) && !this.allowedProperties.has(id));
            if (unknown.length > 0) {
                return { valid: false, error: `Unknown identifiers: ${unknown.slice(0, 5).join(', ')}` };
            }
            return { valid: true };
        }
        catch (error) {
            return { valid: false, error: error.message };
        }
    }
    static getAvailableProperties() {
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
    static getReduceFunctions() {
        return ['sum', 'mean', 'count', 'min', 'max', 'std'];
    }
}
TextObservableParser.parser = new Parser();
// Whitelist of allowed roots and full property paths exposed by ExpressionEvaluator.createContext
TextObservableParser.allowedProperties = new Set([
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
TextObservableParser.allowedFunctions = new Set([
    'abs', 'acos', 'acosh', 'asin', 'asinh', 'atan', 'atan2', 'atanh', 'ceil', 'cos', 'cosh', 'exp', 'floor', 'log', 'log10',
    'max', 'min', 'pow', 'round', 'sign', 'sin', 'sinh', 'sqrt', 'tan', 'tanh', 'random', 'ln', 'mod',
    'and', 'or', 'not'
]);
