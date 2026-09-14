# 编码约定

## 服务端

**路由** — 只做参数校验 + 转发，不写业务逻辑
```ts
router.post('/note', validate(schema), noteController.create);
```

**校验** — 用 `validate` / `validateQuery` / `validateParams` + Zod
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
