// Gateway mechanism receiving with explicit native-port doubles. These cases
// establish no signed peer, durable custody, Work Arena or deployed-host result.
// The downstream MetroPlat coordination suites retain those integration claims.
import test from 'node:test';
import assert from 'node:assert/strict';
import { semanticId } from '@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address';
import { canonicalJson } from '@red-cup-engineering/json-services-section';
import {
  WORLD_GATEWAY_ADMISSION, WORLD_GATEWAY_LIMITS, worldGatewayCatalogue,
  worldGatewayBinding, admitWorldGatewayCall, worldGatewayExecution,
  createWorldGateway,
} from '../src/world-gateway.mjs';

const AT = '2026-10-14T20:00:00.000Z';
const issuer = 'https://gateway.example/actors/world';
const recipient = 'https://executor.example/actors/world';
const context = (name = 'alice', session = `harness:${name}-session`) => ({
  principal: { subject: `account:${name}` }, session,
});
const hand = session => session.startsWith('harness:')
  ? `session:${session.slice(8)}`
  : session.startsWith('token:') ? `mcp-${session}` : `mcp-session:${session}`;
const operations = [
  { verb: 'work-open', ref: semanticId({ fixtureOperation: 'work-open' }) },
  { verb: 'work-board', ref: semanticId({ fixtureOperation: 'work-board' }) },
];
const declaration = () => ({
  world: 'fixture-world', state: semanticId({ fixtureState: 'original-world' }),
  issuer, recipient, catalogue: worldGatewayCatalogue(operations),
});
const call = (input = { move: 'ask', question: 'One original act' }) => ({
  verb: operations[0].verb, operation: operations[0].ref, input,
});
const admitted = (binding = declaration(), value = call(), caller = context()) =>
  admitWorldGatewayCall(binding, value, caller, {
    now: () => AT, nonce: () => 'fixture-admission-nonce',
  });
const claim = value => ({
  argv: [value.verb], operation: value.operation, stdin: canonicalJson(value.input),
});
const restate = (statement, patch) => {
  const { id: _id, ...body } = { ...statement, ...patch };
  return { ...body, id: semanticId(body) };
};
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

function executionFixture() {
  const state = {
    binding: declaration(), operations: [...operations], now: AT,
    bearer: 'fixture:alice', authorized: [],
  };
  const recognize = (subject, session) => subject === 'account:alice' && session === 'harness:alice-session'
    ? { subject, hand: hand(session), bearer: state.bearer } : undefined;
  const execution = worldGatewayExecution({
    world: state.binding.world, state: state.binding.state,
    binding: () => state.binding, operations: () => state.operations,
    recognize, now: () => state.now,
    authorize: (...args) => { state.authorized.push(args); return 'held'; },
  });
  const invoke = (statement, value = call(), requester = issuer, target = recipient) =>
    execution({ claim: claim(value), requester, recipient: target, subjectBinding: statement });
  return { state, execution, invoke };
}

function portFixture({ waitMs = 10, recognizeSession } = {}) {
  const binding = declaration();
  const counts = { prepare: 0, send: 0, admitted: 0, retained: 0, recover: 0, result: 0 };
  // These maps are deliberate test doubles, not an alternative custody owner.
  const retained = new Map(), results = new Map();
  const admit = request => { request.admit(); counts.admitted++; };
  const retain = request => {
    const submission = {
      id: `https://gateway.example/activities/${request.subjectBinding.nonce}`,
      request: semanticId({ fixtureNativeRequest: request.retention.requestNi }),
      recipient: request.address, requestNi: request.retention.requestNi,
    };
    retained.set(submission.requestNi, submission);
    counts.retained++;
    request.onRetained(submission);
    return submission;
  };
  const reply = (submission, statement, patch = {}) => {
    const result = {
      state: 'processed', code: 0, stdout: '{"observed":true}', stderr: '',
      subjectBinding: statement.id, executor: statement.subject,
      hand: hand(statement.session), requester: statement.issuer,
      service: {
        binding: statement.binding, world: statement.world, state: statement.state,
        session: statement.session, bearer: 'fixture:alice',
      },
      ...patch,
    };
    return {
      request: submission.request, recipient: submission.recipient,
      reply: semanticId({ fixtureReply: result }), result,
    };
  };
  let send = async request => {
    admit(request);
    const submission = retain(request);
    const received = reply(submission, request.subjectBinding);
    results.set(submission.requestNi, received);
    return { ...submission, result: received.result };
  };
  let read = async ({ submission }) => results.get(submission.requestNi);
  const port = {
    prepare(request) {
      counts.prepare++;
      return {
        requestNi: semanticId({ fixtureRequest: request.text, admission: request.subjectBinding.id }),
        recipient: request.address,
      };
    },
    async send(request) { counts.send++; return send(request); },
    async recover({ retention }) { counts.recover++; return retained.get(retention.requestNi); },
    async result(input) { counts.result++; return read(input); },
  };
  const gateway = (overrides = {}) => createWorldGateway({
    binding: () => binding, port, identifier: 'world', now: () => AT,
    nonce: () => 'fixture-admission-nonce', waitMs,
    ...(recognizeSession === undefined ? {} : { recognizeSession }), ...overrides,
  });
  return {
    binding, counts, retained, results, port, admit, retain, reply, gateway,
    setSend: value => { send = value; }, setRead: value => { read = value; },
  };
}

