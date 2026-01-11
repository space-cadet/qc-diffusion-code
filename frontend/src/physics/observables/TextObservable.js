import { TextObservableParser } from './TextObservableParser';
import { ExpressionEvaluator } from './ExpressionEvaluator';
// Add debug logger (gated)
const DEBUG_ENABLED = false;
const debug = (...args) => { if (DEBUG_ENABLED)
    console.debug('[TextObservable]', ...args); };
export class TextObservable {
    constructor(definition, bounds) {
        this.definition = definition;
        this.id = `text_${this.definition.name}`;
        this.bounds = bounds;
    }
    calculate(particles, timestamp) {
        debug(`Calculating for ${particles.length} particles`);
        const result = this.compute(particles, timestamp);
        debug(`Calculation result: ${result}`);
        return {
            value: result,
            timestamp: timestamp,
            metadata: {
                particleCount: particles.length,
                observableName: this.definition.name
            }
        };
    }
    reset() { }
    getName() {
        return this.definition.name;
    }
    getDescription() {
        const parts = [];
        if (this.definition.filter)
            parts.push(`filter: ${this.definition.filter}`);
        if (this.definition.select)
            parts.push(`select: ${this.definition.select}`);
        parts.push(`reduce: ${this.definition.reduce}`);
        if (this.definition.transform)
            parts.push(`transform: ${this.definition.transform}`);
        return parts.join(', ');
    }
    getInterval() {
        return this.definition.interval || 1000; // Default 1 second
    }
    compute(particles, timestamp) {
        // Validate bounds
        if (!this.bounds || !this.bounds.width || !this.bounds.height) {
            debug('Invalid bounds:', this.bounds);
            return NaN;
        }
        let filteredParticles = particles;
        // Apply filter if specified
        if (this.definition.filter) {
            debug(`Applying filter: ${this.definition.filter}`);
            filteredParticles = particles.filter(particle => {
                const context = ExpressionEvaluator.createContext(particle, this.bounds, timestamp);
                return ExpressionEvaluator.evaluateFilter(this.definition.filter, context);
            });
            debug(`Filtered particles: ${filteredParticles.length}/${particles.length}`);
        }
        // Handle count reduction early (no select needed)
        if (this.definition.reduce === 'count') {
            return filteredParticles.length;
        }
        // Apply select to get values
        let values;
        if (this.definition.select) {
            debug(`Applying select: ${this.definition.select}`);
            values = filteredParticles.map(particle => {
                const context = ExpressionEvaluator.createContext(particle, this.bounds, timestamp);
                return ExpressionEvaluator.evaluateSelect(this.definition.select, context);
            });
        }
        else {
            // Default to particle count if no select specified
            values = filteredParticles.map(() => 1);
        }
        // Apply reduce function
        debug(`Applying reduce: ${this.definition.reduce}`);
        let result = ExpressionEvaluator.applyReduce(values, this.definition.reduce);
        if (isNaN(result)) {
            debug('Invalid calculation - values:', values, 'reduce:', this.definition.reduce);
        }
        // Apply optional post-aggregation transform
        if (this.definition.transform) {
            const t = this.definition.transform;
            const transforms = {
                sqrt: Math.sqrt,
                abs: Math.abs,
                log: Math.log,
                exp: Math.exp,
            };
            const fn = transforms[t];
            if (fn) {
                const before = result;
                result = fn(result);
                debug(`Applied transform ${t}: ${before} -> ${result}`);
            }
            else {
                debug(`Unknown transform '${t}', skipping.`);
            }
        }
        return result;
    }
    static fromText(text, bounds) {
        const parsed = TextObservableParser.parse(text);
        return parsed.map(definition => new TextObservable(definition, bounds));
    }
    static validate(text) {
        const errors = [];
        try {
            const parsed = TextObservableParser.parse(text);
            for (const def of parsed) {
                if (!def.name)
                    errors.push('Observable missing name');
                if (!def.reduce)
                    errors.push(`Observable "${def.name}" missing reduce function`);
                if (def.transform) {
                    const allowed = new Set(['sqrt', 'abs', 'log', 'exp']);
                    if (!allowed.has(def.transform)) {
                        errors.push(`Invalid transform in "${def.name}": ${def.transform}`);
                    }
                }
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
        }
        catch (error) {
            errors.push(`Parse error: ${error.message}`);
        }
        return { valid: errors.length === 0, errors };
    }
}
