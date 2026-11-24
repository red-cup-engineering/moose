import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

test('two players recover exactly one pending game command from the playable World', async () => {
  const example = fileURLToPath(new URL('./native-world.mjs', import.meta.url));
  const {stdout} = await promisify(execFile)(process.execPath, [example, '--json']);
  const result = JSON.parse(stdout);
  assert.equal(result.worlds.length, 2);
  assert.equal(result.conflictingTakesAdmitted, 0);
  assert.equal(result.finalHolder, 'bob');
  assert.equal(result.recoveredCommands, 1);
  assert.equal(result.repeatedCommands, 0);
});
