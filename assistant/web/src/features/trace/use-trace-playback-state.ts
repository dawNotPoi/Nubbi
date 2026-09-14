import type { Dispatch, SetStateAction } from "react";
import type { TraceItem } from "./trace-types.ts";
import type { RunSummary, RuntimeEvent } from "../../types.ts";

/** TracePlayback 的视图状态及动作契约。 */
export type TracePlaybackState = {
  runs: RunSummary[];
  historyRuns: { summary: RunSummary; events: RuntimeEvent[] }[] | null;
  loading: boolean;
  error: string | null;
  replayMode: boolean;
  setReplayMode: Dispatch<SetStateAction<boolean>>;
  replayIndex: number;
  setReplayIndex: Dispatch<SetStateAction<number>>;
  replayPlaying: boolean;
  setReplayPlaying: Dispatch<SetStateAction<boolean>>;
  liveTraceItems: TraceItem[];
  allHistoryEvents: RuntimeEvent[];
};
