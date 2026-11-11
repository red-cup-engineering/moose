import assert from "node:assert/strict";
import test from "node:test";
import { gardenGame } from "./fixtures/garden.mjs";
import { composeCapabilities, defineCapability } from "../src/capabilities.mjs";
import { admit, createEngine, join, step, submit } from "../src/engine.mjs";
import { defineGame } from "../src/game.mjs";
import { placeOf, tell, value } from "../src/world.mjs";

function commands(engine, intents) {
  for (const intent of intents) engine = submit(engine, intent);
  return step(engine);
}


test("ambiguous MUD object names cannot silently select a different player possession", () => {
  let engine = join(createEngine(gardenGame), "alice", { name: "Alice" });
  engine = join(engine, "bob", { name: "Bob" });
  engine = { ...engine, world: tell(engine.world, [
    { subject: "twin-lantern", predicate: "kind", object: "thing" },
    { subject: "twin-lantern", predicate: "name", object: "a brass lantern" },
    { subject: "twin-lantern", predicate: "description", object: "The identical but source-distinct lantern." },
    { subject: "twin-lantern", predicate: "located-in", object: "garden-gate" },
    { subject: "remote-lantern", predicate: "kind", object: "thing" },
    { subject: "remote-lantern", predicate: "name", object: "a brass lantern" },
    { subject: "remote-lantern", predicate: "located-in", object: "kitchen-garden" },
  ], { source: "original-game-creator" }) };
  const perform = command => {
    const result = step(submit(engine, { actor: "alice", command }));
    engine = result.engine;
    return result.receipt.events.filter(event => event.to === "alice").map(e => e.text).join("\n");
  };
  const ambiguousLook = perform("look a brass lantern");
  assert.match(ambiguousLook, /Several things answer to "a brass lantern"/u);
  assert.match(ambiguousLook, /lantern/u);
  assert.match(ambiguousLook, /twin-lantern/u);
  assert.doesNotMatch(ambiguousLook, /remote-lantern/u,
    "current room disambiguation must not reveal a remote unperceived Thing");
  assert.match(perform("take a brass lantern"), /Several things answer/u);
  assert.equal(placeOf(engine.world, "lantern"), "garden-gate");
  assert.equal(placeOf(engine.world, "twin-lantern"), "garden-gate");
  assert.match(perform("take lantern"), /You take/u,
    "an exact visible source ID remains a usable unambiguous selector");
  assert.match(perform("take twin-lantern"), /You take/u);
  assert.equal(placeOf(engine.world, "lantern"), "alice");
  assert.equal(placeOf(engine.world, "twin-lantern"), "alice");
  assert.match(perform("drop a brass lantern"), /Several things answer/u);
  assert.equal(placeOf(engine.world, "lantern"), "alice");
  assert.equal(placeOf(engine.world, "twin-lantern"), "alice",
    "ambiguous drop cannot silently remove an arbitrary owned item");
  assert.match(perform("give a brass lantern to Bob"), /Several things answer/u);
  assert.equal(placeOf(engine.world, "twin-lantern"), "alice");
  assert.match(perform("drop lantern"), /You drop/u);
  assert.equal(placeOf(engine.world, "lantern"), "garden-gate");
  assert.match(perform("give twin-lantern to bob"), /You give/u);
  assert.equal(placeOf(engine.world, "twin-lantern"), "bob");

  // Two visible, source-distinct recipients with one spoken display name.
  engine = { ...engine, world: tell(engine.world, [
    { subject: "other-bob", predicate: "kind", object: "npc" },
    { subject: "other-bob", predicate: "name", object: "Bob" },
    { subject: "other-bob", predicate: "located-in", object: "garden-gate" },
  ], { source: "original-game-creator" }) };
  assert.match(perform("take lantern"), /You take/u);
  const refused = perform("give lantern to Bob");
  assert.match(refused, /Several things answer to "Bob"/u);
  assert.match(refused, /other-bob/u);
  assert.equal(placeOf(engine.world, "lantern"), "alice");
  assert.match(perform("give lantern to bob"), /You give/u);
  assert.equal(placeOf(engine.world, "lantern"), "bob");
});

