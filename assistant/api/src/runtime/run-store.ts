import { randomUUID } from "node:crypto";
import type { RunStatus, RunSummary, RuntimeEvent } from "./events.js";
import { RunEventModel, type RunEventRecord } from "./run-event-model.js";

const terminalTypes = new Set(["run-completed", "run-failed", "run-abandoned"]);

/** 将完整事件拆分为平铺的元信息 + 业务 payload，适配数据库结构。 */
const toRecord = (event: RuntimeEvent): RunEventRecord => {
  const {
    eventId,
    runId,
    conversationId,
    sequence,
    timestamp,
    agentId,
    parentRunId,
    type,
    ...payload
  } = event;
  return {
    eventId,
    runId,
    conversationId,
    sequence,
    timestamp,
    agentId,
    parentRunId,
    type,
    payload,
  };
};

const toEvent = (record: RunEventRecord): RuntimeEvent => ({
  ...record.payload,
  type: record.type,
  eventId: record.eventId,
  runId: record.runId,
  conversationId: record.conversationId,
  sequence: record.sequence,
  timestamp: record.timestamp,
  agentId: record.agentId,
  parentRunId: record.parentRunId,
}) as RuntimeEvent;

export const appendRunEvent = async (event: RuntimeEvent): Promise<void> => {
  await RunEventModel.create(toRecord(event));
};

/** 依据事件的终态推导 Run 的汇总状态：失败事件区分“被取消”与“真正失败”。 */
const statusOf = (event: RuntimeEvent): RunStatus => {
  if (event.type === "run-completed") return "completed";
  if (event.type === "run-abandoned") return "abandoned";
  if (event.type === "run-failed") return event.cancelled ? "cancelled" : "failed";
  return "running";
};

export const listRunEvents = async (runId: string): Promise<RuntimeEvent[]> => {
  const documents = await RunEventModel.find({ runId }).sort({ sequence: 1 }).exec();
  return documents.map(toEvent);
};

export const listRunSummaries = async (conversationId: string): Promise<RunSummary[]> => {
  const documents = await RunEventModel.find({ conversationId })
    .sort({ runId: 1, sequence: 1 })
    .exec();
  const groups = new Map<string, RuntimeEvent[]>();
  documents.map(toEvent).forEach((event) => {
    groups.set(event.runId, [...(groups.get(event.runId) ?? []), event]);
  });
  return [...groups.values()].flatMap((events) => {
    const start = events.find((event) => event.type === "run-started");
    if (!start || start.type !== "run-started") return [];
    const last = events.at(-1) ?? start;
    return [{
      runId: start.runId,
      conversationId: start.conversationId,
      agentId: start.agentId,
      parentRunId: start.parentRunId,
      provider: start.provider,
      status: statusOf(last),
      startedAt: start.timestamp,
      finishedAt: terminalTypes.has(last.type) ? last.timestamp : undefined,
      message: last.type === "run-failed" ? last.message : undefined,
    }];
  }).sort((left, right) => right.startedAt.localeCompare(left.startedAt));
};

/**
 * 服务重启后把没有终态事件的 Run 标记为 abandoned：
 * 进程已退出，无法继续执行，只能补一条终态事件让审计闭环。
 */
export const abandonIncompleteRuns = async (): Promise<void> => {
  const starts = await RunEventModel.find({ type: "run-started" }).exec();
  const runIds = starts.map((event) => event.runId);
  if (!runIds.length) return;
  const terminalRunIds = new Set(await RunEventModel.distinct("runId", {
    runId: { $in: runIds },
    type: { $in: [...terminalTypes] },
  }));
  await Promise.all(starts.filter((start) => !terminalRunIds.has(start.runId)).map(async (start) => {
    const last = await RunEventModel.findOne({ runId: start.runId }).sort({ sequence: -1 }).exec();
    if (!last || terminalTypes.has(last.type)) return;
    await appendRunEvent({
      type: "run-abandoned",
      reason: "Assistant API restarted before the run completed",
      eventId: randomUUID(),
      runId: start.runId,
      conversationId: start.conversationId,
      sequence: last.sequence + 1,
      timestamp: new Date().toISOString(),
      agentId: start.agentId,
      parentRunId: start.parentRunId,
    });
  }));
};
