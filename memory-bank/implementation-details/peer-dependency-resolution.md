# Peer Dependency Resolution Strategy

*Created: 2026-01-19 18:56:07 IST*
*Last Updated: 2026-01-19 18:57:41 IST*

## Overview

This document outlines strategies and patterns for resolving peer dependency conflicts in pnpm monorepo workspaces, based on experience with the qc-diffusion-code project.

## Common Peer Dependency Issues

### 1. Vitest Version Mismatch
**Problem**: Different packages using different vitest versions (3.2.4 vs 0.34.6)
**Solution**: 
- Standardize on single version across workspace
- Add explicit `@vitest/ui` dependency to match vitest version
- Update all package.json files consistently

**Example Resolution**:
```json
{
  "devDependencies": {
    "vitest": "^0.34.6",
    "@vitest/ui": "^0.34.6"
  }
}
```

### 2. ESLint/TypeScript Version Compatibility
**Problem**: @typescript-eslint packages expecting older eslint versions
**Solution**:
- Update eslint to latest version (9.x)
- Update @typescript-eslint packages to compatible versions (8.x)
- Ensure compatibility matrix is maintained

**Example Resolution**:
```json
{
  "devDependencies": {
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0"
  }
}
```

### 3. TypeDoc TypeScript Constraints
**Problem**: typedoc expecting specific TypeScript version ranges
**Solution**:
- Update typedoc to latest version supporting newer TypeScript
- Add TypeScript to root devDependencies for workspace consistency
- Consider pnpm overrides if transitive dependencies conflict

**Example Resolution**:
```json
{
  "devDependencies": {
    "typedoc": "^0.27.9",
    "typescript": "^5.8.2"
  }
}
```

## Resolution Strategies

### Strategy 1: Workspace Standardization
1. **Identify Conflicts**: Run `pnpm install` and note all peer dependency warnings
2. **Choose Target Versions**: Select compatible versions across all packages
3. **Update Consistently**: Apply same versions to all affected packages
4. **Regenerate Lockfile**: Delete pnpm-lock.yaml and reinstall

### Strategy 2: Root Dependency Management
1. **Add Root Dependencies**: Add conflicting packages to root package.json
2. **Use pnpm Overrides**: Force specific versions across workspace
3. **Workspace Protocol**: Ensure packages use `workspace:*` for internal dependencies

**Example Root package.json**:
```json
{
  "devDependencies": {
    "typescript": "^5.8.2"
  },
  "pnpm": {
    "overrides": {
      "typescript": "5.8.2"
    }
  }
}
```

### Strategy 3: Gradual Migration
1. **Package-by-Package**: Update one package at a time
2. **Test Each Update**: Verify builds still work after each change
3. **Incremental Lockfile**: Allow pnpm to resolve gradually

## Best Practices

### Prevention
1. **Regular Updates**: Keep dependencies updated to avoid large version gaps
2. **Workspace Audits**: Regularly run `pnpm audit` and `pnpm outdated`
3. **Documentation**: Document version constraints in project README

### Resolution Process
1. **Clean Install**: Always start with `rm -rf node_modules && pnpm install`
2. **Version Matrix**: Maintain compatibility matrix for major dependencies
3. **Test Verification**: Ensure all builds and tests pass after resolution

### Monitoring
1. **CI/CD Integration**: Add peer dependency checks to CI pipeline
2. **Automated Alerts**: Set up alerts for new peer dependency conflicts
3. **Regular Reviews**: Schedule monthly dependency reviews

## Specific Package Patterns

### Vitest Ecosystem
```json
{
  "vitest": "^0.34.6",
  "@vitest/ui": "^0.34.6",
  "@vitest/coverage-v8": "^0.34.6"
}
```

### TypeScript Ecosystem
```json
{
  "typescript": "^5.8.2",
  "@types/node": "^20.0.0",
  "typedoc": "^0.27.9"
}
```

### ESLint Ecosystem
```json
{
  "eslint": "^9.0.0",
  "@typescript-eslint/eslint-plugin": "^8.0.0",
  "@typescript-eslint/parser": "^8.0.0"
}
```

## Troubleshooting

### Common Issues
1. **Transitive Dependencies**: Use `pnpm why <package>` to trace dependency chains
2. **Cache Issues**: Clear pnpm cache with `pnpm store prune`
3. **Lockfile Conflicts**: Delete and regenerate pnpm-lock.yaml

### Debug Commands
```bash
# Check dependency tree
pnpm why vitest

# List outdated packages
pnpm outdated

# Check for security issues
pnpm audit

# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## Lessons Learned

1. **Workspace Consistency**: Consistent versions across packages prevent most conflicts
2. **Root Dependencies**: Adding key dependencies to root package.json helps resolution
3. **Incremental Updates**: Large version jumps should be done incrementally
4. **Documentation**: Document resolution patterns for future reference

## Future Considerations

1. **Automated Tools**: Consider tools like Renovate or Dependabot for automated updates
2. **Version Policies**: Establish version update policies and schedules
3. **Testing Integration**: Integrate dependency updates into testing workflow
4. **Monitoring Dashboard**: Create dashboard for dependency health monitoring
