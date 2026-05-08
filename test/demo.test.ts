import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

test("demo CLI submits fixture through dry-run adapters", async () => {
  const { stdout } = await execFileAsync("npx", ["tsx", "src/cli/demo.ts"], { timeout: 10000 });
  const output = JSON.parse(stdout);
  assert.equal(output.ok, true);
  assert.equal(output.redacted, true);
  assert.deepEqual(output.results.map((r: { adapter: string }) => r.adapter), ["slack", "email"]);
});
