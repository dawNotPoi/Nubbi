import type {
  AuthRequest,
  RequestAuthContext,
} from "@/middleware/common";
import { asyncHandler } from "@/middleware/common";
import { successResponse } from "@/routes/utils";
import type { RequestHandler, Router } from "express";
import type { IncomingHttpHeaders } from "node:http";
import { z } from "zod";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
type RequestLocation = "body" | "query" | "params";
type OptionalSchema = z.ZodTypeAny | undefined;
type SchemaOutput<Schema extends OptionalSchema> =
  Schema extends z.ZodTypeAny ? z.output<Schema> : undefined;

const VALIDATION_MESSAGES: Record<RequestLocation, string> = {
  body: "数据验证失败",
  query: "查询参数验证失败",
  params: "路径参数验证失败",
};

class RouteValidationError extends Error {
  constructor(
    readonly location: RequestLocation,
    readonly errors: Array<{ field: string; message: string }>,
  ) {
    super(VALIDATION_MESSAGES[location]);
  }
}

const parseRequestPart = <Schema extends OptionalSchema>(
  schema: Schema | undefined,
  value: unknown,
  location: RequestLocation,
): SchemaOutput<Schema> => {
  if (!schema) return undefined as SchemaOutput<Schema>;

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new RouteValidationError(
      location,
      result.error.errors.map((error) => ({
        field: error.path.join("."),
        message: error.message,
      })),
    );
  }

  return result.data as SchemaOutput<Schema>;
};

export type JsonRouteConfig<
  Action extends string,
  Actor,
  BodySchema extends OptionalSchema = undefined,
  QuerySchema extends OptionalSchema = undefined,
  ParamsSchema extends OptionalSchema = undefined,
  Result = unknown,
> = {
  action: Action;
  body?: BodySchema;
  query?: QuerySchema;
  params?: ParamsSchema;
  beforeAuthorization?: RequestHandler[];
  message?: string;
  handler: (context: {
    actor: Actor;
    body: SchemaOutput<BodySchema>;
    query: SchemaOutput<QuerySchema>;
    params: SchemaOutput<ParamsSchema>;
    authContext?: RequestAuthContext;
    headers: IncomingHttpHeaders;
  }) => Result | Promise<Result>;
};

type RegisterJsonRoute<Action extends string, Actor> = <
  BodySchema extends OptionalSchema = undefined,
  QuerySchema extends OptionalSchema = undefined,
  ParamsSchema extends OptionalSchema = undefined,
  Result = unknown,
>(
  path: string,
  config: JsonRouteConfig<
    Action,
    Actor,
    BodySchema,
    QuerySchema,
    ParamsSchema,
    Result
  >,
) => void;

export type JsonRouteRegistrar<Action extends string, Actor> = Record<
  HttpMethod,
  RegisterJsonRoute<Action, Actor>
>;

/**
 * 创建类型安全的 JSON 路由注册器。
 * 固定执行权限校验、身份解析、Zod 参数解析、业务处理和统一成功响应。
 */
export const createJsonRouteRegistrar = <Action extends string, Actor>(
  router: Router,
  options: {
    authorize: (action: Action) => RequestHandler;
    resolveActor: (req: AuthRequest) => Actor;
  },
): JsonRouteRegistrar<Action, Actor> => {
  const register = <
    BodySchema extends OptionalSchema = undefined,
    QuerySchema extends OptionalSchema = undefined,
    ParamsSchema extends OptionalSchema = undefined,
    Result = unknown,
  >(
    method: HttpMethod,
    path: string,
    config: JsonRouteConfig<
      Action,
      Actor,
      BodySchema,
      QuerySchema,
      ParamsSchema,
      Result
    >,
  ): void => {
    const handlers: RequestHandler[] = [
      ...(config.beforeAuthorization ?? []),
      options.authorize(config.action),
      asyncHandler(async (req, res) => {
        try {
          const data = await config.handler({
            actor: options.resolveActor(req),
            body: parseRequestPart<BodySchema>(config.body, req.body, "body"),
            query: parseRequestPart<QuerySchema>(
              config.query,
              req.query,
              "query",
            ),
            params: parseRequestPart<ParamsSchema>(
              config.params,
              req.params,
              "params",
            ),
            authContext: req.authContext,
            headers: req.headers,
          });
          successResponse(res, data, config.message);
        } catch (error) {
          if (error instanceof RouteValidationError) {
            res.status(400).json({
              code: 0,
              message: error.message,
              errors: error.errors,
            });
            return;
          }
          throw error;
        }
      }),
    ];

    switch (method) {
      case "get":
        router.get(path, ...handlers);
        break;
      case "post":
        router.post(path, ...handlers);
        break;
      case "put":
        router.put(path, ...handlers);
        break;
      case "patch":
        router.patch(path, ...handlers);
        break;
      case "delete":
        router.delete(path, ...handlers);
        break;
    }
  };

  const registrar: JsonRouteRegistrar<Action, Actor> = {
    get: (path, config) => register("get", path, config),
    post: (path, config) => register("post", path, config),
    put: (path, config) => register("put", path, config),
    patch: (path, config) => register("patch", path, config),
    delete: (path, config) => register("delete", path, config),
  };

  return registrar;
};

export const createPublicJsonRouteRegistrar = <Action extends string>(
  router: Router,
): JsonRouteRegistrar<Action, undefined> =>
  createJsonRouteRegistrar<Action, undefined>(router, {
    authorize: () => (_req, _res, next) => next(),
    resolveActor: () => undefined,
  });