test("an action is admitted when it arrives, at the current moment, and competing arrivals in one round conflict", () => {
  let engine = join(createEngine(gardenGame), "alice");
  engine = join(engine, "bob");
  const taken = admit(submit(engine, { actor: "alice", command: "take lantern" }));
  assert.equal(taken.receipt.kind, "feltos.admission-receipt.v1");
  assert.equal(taken.engine.tick, engine.tick, "admission does not advance simulated time");
  assert.equal(taken.engine.queue.length, 0);
  assert.equal(placeOf(taken.engine.world, "lantern"), "alice");

  const contested = admit(submit(submit(engine, { actor: "alice", command: "take lantern" }), { actor: "bob", command: "take lantern" }));
  assert.equal(contested.receipt.admission.admitted.length, 0);
  assert.equal(placeOf(contested.engine.world, "lantern"), "garden-gate");
  assert.ok(contested.receipt.events.every(({ text }) => text.includes("conflicts")));
});

test("the tick witnesses competing claims without awarding by arrival order", () => {
  let engine = join(createEngine(gardenGame), "alice");
  engine = join(engine, "bob");
  const before = engine.world;
  const result = commands(engine, [
    { actor: "alice", command: "take lantern" },
    { actor: "bob", command: "take lantern" },
  ]);

  assert.equal(placeOf(before, "lantern"), "garden-gate");
  assert.equal(placeOf(result.engine.world, "lantern"), "garden-gate");
  assert.deepEqual(result.receipt.events.map(({ to }) => to), ["alice", "bob"]);
  assert.ok(result.receipt.events.every(({ text }) => text.includes("conflicts")));
  assert.equal(result.receipt.admission.admitted.length, 0);
  assert.equal(result.receipt.tick, 1);
  assert.equal(result.engine.queue.length, 0);
});

test("a player can hand a carried thing to a present recipient", () => {
  let engine = join(createEngine(gardenGame), "alice");
  engine = join(engine, "bob");
  let result = commands(engine, [{ actor: "alice", command: "take lantern" }]);
  result = commands(result.engine, [{ actor: "alice", command: "give a brass lantern to bob" }]);
  assert.equal(placeOf(result.engine.world, "lantern"), "bob");
  assert.equal(result.receipt.events[0].text, "You give a brass lantern to bob.");
});

test("extension commands run once by default and only explicit false falls through", () => {
  const game = defineGame({ ...gardenGame, capabilities: ["test.give"] });
  let calls = 0;
  const handledRuntime = composeCapabilities([defineCapability({
    id: "test.give",
    commands: { give() { calls += 1; } },
  })]);
  let engine = join(createEngine(game), "alice");
  engine = join(engine, "bob");
  engine = step(submit(engine, { actor: "alice", command: "take lantern" }), { runtime: handledRuntime }).engine;
  let result = step(submit(engine, { actor: "alice", command: "give a brass lantern to bob" }), { runtime: handledRuntime });
  assert.equal(calls, 1);
  assert.equal(placeOf(result.engine.world, "lantern"), "alice");

  const fallbackRuntime = composeCapabilities([defineCapability({
    id: "test.give",
    commands: { give() { calls += 1; return { handled: false }; } },
  })]);
  result = step(submit(result.engine, { actor: "alice", command: "give a brass lantern to bob" }), { runtime: fallbackRuntime });
  assert.equal(calls, 2);
  assert.equal(placeOf(result.engine.world, "lantern"), "bob");
});

test("give only accepts a co-located player or NPC as its recipient", () => {
  let engine = join(createEngine(gardenGame), "alice");
  engine = commands(engine, [{ actor: "alice", command: "take lantern" }]).engine;
  const result = commands(engine, [{ actor: "alice", command: "give lantern to a brass lantern" }]);
  assert.equal(placeOf(result.engine.world, "lantern"), "alice");
  assert.match(result.receipt.events[0].text, /who is here/u);
});

test("fixed world fixtures cannot enter a player's inventory", () => {
  let engine = join(createEngine(gardenGame), "alice");
  engine = { ...engine, world: tell(engine.world, { subject: "lantern", predicate: "fixed", object: true }) };
  const result = commands(engine, [{ actor: "alice", command: "take lantern" }]);
  assert.equal(placeOf(result.engine.world, "lantern"), "garden-gate");
  assert.equal(result.receipt.events[0].text, "You cannot take lantern.");
});

