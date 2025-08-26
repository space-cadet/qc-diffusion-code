# Boundary Condition Architecture 3-Way Comparison

## Architectural Approaches

| Feature | Claude4 (Strategy Pattern) | GPT5 (Shader-Only) | DeepSeek (Hybrid) |
|---------|----------------------------|--------------------|-------------------|
| **Core Philosophy** | Formal strategy pattern with JS/GLSL separation | Pure shader implementation | Balanced approach with optional strategies |
| **BC Location** | Split (TypeScript strategies + shader injection) | Entirely in shaders | Primarily shaders with strategy fallback |
| **Texture Wrapping** | Configurable per strategy | Ignored (CLAMP_TO_EDGE only) | Default CLAMP_TO_EDGE with override capability |
| **Runtime Flexibility** | High (dynamic strategy swapping) | Medium (requires shader recompile) | High (strategies optional) |
| **Debugging** | Complex (track strategy state) | Simple (single source) | Moderate (shader-focused) |
| **Implementation Cost** | High (multiple layers) | Low (focused scope) | Medium (adaptive) |
| **Per-Equation BCs** | Yes (full granularity) | Yes (phased) | Yes (with fallbacks) |
| **Shader Complexity** | Medium (injected code) | Low (standard helpers) | Medium (adaptive) |

## Key Decision Factors

1. **For Maximum Correctness**: GPT5 shader-only
2. **For Runtime Flexibility**: Claude4 strategy pattern
3. **For Balanced Approach**: DeepSeek hybrid

## Recommended Path

```
Phase 1: Implement GPT5 shader-only core
Phase 2: Add DeepSeek's strategy adapter layer
Phase 3: (Optional) Claude4 full strategy for special cases
```

## ASCII Architecture Comparison

```
Claude4: [UI] → [Strategy Factory] → [BC Strategies] → [Shader Injection]
GPT5:    [UI] → [BC Config] → [Shader Helpers] → [Execution]
DeepSeek:[UI] → [Adapter] → {Shader Helpers or Strategies}
```

## Migration Recommendations
1. Start with GPT5 shader-core for stability
2. Add DeepSeek's adapter layer for flexibility
3. Only implement Claude4 pattern where dynamic BC switching is critical
