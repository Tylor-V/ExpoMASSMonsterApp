# MASS Monster Engineering Rules

- Expo Go compatibility is required (no native modules / config changes that break Expo Go).
- Support iOS + Android phones: responsive layouts across common phone sizes; avoid hardcoded heights unless clamped and tested.
- Prefer minimal diffs: fix the smallest surface area that solves the task; avoid broad refactors unless explicitly requested.
- Preserve existing features and navigation behavior unless the prompt explicitly says to remove/replace them.
- Data safety: do not break Firebase Auth/Firestore persistence or Shopify Storefront reads; maintain existing schemas and guards.
- Reuse shared components when possible; if you change a shared component, update all call sites.
- Deletions: do not delete “unused” code unless you (1) search references, (2) confirm it is not exported/registered/used indirectly, and (3) the prompt requests cleanup.
- Testing: add/adjust tests only when the change is logic-heavy or regression-prone; do not introduce new frameworks unless necessary.
