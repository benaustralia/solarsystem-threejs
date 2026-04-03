import { copyFileSync, mkdirSync } from 'fs';

mkdirSync('./dist', { recursive: true });

const result = await Bun.build({
  entrypoints: ['./src/main.ts'],
  outdir: './dist',
  loader: { '.glsl': 'text' },
  minify: false,
  target: 'browser',
});

if (!result.success) {
  console.error('Build failed:');
  result.logs.forEach(l => console.error(l));
  process.exit(1);
}

copyFileSync('./src/index.html', './dist/index.html');
console.log(`Built ${result.outputs.length} file(s) to dist/`);
