#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const binTarget = packageJson.bin?.['threadhelp-demo'];

if (!binTarget) {
  throw new Error('package.json must expose the threadhelp-demo binary');
}

if (!existsSync(new URL(binTarget, root))) {
  throw new Error(`built demo binary is missing: ${binTarget}`);
}

const exportTargets = Object.values(packageJson.exports ?? {}).flatMap((entry) =>
  typeof entry === 'string' ? [entry] : Object.values(entry)
).map((target) => target.replace(/^\.\//, ''));
const binTargets = Object.values(packageJson.bin ?? {}).map((target) => target.replace(/^\.\//, ''));
const requiredFiles = [
  ...exportTargets,
  ...binTargets,
  'README.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'LICENSE',
  'CHANGELOG.md',
  'RELEASE_NOTES.md'
];

const scratch = await mkdtemp(join(tmpdir(), 'threadhelp-package-smoke-'));

try {
  const packOutput = execFileSync('npm', ['pack', '--json', '--pack-destination', scratch], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit']
  });
  const [pack] = JSON.parse(packOutput);
  const files = new Set(pack.files.map((file) => file.path));
  const missing = [...new Set(requiredFiles)].filter((file) => !files.has(file));

  if (missing.length > 0) {
    throw new Error(`npm package is missing required files: ${missing.join(', ')}`);
  }

  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(scratch, pack.filename)], {
    cwd: scratch,
    stdio: 'inherit'
  });

  for (const exportName of Object.keys(packageJson.exports ?? {})) {
    const specifier = exportName === '.' ? packageJson.name : `${packageJson.name}/${exportName.replace(/^\.\//, '')}`;
    execFileSync(process.execPath, ['--input-type=module', '--eval', `await import(${JSON.stringify(specifier)})`], {
      cwd: scratch,
      stdio: 'inherit'
    });
  }

  for (const binName of Object.keys(packageJson.bin ?? {})) {
    if (!existsSync(join(scratch, 'node_modules', '.bin', binName))) {
      throw new Error(`installed package is missing binary link: ${binName}`);
    }
  }

  console.log(`package smoke passed: ${new Set(requiredFiles).size} required files, ${Object.keys(packageJson.exports ?? {}).length} exports, and ${Object.keys(packageJson.bin ?? {}).length} binaries verified`);
} finally {
  await rm(scratch, { recursive: true, force: true });
}
