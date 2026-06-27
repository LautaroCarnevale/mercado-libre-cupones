import { build as viteBuild } from 'vite';
import { build as esBuild } from 'esbuild';
import {
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  cpSync,
} from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');
const browser = process.env.BROWSER || 'chrome';

// Limpiar dist/
function clean() {
  if (existsSync(dist)) rmSync(dist, { recursive: true });
  mkdirSync(dist, { recursive: true });
}

// Build popup y options con Vite (React)
async function buildUI() {
  await viteBuild({
    root,
    configFile: resolve(root, 'vite.config.ts'),
    logLevel: 'warn',
  });
}

// Build background y content con esbuild (IIFE)
async function buildScripts() {
  const apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  const timeout = process.env.VITE_API_TIMEOUT || '10000';

  const entries = [
    { input: 'src/background/index.ts', output: 'background.js' },
    { input: 'src/content/index.ts', output: 'content.js' },
  ];

  for (const entry of entries) {
    await esBuild({
      entryPoints: [resolve(root, entry.input)],
      bundle: true,
      outfile: resolve(dist, entry.output),
      format: 'iife',
      target: 'es2020',
      minify: process.env.NODE_ENV === 'production',
      define: {
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiUrl),
        'import.meta.env.VITE_API_TIMEOUT': JSON.stringify(timeout),
        'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV !== 'production'),
        'import.meta.env.PROD': JSON.stringify(process.env.NODE_ENV === 'production'),
      },
      tsconfig: resolve(root, 'tsconfig.json'),
    });
  }
}

// Merge manifest base + overrides por browser
function buildManifest() {
  const base = JSON.parse(
    readFileSync(resolve(root, 'manifest/base.json'), 'utf-8'),
  );
  const overrides = JSON.parse(
    readFileSync(resolve(root, `manifest/${browser}.json`), 'utf-8'),
  );

  const merged = deepMerge(base, overrides);
  writeFileSync(
    resolve(dist, 'manifest.json'),
    JSON.stringify(merged, null, 2),
  );
}

function deepMerge(target, source) {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      output[key] = deepMerge(output[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

// Copiar iconos y assets estáticos
function copyAssets() {
  const iconsDir = resolve(dist, 'icons');
  mkdirSync(iconsDir, { recursive: true });

  const srcIcons = resolve(root, 'public/icons');
  if (existsSync(srcIcons)) {
    cpSync(srcIcons, iconsDir, { recursive: true });
  } else {
    // Crear iconos placeholder
    console.warn('No se encontraron iconos en public/icons, usando placeholders');
  }
}

// Orquestador principal
async function main() {
  console.log(`\nBuild ML Cupones [${browser}]\n`);

  console.log('1. Limpiando dist/...');
  clean();

  console.log('2. Compilando background y content scripts...');
  await buildScripts();

  console.log('3. Compilando popup y options (Vite)...');
  await buildUI();

  console.log('4. Generando manifest.json...');
  buildManifest();

  console.log('5. Copiando assets...');
  copyAssets();

  console.log('\nBuild completo -> dist/\n');
}

main().catch((err) => {
  console.error('Error en build:', err);
  process.exit(1);
});
