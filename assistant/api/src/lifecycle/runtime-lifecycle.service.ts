import { Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { connectAssistantDatabase } from "../config/db.js";
import { abandonIncompleteRuns } from "../runtime/run-store.js";

/**
 * 在 Nest 开始监听端口前准备 Runtime 依赖。
 * 任一步失败都会阻止 API 对外提供一个不完整的服务实例。
 */
@Injectable()
export class RuntimeLifecycleService implements OnApplicationBootstrap {
  /**
   * Nest 应用启动时准备 Runtime 依赖。
   * @returns 数据库连接与 Run 清理完成后的 Promise。
   */
  async onApplicationBootstrap(): Promise<void> {
    await connectAssistantDatabase();
    await abandonIncompleteRuns();
  }
}