test('the extracted gateway preserves its wire vocabulary, catalogue identity and exact logical binding', () => {
  assert.equal(WORLD_GATEWAY_ADMISSION, 'metroplat.subject-binding');
  assert.deepEqual(WORLD_GATEWAY_LIMITS, {
    inputBytes: 8192, resultBytes: 24576, inflight: 8, lifetimeMs: 60000, waitMs: 10000,
  });
  assert.equal(worldGatewayCatalogue(operations), worldGatewayCatalogue([...operations].reverse()));
  assert.throws(() => worldGatewayCatalogue([]), /nonempty/);
  assert.throws(() => worldGatewayCatalogue([operations[0], operations[0]]), /unique/);
  const source = declaration(), selected = worldGatewayBinding(source);
  assert.equal(selected.kind, 'feltos.world.gateway-binding');
  assert.equal(selected.world, source.world);
  assert.equal(selected.state, source.state);
  assert.ok(Object.isFrozen(selected));
  assert.equal(worldGatewayBinding({ ...source }).id, selected.id);
  assert.notEqual(worldGatewayBinding({ ...source, world: 'another-world' }).id, selected.id);
  assert.throws(() => worldGatewayBinding({ ...source, root: '/caller-selected-root' }), /exactly/);
  assert.throws(() => worldGatewayBinding({ ...source, recipient: source.issuer }), /distinct/);
  for (const issuer of ['http://gateway.example/actors/world', 'https://user@gateway.example/actors/world', 'https://gateway.example/actors/world?session=other']) {
    assert.throws(() => worldGatewayBinding({ ...source, issuer }), /canonical HTTPS actor/);
  }
});

test('admission binds authenticated context and a captured call with the original finite lifetime', () => {
  const input = { move: 'ask', question: 'Original question' }, value = call(input);
  const result = admitted(declaration(), value);
  input.question = 'Changed after admission';
  assert.equal(result.statement.kind, 'feltos.world.gateway-admission');
  assert.equal(result.statement.subject, 'account:alice');
  assert.equal(result.statement.session, 'harness:alice-session');
  assert.equal(result.statement.until, '2026-10-14T20:01:00.000Z');
  assert.equal(result.call.input.question, 'Original question');
  assert.ok(Object.isFrozen(result.call.input));
  assert.throws(() => admitted(declaration(), value, { principal: { subject: 'anonymous' }, session: 'harness:alice-session' }), /authenticated/);
  assert.throws(() => admitted(declaration(), value, { principal: { subject: 'account:alice' } }), /session/);
  assert.throws(() => admitted(declaration(), { ...value, verb: 'Work Open' }), /canonical owner verb/);
  // JSON quotes add two bytes; the non-ASCII contents each occupy two UTF-8 bytes.
  assert.doesNotThrow(() => admitted(declaration(), call('é'.repeat(4095))));
  assert.throws(() => admitted(declaration(), call('é'.repeat(4096))), /bounded native carrier/);
});

