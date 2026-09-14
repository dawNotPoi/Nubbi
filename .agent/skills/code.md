# 编码约定

## 服务端

**路由** — 普通 JSON API 使用类型化路由注册器，只声明权限、Schema、成功消息和 Controller 调用
```ts
noteRoutes.post('/create', {
  action: 'create',
  body: createNoteBodySchema,
  message: 'create success',
  handler: ({ actor, body }) => createUserNote({ userId: actor.id, input: body }),
});
```

- 注册器固定执行“权限校验 → 获取认证用户 → Zod 解析 → Handler → 统一响应”。
- `body`、`query`、`params` 的类型必须由对应 Zod Schema 自动推导，禁止在业务路由中使用类型断言绕过校验。
- 每个请求部分只解析一次，禁止组合验证中间件后再次调用同一个 Schema 的 `parse()`。
- 文件下载、流式响应、Webhook 等非普通 JSON 接口可以使用原生 Express，但应说明原因。

**校验** — 请求契约使用 Zod，Schema 放在对应路由或模块目录附近
```ts
const schema = z.object({ title: z.string().min(1), content: z.string() });
```

**响应格式**
```ts
res.json({ code: 1, data, message: '' });           // 成功
res.status(400).json({ code: 0, message: '描述' }); // 失败
```

**DB / Env** — 只从内部模块导入，不直接用 `process.env`
```ts
import mongoose from '@/lib/db';
import { env } from '@/lib/env';
```

---

## 客户端

**服务端状态** → TanStack Query
```ts
const { data } = useQuery({ queryKey: ['note', id], queryFn: () => Get('/note', { id }) });
const mutation = useMutation({ mutationFn: (body) => request('/note/create', body) });
```

**UI 状态** → Jotai atom，文件放 `src/store/atom/<module>Atom.ts`
```ts
export const openAtom = atom(false);
```

**API 调用** — 统一用 `src/api/request.ts` 导出的函数
```ts
import { Get, request } from '@/api/request';
if (res.code === 1) { /* 成功 */ }
```

**业务逻辑** — 提取到自定义 hook，组件只做渲染
