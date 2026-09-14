import { BadRequestException, Body, Controller, GoneException, Param, Post } from "@nestjs/common";
import { userInputService } from "./user-input.service.ts";
import { userInputSubmissionSchema, type UserInputBody } from "./user-input.schema.ts";

/** 用户回答入口，旧问题在重启或 Run 结束后返回 410。 */
@Controller("user-input")
export class UserInputController {
  /**
   * 提交选项或自定义回答，不直接执行任何业务工具。
   * @param requestId 提问 ID。
   * @param input 带 Run 身份的结构化回答。
   * @returns 回答已接受标记。
   */
  @Post(":requestId")
  submit(@Param("requestId") requestId: string, @Body() input: UserInputBody): { accepted: true } {
    const parsed = userInputSubmissionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException("回答格式无效");
    const result = userInputService.submit(requestId, parsed.data);
    if (result === "missing") throw new GoneException("问题已失效，请重新发送消息");
    if (result === "invalid") throw new BadRequestException("请完整回答问题，且只能选择提供的选项或允许的自定义内容");
    return { accepted: true };
  }
}
