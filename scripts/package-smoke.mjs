#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const binTarget = packageJson.bin?.['threadhelp-demo'];

if (!binTarget) {
  throw new Error('package.json must expose the threadhelp-demo binary');
}

if (!existsSync(new URL(binTarget, root))) {
  throw new Error(`built demo binary is missing: ${binTarget}`);
}

const requiredFiles = [
  'dist/index.js',
  'dist/cli/demo.js',
  'dist/adapters/slack.js',
  'dist/adapters/email.js',
  'dist/widget.js',
  'dist/server.js',
  'README.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'LICENSE',
  'CHANGELOG.md',
  'RELEASE_NOTES.md'
];

const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit']
});

const [pack] = JSON.parse(packOutput);
const files = new Set(pack.files.map((file) => file.path));
const missing = requiredFiles.filter((file) => !files.has(file));

if (missing.length > 0) {
  throw new Error(`npm package is missing required files: ${missing.join(', ')}`);
}

console.log(`package smoke passed: ${requiredFiles.length} required files present`);