test("movement, local speech, inventory, and perception form an executable slice", () => {
  let engine = join(createEngine(gardenGame), "alice");
  engine = join(engine, "bob");

  let result = commands(engine, [
    { actor: "alice", command: "say hello" },
    { actor: "alice", command: "go north" },
    { actor: "bob", command: "say still there?" },
  ]);
  engine = result.engine;

  assert.equal(placeOf(engine.world, "alice"), "kitchen-garden");
  assert.equal(placeOf(engine.world, "bob"), "garden-gate");
  assert.deepEqual(result.receipt.events.filter(({ channel }) => channel === "speech").map(({ to }) => to), [
    "alice", "bob", "alice", "bob",
  ]);

  result = commands(engine, [{ actor: "alice", command: "look" }]);
  assert.match(result.receipt.events[0].text, /The Kitchen Garden/u);
  assert.doesNotMatch(result.receipt.events[0].text, /Bob/u);
});

test("land movement cannot carry a character into authored ocean", () => {
  const game = defineGame({
    id: "feltos.coast",
    name: "The Coast",
    start: "shore",
    rooms: {
      shore: { name: "The Shore", description: "Stone underfoot.", exits: { east: "open-water" } },
      "open-water": { name: "Open Water", description: "Grey swell.", exits: { west: "shore" } },
    },
    assertions: [{ subject: "open-water", predicate: "tag", object: "ocean" }],
  });
  let engine = join(createEngine(game), "alice");
  let result = commands(engine, [{ actor: "alice", command: "go east" }]);
  assert.equal(placeOf(result.engine.world, "alice"), "shore");
  assert.match(result.receipt.events[0].text, /Board a vessel/u);

  result = commands(result.engine, [{ actor: "alice", command: "east" }]);
  assert.equal(placeOf(result.engine.world, "alice"), "shore");
  assert.match(result.receipt.events[0].text, /Board a vessel/u);
});

test("ordinary rooms contained by a building remain walkable", () => {
  let engine = join(createEngine(gardenGame), "alice");
  engine = {
    ...engine,
    world: tell(engine.world, [
      { subject: "garden-hall", predicate: "kind", object: "building" },
      { subject: "garden-gate", predicate: "part-of", object: "garden-hall" },
      { subject: "kitchen-garden", predicate: "part-of", object: "garden-hall" },
    ]),
  };
  const result = commands(engine, [{ actor: "alice", command: "go north" }]);
  assert.equal(placeOf(result.engine.world, "alice"), "kitchen-garden");
});

test("ordinary MUD aliases keep examination, exits, emotes, and bare directions playable", () => {
  let engine = join(createEngine(gardenGame), "alice", { name: "Alice" });
  engine = join(engine, "bob", { name: "Bob" });
  let result = commands(engine, [
    { actor: "alice", command: "examine lantern" },
    { actor: "alice", command: "exits" },
    { actor: "alice", command: "emote waves from the gate." },
    { actor: "alice", command: "n" },
  ]);
  engine = result.engine;
  const output = result.receipt.events;
  assert.match(output[0].text, /warm, though no flame/u);
  assert.equal(output[1].text, "Exits: north");
  assert.deepEqual(output.filter(({ channel }) => channel === "emote").map(({ to }) => to), ["alice", "bob"]);
  assert.equal(placeOf(engine.world, "alice"), "kitchen-garden");
});

test("actor identities cannot alias game content", () => {
  const engine = createEngine(gardenGame);
  assert.throws(() => join(engine, "lantern"), /collides/u);
  assert.throws(() => join(engine, "Alice"), /lowercase identifier/u);
});

test("help, commands, and score provide a conventional discoverable MUD baseline", () => {
  let engine = join(createEngine(gardenGame), "alice", { name: "Alice Marigold" });
  const result = commands(engine, [
    { actor: "alice", command: "help" },
    { actor: "alice", command: "help go" },
    { actor: "alice", command: "commands" },
    { actor: "alice", command: "score" },
  ]);
  const output = result.receipt.events.map(({ text }) => text);
  assert.match(output[0], /Commands:.*help.*look.*score/u);
  assert.equal(output[1], "go <exit> — travel through a visible exit");
  assert.match(output[2], /inventory/u);
  assert.match(output[3], /Alice Marigold\nLocation: The Garden Gate\nCarrying: 0\nWorld tick: 1/u);
  assert.match(output[3], /Coin: 0\nStanding: no standing on record/u);
  assert.equal(value(result.engine.world, "alice", "name"), "Alice Marigold");
});

