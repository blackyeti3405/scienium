/**
 * The ONE source of truth for the Pyodide version across this feature.
 *
 * It is a `.mjs` on purpose: the Node build scripts (`scripts/fetch-pyodide.mjs`,
 * `scripts/pyodide-smoke.mjs`, `scripts/upload-pyodide-to-r2.mjs`) import it as
 * plain ESM, and the same file is imported by the TypeScript proxy route
 * (`app/api/data-terminal/runtime/[...path]/route.ts`) so the R2 keyspace and the
 * fetched tarball can never drift apart.
 *
 * MUST equal the exact pin in package.json `dependencies.pyodide` — the npm
 * loader glue and the release tarball's wheels are version-locked to each other.
 */
export const PYODIDE_VERSION = '314.0.3'
