feat(observables): Add semantic validation and fix NaN bug

- Implements semantic validation in TextObservableParser to detect unknown variables in user-defined expressions, providing immediate feedback.
- Fixes a critical bug where text observables returned NaN by ensuring the ObservableManager is initialized with correct canvas bounds.
- Enhances the CustomObservablesPanel UI with detailed help text, including valid properties and examples.
- Corrects the list of available properties in the parser to match the actual evaluation context (e.g., `velocity.vx`).
- Integrates user-led refactoring that unifies polling for all observables and standardizes the data structure returned by `TextObservable.calculate`.