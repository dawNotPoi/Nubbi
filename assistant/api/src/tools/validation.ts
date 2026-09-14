import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation";
import type { ToolArguments, ToolDefinition } from "./tool-contracts.ts";

const schemaValidator = new AjvJsonSchemaValidator();
/**
 * 校验工具参数；解析失败的输入不会进入 Schema 校验或执行。
 * @param definition 工具声明。
 * @param input 解码后的参数。
 * @returns 错误描述，通过时为 null。
 */
export function validateToolInput(definition: ToolDefinition, input: ToolArguments): string | null {
  if (!input.valid) return input.error;
  try {
    const validate = schemaValidator.getValidator<Record<string, unknown>>(definition.inputSchema as JsonSchemaType);
    const result = validate(input.value);
    return result.valid ? null : result.errorMessage;
  } catch (error) {
    return error instanceof Error ? error.message : "工具参数 Schema 无法解析";
  }
}
