import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/react.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  clean: true,
  minify: true,
  globalName: 'MarlinCheckout',
  outExtensionMap: {
    '.js': '.js',
  },
  esbuildOptions(options, context) {
    if (context.format === 'esm') {
      options.outExtension = { '.js': '.esm.js' };
    }
  },
});
