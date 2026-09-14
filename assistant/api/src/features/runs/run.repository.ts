import { randomUUID } from "node:crypto";
import type { RunStatus, RunSummary, RuntimeEvent } from "../../runtime/events.ts";
import { RunEventModel, type RunEventRecord } from "./run-event.model.ts";

const TERMINAL_TYPES = new Set(["run-completed", "run-failed", "run-abandoned"]);

/**
 * 将完整事件拆分为平铺的元信息 + 业务 payload，适配数据库结构。
 * @param event 带元信息的完整运行时事件。
 * @returns 适配 MongoDB 存储的扁平记录结构。
 */
const toRecord = (event: RuntimeEvent): RunEventRecord => {
  const { eventId, runId, conversationId, sequence, timestamp, agentId, parentRunId, type, ...payload } = event;
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

/**
 * 将数据库记录还原为完整运行时事件。
 * @param record 从 MongoDB 读取的扁平事件记录。
 * @returns 还原后的完整运行时事件（含元信息）。
 */
const toEvent = (record: RunEventRecord): RuntimeEvent =>
  ({
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

/**
 * 追加一条 Run 事件到审计存储。
 * @param event 需要落库的完整运行时事件。
 * @returns 无返回值，事件写入失败时抛出异常。
 */
export const appendRunEvent = async (event: RuntimeEvent): Promise<void> => {
  await RunEventModel.create(toRecord(event));
};

/**
 * 依据事件的终态推导 Run 的汇总状态：失败事件区分“被取消”与“真正失败”。
 * @param event 用于判断状态的运行事件，通常为该 Run 的最后一条事件。
 * @returns Run 的汇总状态。
 */
const statusOf = (event: RuntimeEvent): RunStatus => {
  if (event.type === "run-completed") return "completed";
  if (event.type === "run-abandoned") return "abandoned";
  if (event.type === "run-failed") return event.cancelled ? "cancelled" : "failed";
  return "running";
};

/**
 * 按 sequence 顺序拉取指定 Run 的全部事件。
 * @param runId Run 的唯一 ID。
 * @returns 该 Run 的所有运行时事件（按发生顺序）。
 */
export const listRunEvents = async (runId: string): Promise<RuntimeEvent[]> => {
  const documents = await RunEventModel.find({ runId }).sort({ sequence: 1 }).exec();
  return documents.map(toEvent);
};

/**
 * 按 Run 分组汇总某个对话的全部运行摘要，最新运行排在最前。
 * @param conversationId 对话的唯一 ID。
 * @returns 该对话的 Run 审计摘要列表，按开始时间倒序。
 */
export const listRunSummaries = async (conversationId: string): Promise<RunSummary[]> => {
  const documents = await RunEventModel.find({ conversationId }).sort({ runId: 1, sequence: 1 }).exec();
  const groups = new Map<string, RuntimeEvent[]>();
  documents.map(toEvent).forEach((event) => {
    groups.set(event.runId, [...(groups.get(event.runId) ?? []), event]);
  });
  return [...groups.values()]
    .flatMap((events) => {
      const start = events.find((event) => event.type === "run-started");
      if (!start || start.type !== "run-started") return [];
      const last = events.at(-1) ?? start;
      return [
        {
          runId: start.runId,
          conversationId: start.conversationId,
          agentId: start.agentId,
          parentRunId: start.parentRunId,
          provider: start.provider,
          status: statusOf(last),
          startedAt: start.timestamp,
          finishedAt: TERMINAL_TYPES.has(last.type) ? last.timestamp : undefined,
          message: last.type === "run-failed" ? last.message : undefined,
        },
      ];
    })
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
};

/**
 * 服务重启后把没有终态事件的 Run 标记为 abandoned：
 * 进程已退出，无法继续执行，只能补一条终态事件让审计闭环。
 * @returns 无返回值，处理过程可能写入新的 run-abandoned 事件。
 */
export const abandonIncompleteRuns = async (): Promise<void> => {
  const starts = await RunEventModel.find({ type: "run-started" }).exec();
  const runIds = starts.map((event) => event.runId);
  if (!runIds.length) return;
  const terminalRunIds = new Set(
    await RunEventModel.distinct("runId", {
      runId: { $in: runIds },
      type: { $in: [...TERMINAL_TYPES] },
    }),
  );
  await Promise.all(
    starts
      .filter((start) => !terminalRunIds.has(start.runId))
      .map(async (start) => {
        const last = await RunEventModel.findOne({ runId: start.runId }).sort({ sequence: -1 }).exec();
        if (!last || TERMINAL_TYPES.has(last.type)) return;
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
      }),
  );
};
