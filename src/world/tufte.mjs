import {
  normalizeTufteModel,
  renderTufteDocument,
} from "@red-cup-engineering/tufte";

/**
 * Turn one tick-numbered QwzSpace projection into a TUFTE document model.
 * QwzSpace owns ordering and entity delivery; the consuming game owns the
 * domain-specific entity-to-tile projection.
 */
export function createTufteRoomModel({
  title = "QwzSpace",
  subtitle = "A live room",
  eyebrow = "QwzSpace",
  revision = "",
  tick,
  entries = [],
  tileForEntry,
  leadingTiles = [],
  trailingTiles = [],
  mastheadHtml,
  footerHtml,
  workspace,
} = {}) {
  if (typeof tileForEntry !== "function") {
    throw new TypeError("createTufteRoomModel: tileForEntry(entry, index) is required");
  }
  const projected = [];
  for (const [index, entry] of Array.from(entries).entries()) {
    const value = tileForEntry(entry, index);
    if (Array.isArray(value)) projected.push(...value);
    else if (value) projected.push(value);
  }
  return {
    title,
    subtitle,
    eyebrow,
    revision: revision || (Number.isFinite(Number(tick)) ? `tick-${Math.trunc(Number(tick))}` : ""),
    ...(Number.isFinite(Number(tick)) ? { tick: Math.trunc(Number(tick)) } : {}),
    tiles: [...leadingTiles, ...projected, ...trailingTiles],
    ...(mastheadHtml === undefined ? {} : { mastheadHtml }),
    ...(footerHtml === undefined ? {} : { footerHtml }),
    ...(workspace === undefined ? {} : { workspace }),
  };
}

/** Render a QwzSpace projection with TUFTE's server-first document renderer. */
export function renderTufteRoomDocument(room, options = {}) {
  return renderTufteDocument(createTufteRoomModel(room), options);
}

/** Normalize through TUFTE for browser patching without rendering HTML. */
export function normalizeTufteRoomProjection(room) {
  return normalizeTufteModel(createTufteRoomModel(room));
}

import { selectReplayFrame } from "./replay-window.mjs";

/**
 * Reuse the existing QwzSpace -> TUFTE page boundary for a selected,
 * ORIGINAL settled replay tick. The source log supplies onTick frames;
 * TUFTE owns native table/link rendering, not a new game HUD.
 */
export function createTufteReplayWindowModel({
  window,selectedTick,tileForFrame,hrefForTick,title="Replay research",workspace,
}={}) {
  if(!window || window.kind!=="qwzspace.replay-window" ||
     !Array.isArray(window.frames) || window.frames.length>512 ||
     typeof tileForFrame!=="function" || typeof hrefForTick!=="function")
    throw new TypeError("QwzSpace TUFTE timeline needs an admitted replay-window source");
  const selected=selectReplayFrame(window,selectedTick);
  if(selected===null)throw new RangeError("Selected tick not available in the admitted replay");
  const rows=window.frames.map(item=>[
    {text:String(item.tick),href:hrefForTick(item.tick)},
    {text:item.tick===selectedTick?"Selected settled tick":"Settled tick"},
  ]);
  return createTufteRoomModel({
    title,subtitle:"Original settled frames; no inferred wall-clock timestamps",
    tick:selectedTick,
    entries:[selected.frame],
    tileForEntry:frame=>tileForFrame(frame,selectedTick),
    leadingTiles:[{id:"timeline",title:"Source tick window",span:12,
      table:{caption:"Replay tick selection",columns:[
        {label:"Tick",rowHeader:true},{label:"Reading"}],rows,
        empty:"No settled ticks in this admitted window."}}],
    ...(workspace===undefined?{}:{workspace}),
  });
}
