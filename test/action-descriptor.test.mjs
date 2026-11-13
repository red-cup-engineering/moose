import assert from 'node:assert/strict';
import test from 'node:test';
import { canonical } from '@red-cup-engineering/json-engineering-services-section';
import { sha256Hex } from '@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity';
import { makeNiUriService } from '@red-cup-engineering/uri-engineering-services-section/ni-uri';
import { actionPredicate, defineAction } from '../src/actions.mjs';

test('portable action naming preserves the original SHA-256 descriptor identity', () => {
  const operation = makeNiUriService({ text: 'an original operation descriptor' }).uri;
  for (const actor of ['https://world.example/actors/alice', 'https://world.example/actors/écho-🦌']) {
    const action = defineAction({ verb: 'ask', description: 'Ask the original actor',
      remote: { actor, operation, verb: 'work' } });
    assert.equal(actionPredicate(action), `offers-action:ask:remote:${sha256Hex(canonical(action.remote))}`);
  }
  assert.equal(actionPredicate(defineAction({ verb: 'inspect', description: 'Inspect', capability: 'native.inspect' })),
    'offers-action:inspect:native.inspect');
});