test('the receiving execution rejects altered world, principal, session, audience and exact call before authorization', async () => {
  const f = executionFixture(), source = admitted();
  const changes = [
    { world: 'another-world' }, { state: semanticId('another-state') },
    { issuer: 'https://foreign.example/actors/world' },
    { recipient: 'https://foreign.example/actors/world' },
    { subject: 'account:bob' }, { session: 'harness:bob-session' },
    { catalogue: semanticId('different-catalogue') }, { call: semanticId('different-call') },
    { until: '2026-10-14T20:02:00.000Z' }, { root: '/caller-selected-root' },
  ];
  for (const change of changes) await assert.rejects(f.invoke(restate(source.statement, change)), undefined, JSON.stringify(change));
  await assert.rejects(f.invoke({ ...source.statement, subject: 'account:bob' }), /content address differs/);
  await assert.rejects(f.invoke(source.statement, call({ move: 'ask', question: 'Substituted question' })), /exact call/);
  await assert.rejects(f.invoke(source.statement, call(), 'https://foreign.example/actors/world'), /authority/);
  await assert.rejects(f.execution({ claim: { ...claim(call()), argv: ['work-open', 'extra'] }, requester: issuer, recipient, subjectBinding: source.statement }), /without extra argv/);
  assert.equal(f.state.authorized.length, 0);
});

test('execution uses the ordinary authorizer and rechecks current authority immediately before its effect', async () => {
  const accepted = executionFixture(), source = admitted();
  const invocation = { subject: 'account:alice', caller: { hand: 'session:alice-session' }, input: call().input };
  const identity = await accepted.invoke(source.statement);
  assert.equal(identity.once, true);
  assert.equal(identity.subjectBinding, source.statement.id);
  assert.equal(identity.authorize(invocation, operations[0], AT), 'held');
  assert.deepEqual(accepted.state.authorized, [[invocation, operations[0], AT]]);
  for (const change of ['world', 'catalogue', 'operation', 'bearer', 'expired', 'future', 'call']) {
    const f = executionFixture(), execution = await f.invoke(source.statement);
    if (change === 'world') f.state.binding = { ...f.state.binding, world: 'other-world' };
    if (change === 'catalogue') f.state.operations = [operations[0]];
    if (change === 'operation') f.state.operations = [{ ...operations[0], verb: 'other-verb' }, operations[1]];
    if (change === 'bearer') f.state.bearer = 'fixture:bob';
    if (change === 'expired') f.state.now = '2026-10-14T20:01:00.001Z';
    if (change === 'future') f.state.now = '2026-10-14T19:59:59.999Z';
    const actual = change === 'call' ? { ...invocation, input: { question: 'changed' } } : invocation;
    assert.throws(() => execution.authorize(actual, operations[0], AT), undefined, change);
    assert.equal(f.state.authorized.length, 0, change);
  }
});

test('a terminal invocation is observed through its original handle without another preparation or send', async () => {
  const f = portFixture(), gateway = f.gateway();
  const issued = await gateway.invoke(call(), context());
  assert.equal(issued.state, 'terminal');
  assert.equal(issued.result.executor, 'account:alice');
  assert.equal(issued.result.service.world, f.binding.world);
  assert.equal(issued.handle.kind, 'feltos.world.gateway-observation');
  const copy = JSON.parse(JSON.stringify(issued.handle));
  const fresh = f.gateway();
  assert.deepEqual((await fresh.observe(copy, context())).result, issued.result);
  assert.deepEqual((await fresh.observe(copy, context())).result, issued.result);
  assert.equal(f.counts.prepare, 1);
  assert.equal(f.counts.send, 1);
  assert.equal(f.counts.retained, 1);
  assert.equal(gateway.active(), 0);
});

test('known retention after a lost response remains pending and observation never resubmits it', async () => {
  const f = portFixture();
  f.setSend(async request => {
    f.admit(request);
    const submission = f.retain(request);
    throw Object.assign(new Error('fixture response lost'), { submission });
  });
  const gateway = f.gateway(), pending = await gateway.invoke(call(), context());
  assert.equal(pending.state, 'pending');
  assert.ok(pending.handle.submission.request);
  assert.equal((await gateway.observe(pending.handle, context())).state, 'pending');
  assert.equal(f.counts.prepare, 1);
  assert.equal(f.counts.send, 1);
});

