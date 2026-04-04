# Sources

- Google JavaScript Style Guide
  https://google.github.io/styleguide/jsguide.html
  Emphasize readability, maintainability, and naming code so intent is obvious.

- ESLint `no-nested-ternary`
  https://eslint.org/docs/latest/rules/no-nested-ternary
  Treat nested ternaries as a readability smell that should be rewritten.

- TypeScript Handbook: Utility Types
  https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type
  `Record` is a good fit for id-to-metadata mappings that should stay exhaustive.

- TypeScript Handbook: Everyday Types
  https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
  `as const` and narrow literal types help keep lookup tables precise and safe.

- React Docs: Conditional Rendering
  https://react.dev/learn/conditional-rendering
  Prefer readable conditional structures over clever inline branching.

- Airbnb JavaScript Style Guide
  https://github.com/airbnb/javascript
  Reinforces clarity-first conditionals and keeping control flow easy to scan.
