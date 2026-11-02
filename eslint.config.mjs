import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = [
  {ignores:['**/.sites-runtime/**','**/.wrangler/**','**/dist/**','**/.next/**','**/public/map-worker/**']},
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    files:['**/*.test.{ts,tsx}'],
    rules:{'@typescript-eslint/no-explicit-any':'off'},
  },
];

export default eslintConfig;