test('a timeout before native admission prevents later retention while keeping the unfinished slot occupied', async t => {
  const f = portFixture(), gate = deferred(), settled = deferred();
  t.after(() => gate.resolve());
  f.setSend(async request => {
    try { await gate.promise; f.admit(request); return f.retain(request); }
    finally { settled.resolve(); }
  });
  const gateway = f.gateway(), result = await gateway.invoke(call(), context());
  assert.equal(result.state, 'not-submitted');
  assert.equal(gateway.active(), 1);
  assert.equal(f.counts.admitted, 0);
  gate.resolve(); await settled.promise; await nextTurn();
  assert.equal(f.counts.admitted, 0);
  assert.equal(f.counts.retained, 0);
  assert.equal(gateway.active(), 0);
});

test('a fresh gateway recovers uncertain late retention from the original identity without another send', async t => {
  const f = portFixture(), gate = deferred(), settled = deferred();
  t.after(() => gate.resolve());
  f.setSend(async request => {
    f.admit(request);
    try { await gate.promise; f.retain(request); throw new Error('fixture retention response lost'); }
    finally { settled.resolve(); }
  });
  const gateway = f.gateway(), uncertain = await gateway.invoke(call(), context());
  assert.equal(uncertain.state, 'indeterminate');
  assert.equal(uncertain.handle.submission.request, undefined);
  assert.equal(gateway.active(), 1);
  const original = JSON.parse(JSON.stringify(uncertain.handle)), fresh = f.gateway();
  assert.equal((await fresh.observe(original, context())).state, 'indeterminate');
  gate.resolve(); await settled.promise; await nextTurn();
  const recovered = await fresh.observe(original, context());
  assert.equal(recovered.state, 'pending');
  assert.ok(recovered.handle.submission.request);
  const submission = f.retained.get(original.submission.requestNi);
  f.results.set(submission.requestNi, f.reply(submission, original.statement));
  assert.equal((await fresh.observe(original, context())).state, 'terminal');
  assert.equal(f.counts.prepare, 1);
  assert.equal(f.counts.send, 1);
  assert.equal(f.counts.retained, 1);
  assert.equal(gateway.active(), 0);
});

test('timed-out invocations and observations retain the shared finite in-flight bound until settled', async t => {
  const f = portFixture(), gate = deferred();
  t.after(() => gate.resolve());
  f.setSend(async request => { await gate.promise; f.admit(request); return f.retain(request); });
  const gateway = f.gateway();
  const waiting = Array.from({ length: 8 }, () => gateway.invoke(call(), context()));
  await assert.rejects(gateway.invoke(call(), context()), error => error.code === 'GATEWAY_BUSY');
  assert.ok((await Promise.all(waiting)).every(result => result.state === 'not-submitted'));
  assert.equal(gateway.active(), 8);
  assert.equal(f.counts.send, 8);
  gate.resolve(); await nextTurn();
  assert.equal(gateway.active(), 0);
  assert.equal(f.counts.retained, 0);

  const reading = portFixture(), issued = await reading.gateway().invoke(call(), context());
  const reads = deferred(); t.after(() => reads.resolve());
  reading.setRead(async () => { await reads.promise; return undefined; });
  const observer = reading.gateway();
  const pending = Array.from({ length: 8 }, () => observer.observe(issued.handle, context()));
  await assert.rejects(observer.observe(issued.handle, context()), error => error.code === 'GATEWAY_BUSY');
  await assert.rejects(observer.invoke(call(), context()), error => error.code === 'GATEWAY_BUSY');
  assert.ok((await Promise.all(pending)).every(result => result.state === 'pending'));
  assert.equal(observer.active(), 8);
  assert.equal(reading.counts.send, 1);
  reads.resolve(); await nextTurn();
  assert.equal(observer.active(), 0);
});

test('preparation cannot substitute the audience or become asynchronous before native submission', async () => {
  for (const wrong of ['audience', 'async']) {
    const f = portFixture(), original = f.port.prepare;
    f.port.prepare = request => {
      const retention = original(request);
      return wrong === 'async' ? Promise.resolve(retention)
        : { ...retention, recipient: 'https://foreign.example/actors/world' };
    };
    await assert.rejects(f.gateway().invoke(call(), context()), /preserve its exact audience synchronously/);
    assert.equal(f.counts.send, 0);
    assert.equal(f.counts.retained, 0);
  }
});

