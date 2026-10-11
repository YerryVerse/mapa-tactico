import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/portal/**/*.test.ts'],environment:'node'}});
