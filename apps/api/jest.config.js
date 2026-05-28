/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Strip .js extensions so ts-jest resolves .ts files correctly
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        // Skip type-checking imported source files — tsc handles that separately
        diagnostics: false,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          target: 'ES2022',
          esModuleInterop: true,
        },
      },
    ],
  },
  setupFiles: ['./jest.setup.ts'],
  testMatch: ['**/test/**/*.test.ts'],
  // Each test file gets its own module registry so mocks don't leak between files
  resetModules: true,
};
