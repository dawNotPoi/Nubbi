# 图数据 Schema（graph.json）

`analyze.mjs` 产出的图数据是一个普通 JSON 对象，直接内嵌进 HTML 的 `window.GRAPH`。

## 顶层结构

```jsonc
{
  "kind": "code-map",
  "target": "/abs/path",          // 被分析目录的绝对路径
  "targetName": "assistant",      // 展示用名称
  "generatedAt": "ISO 时间",
  "stats": {
    "dirCount": 12,
    "fileCount": 120,
    "functionCount": 800,
    "callCount": 2400,
    "elapsedMs": 123
  },
  "dirs": [ /* Dir 节点 */ ],
  "files": [ /* File 节点 */ ],
  "functions": [ /* Function 节点 */ ],
  "diagnostics": {
    "hasTsconfig": true,
    "aliases": ["@/*"]
  }
}
```

## 节点类型

### Dir（目录 / 模块）

```jsonc
{
  "type": "dir",
  "id": "d:src/modules",        // 根目录为 d:<root>
  "name": "modules",
  "path": "/abs/path/src/modules",
  "relPath": "src/modules",
  "parentId": "d:src",
  "childrenDirs": ["d:src/modules/chat"],
  "childrenFiles": ["f:src/modules/chat.controller.ts"],
  "stats": { "files": 3, "functions": 21 }   // 递归统计
}
```

### File（文件）

```jsonc
{
  "type": "file",
  "id": "f:src/modules/chat/chat.controller.ts",
  "dirId": "d:src/modules/chat",
  "name": "chat.controller.ts",
  "relPath": "src/modules/chat/chat.controller.ts",
  "path": "/abs/path/...",
  "imports": ["f:src/modules/chat/chat.service.ts"],  // 本项目内 import 目标（去重）
  "exportNames": ["ChatController"],
  "functions": ["fn:...#ChatController.handle#1"]
}
```

### Function（函数 / 方法 / 组件）

```jsonc
{
  "type": "fn",
  "id": "fn:src/.../chat.service.ts#send#3",
  "fileId": "f:src/.../chat.service.ts",
  "fileRel": "src/.../chat.service.ts",
  "name": "send",
  "kind": "function | arrow | method | component",
  "className": "ChatService",            // method 才有
  "signature": {
    "params": [
      { "name": "text", "type": "string", "optional": false, "default": null }
    ],
    "returnType": "Promise<void>"
  },
  "props": [ { "name": "user", "type": "User", "optional": false } ],  // 组件才有
  "calls": [
    { "target": "fn:...#validate#2", "args": ["message.text"] },  // 解析到本项目函数
    { "external": "fs.writeFileSync", "args": ["path", "data"] }  // 无法解析的外部调用
  ],
  "exported": true,
  "defaultExport": false
}
```

## 调用边说明

- `calls[].target`：指向 `functions[].id`，表示静态可解析的调用（本地函数、类内 `this.xxx`、具名导入、命名空间导入、`this.service.method` 类方法）。
- `calls[].args`：调用点实参的源码文本（如 `message.text`、`"foo"`），配合 `signature.params` 即可还原「数据从哪个实参流入哪个形参」。
- `calls[].external`：无法静态解析的调用（动态访问、装饰器/DI 装配、外部库），仅记录名字。

## 解析边界

- 目录层的依赖边由渲染端聚合：某目录下任意文件 import 了另一目录下任意文件，即形成一条边，数量为条数。
- 路径别名仅从 `<目标目录>/tsconfig.json` 的 `paths` 读取；找不到 tsconfig 时 `@/` 等别名不解析。
- re-export（`export * from`）链暂不追踪；`export { foo }` 转发不参与函数索引。
- 嵌套函数体内的调用归属外层函数（PoC 简化），大文件里会略有偏差。
