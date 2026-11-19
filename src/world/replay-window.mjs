/**
 * A bounded source-tick history collector for QwzSpace's existing replay
 * callback. The room and event log remain the single source of truth.
 * No guessed wall-clock times, missing ticks or second replay engine.
 */
const sourceCopy = value => {
  try { return structuredClone(value); }
  catch { throw new TypeError("QwzSpace replay frame must be structured-cloneable"); }
};
export function createReplayWindowCollector({fromTick=1,toTick,maxFrames=128,project=frame=>frame}={}) {
  if(!Number.isSafeInteger(fromTick)||fromTick<1||
     !Number.isSafeInteger(toTick)||toTick<fromTick||
     !Number.isSafeInteger(maxFrames)||maxFrames<1||maxFrames>512||
     typeof project!=="function")
    throw new TypeError("QwzSpace replay window requires bounded positive source ticks");
  if(toTick-fromTick+1>maxFrames)
    throw new RangeError("QwzSpace replay window exceeds source frame budget");
  const kept=[];
  let last=0;
  return Object.freeze({
    onTick(tick,frame) {
      if(!Number.isSafeInteger(tick)||tick<1||tick<=last||
          !frame || typeof frame!=="object" || frame.tick!==tick)
        throw new TypeError("QwzSpace replay callback requires monotone settled frames");
      if(tick>=fromTick && tick<=toTick) {
        const accepted=sourceCopy(project(sourceCopy(frame),tick));
        kept.push(Object.freeze({tick,frame:accepted}));
      }
      // Do not advance source-watermark after a refused/failed projection.
      last=tick;
    },
    snapshot() {
      return Object.freeze({
        kind:"qwzspace.replay-window",
        fromTick,toTick,
        observedThrough:last,
        frames:Object.freeze(kept.map(item=>Object.freeze({tick:item.tick,frame:sourceCopy(item.frame)}))),
        complete:kept.length===toTick-fromTick+1,
        semantics:"original-settled-replay-ticks-not-wall-clock-time",
      });
    },
  });
}

/** Choose one frame that was ACTUALLY observed; do not interpolate a tick. */
export function selectReplayFrame(window,tick) {
  if(window?.kind!=="qwzspace.replay-window"||!Array.isArray(window.frames)||
     !Number.isSafeInteger(tick))
    throw new TypeError("QwzSpace replay selection needs a collected source tick");
  return window.frames.find(item=>item.tick===tick)??null;
}
