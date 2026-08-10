#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const readme = await readFile(new URL('README.md', root), 'utf8');
const errors = [];

function requireValue(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

requireValue(packageJson.repository?.url?.includes('github.com/rogerchappel/threadhelp'), 'repository.url must point to rogerchappel/threadhelp');
requireValue(packageJson.license === 'MIT', 'license must be MIT');
requireValue(packageJson.bin?.['threadhelp-demo'] === './dist/cli/demo.js', 'threadhelp-demo bin must point at ./dist/cli/demo.js');
requireValue(packageJson.exports?.['.']?.import === './dist/index.js', 'root export must point at ./dist/index.js');
requireValue(packageJson.exports?.['./adapters/slack']?.import, 'Slack adapter export must be present');
requireValue(packageJson.exports?.['./adapters/email']?.import, 'email adapter export must be present');
requireValue(packageJson.exports?.['./widget']?.import, 'widget export must be present');
requireValue(packageJson.exports?.['./server']?.import, 'server export must be present');
requireValue(packageJson.files?.includes('dist'), 'files must include dist');
requireValue(packageJson.files?.includes('CODE_OF_CONDUCT.md'), 'files must include CODE_OF_CONDUCT.md');
requireValue(packageJson.scripts?.['package:smoke']?.includes('scripts/package-smoke.mjs'), 'package:smoke must run the package smoke script');

const registryInstallPattern = /npm\s+(?:i|install|add)\s+(?:--[^\s]+\s+)*threadhelp(?:@[^\s]+)?(?:\s|$)/m;
requireValue(!registryInstallPattern.test(readme), 'README must not claim npm registry installation until the release workflow publishes to npm');
requireValue(readme.includes('npm pack'), 'README installation must build the release tarball with npm pack');
requireValue(readme.includes(`npm install ./threadhelp-${packageJson.version}.tgz`), 'README installation must use the package tarball produced by npm pack');

for (const file of ['README.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'LICENSE', 'CHANGELOG.md', 'RELEASE_NOTES.md']) {
  requireValue(existsSync(new URL(file, root)), `${file} must exist`);
}

let workflowFiles = [];
try {
  workflowFiles = await readdir(new URL('.github/workflows/', root));
} catch {
  workflowFiles = [];
}

requireValue(workflowFiles.some((file) => /^ci\.ya?ml$/.test(file)), 'CI workflow must be present');

let releaseWorkflow = '';
for (const file of workflowFiles.filter((file) => /^release\.ya?ml$/.test(file))) {
  releaseWorkflow += await readFile(new URL(`.github/workflows/${file}`, root), 'utf8');
}
requireValue(/\bnpm pack\b/.test(releaseWorkflow), 'release workflow must build the documented npm tarball');
requireValue(/gh release create[^\n]*\*\.tgz/.test(releaseWorkflow), 'release workflow must attach the documented npm tarball to the GitHub release');

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`release readiness: ${error}`);
  }
  process.exit(1);
}

console.log('release readiness passed');