test("stats is score's classic MUD synonym, and skills reports honestly when nothing is practiced", () => {
  let engine = join(createEngine(gardenGame), "alice", { name: "Alice Marigold" });
  const result = commands(engine, [
    { actor: "alice", command: "stats" },
    { actor: "alice", command: "skills" },
  ]);
  const output = result.receipt.events.map(({ text }) => text);
  assert.match(output[0], /Alice Marigold\nLocation: The Garden Gate\nCarrying: 0\nWorld tick: 1/u);
  assert.equal(output[1], "You have not practiced any skills yet.");
});

test("look me / look self / look <own name> all render an honest self-description", () => {
  let engine = join(createEngine(gardenGame), "alice", { name: "Alice Marigold" });
  const result = commands(engine, [
    { actor: "alice", command: "look me" },
    { actor: "alice", command: "look self" },
    { actor: "alice", command: "look Alice Marigold" },
  ]);
  const output = result.receipt.events.map(({ text }) => text);
  for (const text of output) {
    assert.match(text, /^Alice Marigold\nRole: unset\nCarrying: nothing\nSkills: no skills practiced yet$/u);
  }
});

test("an unknown command teaches: it suggests the nearest real verb and always points at help", () => {
  let engine = join(createEngine(gardenGame), "alice");
  const result = commands(engine, [{ actor: "alice", command: "scor" }]);
  const [text] = result.receipt.events.map(({ text: line }) => line);
  assert.match(text, /^Unknown command: scor\. Did you mean "score"\? Type help for the full list\.$/u);
});

test("help and commands teach the real control-plane verb set too, filtered by voice", () => {
  // a plain join() (no identity.mjs welcome) carries no "role" fact, so hasVoice defaults to true
  // (see identity.mjs) — register/login are dropped from the list since this actor already has voice.
  let engine = join(createEngine(gardenGame), "alice");
  const result = commands(engine, [{ actor: "alice", command: "commands" }]);
  const [text] = result.receipt.events.map(({ text: line }) => line);
  assert.match(text, /Also available: chat, finger, quit, tell, who, whoami/u);
});

test("ordinary inventory, look and movement remain playable across demand-driven menu reads",()=>{
  let game=createEngine(gardenGame);
  game=join(game,"alice",{name:"Alice"});
  const ask=(command)=>{
    const result=step(submit(game,{actor:"alice",command}));
    game=result.engine;
    return result.receipt.events.filter(x=>x.to==="alice").map(x=>x.text).join("\n");
  };
  const initialInventory=ask("inventory");
  assert.equal(initialInventory,"You carry nothing.");
  const initialHelp=ask("help");
  assert.match(initialHelp,/Commands:.*inventory.*look/u);
  assert.match(ask("help go"),/go <exit>/u);
  assert.match(ask("commands"),/Commands:.*inventory/u);
  assert.match(ask("scor"),/Did you mean "score"/u);
  assert.match(ask("look"),/The Garden Gate/u);
  assert.match(ask("' hello from the MUD"),/You say/u,
    "the original punctuation speech alias must not be parsed as a missing authored verb");
  assert.match(ask("help not-a-real-method!"),/No help is available for/u,
    "invalid source-operation names remain ordinary bounded help refusals");
  assert.match(ask("skills"),/You have not practiced any skills yet/u);
  assert.match(ask("take lantern"),/You take/u);
  assert.match(ask("inventory"),/lantern/u);
  assert.match(ask("go north"),/Kitchen Garden/u);
  assert.match(ask("look"),/Kitchen Garden/u);
  assert.match(ask("inventory"),/lantern/u);
  assert.match(ask("drop lantern"),/You drop/u);
  assert.match(ask("inventory"),/You carry nothing/u);
  assert.equal(placeOf(game.world,"alice"),"kitchen-garden");
});

test("discovering current native commands after a world change never reuses the prior room's exits",()=>{
  let engine=join(createEngine(gardenGame),"alice");
  const first=step(submit(engine,{actor:"alice",command:"commands"}));
  const firstText=first.receipt.events[0].text;
  assert.match(firstText,/go north/u);
  const moved=step(submit(first.engine,{actor:"alice",command:"go north"}));
  const after=step(submit(moved.engine,{actor:"alice",command:"commands"}));
  const afterText=after.receipt.events[0].text;
  assert.doesNotMatch(afterText,/go north/u);
  assert.match(afterText,/go south/u);
  assert.equal(placeOf(after.engine.world,"alice"),"kitchen-garden");
});

