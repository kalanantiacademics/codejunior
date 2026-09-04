import { build } from 'esbuild';

const shared = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  nodePaths: [process.cwd() + '/node_modules'],
  sourcemap: true,
  logLevel: 'info',
  banner: {
    js: 'var global = window;'
  },
  loader: {
    '.js': 'js'
  }
};

await build({
  ...shared,
  entryPoints: ['webClient.js'],
  outfile: 'dist/webClient.js',
  define: {
    global: 'window'
  }
});

await build({
  ...shared,
  entryPoints: ['appEntry.js'],
  outfile: 'dist/app.bundle.js',
  external: []
});