test('observation refuses another caller or world before reading the original result', async () => {
  const f = portFixture(), issued = await f.gateway().invoke(call(), context());
  const before = f.counts.result;
  await assert.rejects(f.gateway().observe(issued.handle, context('bob')), /another caller/);
  const other = f.gateway({ binding: () => ({ ...f.binding, world: 'another-world' }) });
  await assert.rejects(other.observe(issued.handle, context()), /logical world/);
  const state = f.gateway({ binding: () => ({ ...f.binding, state: semanticId('other-state') }) });
  await assert.rejects(state.observe(issued.handle, context()), /logical world/);
  await assert.rejects(f.gateway().observe({ ...issued.handle, statement: { ...issued.handle.statement, nonce: 'x'.repeat(8193) } }, context()), /exceeds its bound/);
  assert.equal(f.counts.result, before);
  assert.equal(f.counts.send, 1);
});

test('the addressed reply must retain the exact native request, principal, session and world', async () => {
  const changes = [
    receipt => ({ ...receipt, request: semanticId('another-request') }),
    receipt => ({ ...receipt, recipient: 'https://foreign.example/actors/world' }),
    receipt => ({ ...receipt, result: { ...receipt.result, subjectBinding: semanticId('other-binding') } }),
    receipt => ({ ...receipt, result: { ...receipt.result, executor: 'account:bob' } }),
    receipt => ({ ...receipt, result: { ...receipt.result, hand: 'session:bob-session' } }),
    receipt => ({ ...receipt, result: { ...receipt.result, requester: 'https://foreign.example/actors/world' } }),
    ...['binding', 'world', 'state', 'session'].map(key => receipt => ({
      ...receipt, result: { ...receipt.result, service: { ...receipt.result.service, [key]: 'changed' } },
    })),
  ];
  for (const change of changes) {
    const f = portFixture(), issued = await f.gateway().invoke(call(), context());
    const original = f.results.get(issued.handle.submission.requestNi);
    f.setRead(async () => change(original));
    await assert.rejects(f.gateway().observe(issued.handle, context()), /differs from/);
    assert.equal(f.counts.send, 1);
  }
});

test('an oversized terminal result refuses with the retained handle and cannot invite replay', async () => {
  const f = portFixture(), issued = await f.gateway().invoke(call(), context());
  const original = f.results.get(issued.handle.submission.requestNi);
  f.setRead(async () => ({ ...original, result: { ...original.result, stdout: 'é'.repeat(12288) } }));
  await assert.rejects(f.gateway().observe(issued.handle, context()), error => {
    assert.equal(error.code, 'GATEWAY_RESULT_TOO_LARGE');
    assert.deepEqual(error.handle, issued.handle);
    return true;
  });
  assert.equal(f.counts.send, 1);
  assert.equal(f.counts.retained, 1);
});

test('a later recognized session may observe the same bearer while preserving the original execution hand', async () => {
  const f = portFixture(), issued = await f.gateway().invoke(call(), context());
  const later = context('alice', 'harness:alice-next');
  const recognized = f.gateway({ recognizeSession: (subject, session) => ({
    subject, session, hand: hand(session), bearer: 'fixture:alice',
  }) });
  const received = await recognized.observe(issued.handle, later);
  assert.equal(received.state, 'terminal');
  assert.equal(received.result.service.session, 'harness:alice-session');
  assert.equal(received.handle.statement.session, 'harness:alice-session');
  await assert.rejects(f.gateway().observe(issued.handle, later), /original host identity reader/);
  const other = f.gateway({ recognizeSession: (subject, session) => ({
    subject, session, hand: hand(session), bearer: 'fixture:bob',
  }) });
  await assert.rejects(other.observe(issued.handle, later), /original Work bearer/);
  assert.equal(f.counts.send, 1);
});

test('later-session result access rechecks the bearer after the native read settles', async t => {
  const f = portFixture({ waitMs: 100 }), issued = await f.gateway().invoke(call(), context());
  const gate = deferred(), started = deferred(); t.after(() => gate.resolve());
  let bearer = 'fixture:alice';
  const original = f.results.get(issued.handle.submission.requestNi);
  f.setRead(async () => { started.resolve(); await gate.promise; return original; });
  const gateway = f.gateway({ recognizeSession: (subject, session) => ({
    subject, session, hand: hand(session), bearer,
  }) });
  const observing = gateway.observe(issued.handle, context('alice', 'harness:alice-next'));
  const refused = assert.rejects(observing, /original Work bearer/);
  await started.promise; bearer = 'fixture:bob'; gate.resolve();
  await refused;
  assert.equal(f.counts.send, 1);
  assert.equal(gateway.active(), 0);
});