test("authored bag is acquired, opened, packed, inspected, unpacked and closed through original World history",()=>{
  let engine=join(createEngine(gardenGame),"alice",{name:"Alice"});
  engine={...engine,world:tell(engine.world,[
    {subject:"canvas-bag",predicate:"kind",object:"container"},
    {subject:"canvas-bag",predicate:"name",object:"canvas bag"},
    {subject:"canvas-bag",predicate:"description",object:"A woven bag."},
    {subject:"canvas-bag",predicate:"capacity-items",object:1},
    {subject:"canvas-bag",predicate:"open",object:false},
    {subject:"canvas-bag",predicate:"located-in",object:"garden-gate"},
  ],{source:"game-author"})};
  const play=line=>{const r=step(submit(engine,{actor:"alice",command:line}));engine=r.engine;
    return r.receipt.events.filter(x=>x.to==="alice").map(x=>x.text).join("\n")};
  assert.match(play("get canvas-bag"),/You take canvas bag/u);
  assert.equal(value(engine.world,"canvas-bag","owner"),"alice");
  assert.match(play("open canvas-bag"),/You open/u);
  assert.match(play("get lantern"),/You take/u);
  assert.match(play("put lantern in canvas-bag"),/You put/u);
  assert.equal(placeOf(engine.world,"lantern"),"canvas-bag");
  assert.match(play("look canvas-bag"),/Inside: a brass lantern/u);
  assert.match(play("get lantern from canvas-bag"),/You get/u);
  assert.equal(placeOf(engine.world,"lantern"),"alice");
  assert.match(play("close canvas-bag"),/You close/u);
  assert.match(play("put lantern in canvas-bag"),/closed/u);
  assert.equal(placeOf(engine.world,"lantern"),"alice");
});
test("other players cannot open or read private contents; full bags refuse and nonempty bags cannot be gifted",()=>{
  let engine=join(createEngine(gardenGame),"alice",{name:"Alice"});
  engine=join(engine,"bob",{name:"Bob"});
  engine={...engine,world:tell(engine.world,[
    {subject:"canvas-bag",predicate:"kind",object:"container"},
    {subject:"canvas-bag",predicate:"name",object:"canvas bag"},
    {subject:"canvas-bag",predicate:"description",object:"A bag."},
    {subject:"canvas-bag",predicate:"capacity-items",object:1},
    {subject:"canvas-bag",predicate:"owner",object:"alice"},
    {subject:"canvas-bag",predicate:"open",object:true},
    {subject:"canvas-bag",predicate:"located-in",object:"garden-gate"},
    {subject:"secret",predicate:"kind",object:"thing"},
    {subject:"secret",predicate:"name",object:"private map"},
    {subject:"secret",predicate:"owner",object:"alice"},
    {subject:"secret",predicate:"located-in",object:"canvas-bag"},
  ],{source:"game-author"})};
  const play=(actor,line)=>{const r=step(submit(engine,{actor,command:line}));engine=r.engine;
    return r.receipt.events.filter(x=>x.to===actor).map(x=>x.text).join("\n")};
  assert.doesNotMatch(play("bob","look canvas-bag"),/private map/u);
  assert.match(play("bob","get canvas-bag"),/cannot take/u);
  assert.match(play("bob","get secret from canvas-bag"),/cannot use/u);
  assert.match(play("bob","open canvas-bag"),/cannot use/u);
  assert.equal(placeOf(engine.world,"secret"),"canvas-bag");
  assert.match(play("alice","look canvas-bag"),/private map/u);
  assert.match(play("alice","get secret from canvas-bag"),/You get/u);
  assert.match(play("alice","get canvas-bag"),/You take/u);
  assert.match(play("alice","get lantern"),/You take/u);
  assert.match(play("alice","put lantern in canvas-bag"),/You put/u);
  assert.match(play("alice","put secret in canvas-bag"),/full/u);
  assert.match(play("alice","give canvas-bag to bob"),/Empty the container/u);
  assert.equal(placeOf(engine.world,"canvas-bag"),"alice");
});
