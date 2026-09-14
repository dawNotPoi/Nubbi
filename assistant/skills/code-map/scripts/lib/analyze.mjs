/**
 * 代码结构分析器：用 ts-morph 解析目标项目，产出树形模块 + 文件 import 依赖 + 函数调用关系。
 *
 * 输出的图数据结构见 references/schema.md。
 */
import * as tsMorph from 'ts-morph';
import { ts } from '@ts-morph/common';
import fs from 'node:fs';
import path from 'node:path';

const { Project, SyntaxKind } = tsMorph;

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', '.expo', 'coverage', '.git',
  '.tmp', '.turbo', '.cache', 'out', '.output', '.vite', '.idea',
]);
const CANDIDATE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.d.ts'];
const INDEX_FILES = ['index.ts', 'index.tsx', 'index.js', 'index.jsx', 'index.mjs'];

/** 统一为 posix 风格相对路径，便于在 JSON 与 HTML 中展示。 */
function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** 递归收集源码文件，跳过忽略目录。 */
function collectSourceFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (IGNORE_DIRS.has(ent.name)) continue;
        walk(p);
      } else if (ent.isFile() && SOURCE_EXT.has(path.extname(ent.name))) {
        out.push(p);
      }
    }
  };
  walk(root);
  return out;
}

/** 读取 tsconfig 的 baseUrl 与 paths 别名。 */
function readTsconfigAliases(root) {
  const tsconfigPath = path.join(root, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return { baseUrl: null, aliases: [] };
  try {
    const raw = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    const compilerOptions = raw.compilerOptions || {};
    const baseUrl = compilerOptions.baseUrl ? path.resolve(root, compilerOptions.baseUrl) : root;
    const paths = compilerOptions.paths || {};
    const aliases = Object.entries(paths).map(([key, targets]) => ({
      prefix: key.endsWith('/*') ? key.slice(0, -2) : key,
      wildcard: key.endsWith('/*'),
      targets: targets.map((t) => t),
    }));
    return { baseUrl, aliases };
  } catch {
    return { baseUrl: null, aliases: [] };
  }
}

/** 按扩展名 / index 文件补全候选路径，存在则返回第一个命中。 */
function resolveCandidates(base) {
  if (SOURCE_EXT.has(path.extname(base))) {
    return fs.existsSync(base) ? base : null;
  }
  for (const ext of CANDIDATE_EXTS) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  for (const idx of INDEX_FILES) {
    if (fs.existsSync(path.join(base, idx))) return path.join(base, idx);
  }
  return null;
}

/**
 * 尝试把 import 说明符解析成绝对文件路径。
 * @returns {string|null} 绝对路径，无法解析返回 null。
 */
function resolveImport(root, fromFile, specifier, aliasCfg) {
  // 处理别名（@/、~）
  if (aliasCfg.aliases.length) {
    for (const a of aliasCfg.aliases) {
      const hit = a.wildcard
        ? specifier === a.prefix || specifier.startsWith(a.prefix + '/')
        : specifier === a.prefix;
      if (hit) {
        const rest = a.wildcard ? specifier.slice(a.prefix.length + 1) : '';
        for (const t of a.targets) {
          const tBase = t.endsWith('/*') ? t.slice(0, -2) : t;
          const p = path.resolve(aliasCfg.baseUrl || root, tBase, rest);
          const cand = resolveCandidates(p);
          if (cand) return cand;
        }
      }
    }
  }
  // 相对路径
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const base = path.resolve(path.dirname(fromFile), specifier);
    const cand = resolveCandidates(base);
    if (cand) return cand;
    // NodeNext 风格：源码里写 ./x.js 但实际是 ./x.ts
    if (base.endsWith('.js')) {
      const t = base.slice(0, -3) + '.ts';
      const cand = resolveCandidates(t);
      if (cand) return cand;
    }
    return null;
  }
  return null;
}

/**
 * 主入口：分析目标目录。
 * @param {string} targetDir 目标目录。
 * @param {{limit?:number}} opts 预留参数。
 * @returns {object} 图数据（dirs / files / functions）。
 */
export function analyze(targetDir, opts = {}) {
  const root = path.resolve(targetDir);
  const start = Date.now();

  // 收集源码文件并建立 ts-morph Project
  const sourceFiles = collectSourceFiles(root);
  const tsconfigPath = path.join(root, 'tsconfig.json');
  const hasTsconfig = fs.existsSync(tsconfigPath);
  const aliasCfg = readTsconfigAliases(root);

  const project = hasTsconfig
    ? new Project({ tsConfigFilePath: tsconfigPath, skipAddingFilesFromTsConfig: true })
    : new Project({
        compilerOptions: {
          target: ts.ScriptTarget.ESNext,
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          jsx: ts.JsxEmit.ReactJSX,
          allowJs: true,
          strict: false,
          skipLibCheck: true,
          noEmit: true,
        },
      });

  const sourceFileMap = new Map(); // absPath → ts-morph SourceFile
  for (const file of sourceFiles) {
    try {
      sourceFileMap.set(file, project.addSourceFileAtPath(file));
    } catch {
      /* 无法解析的文件忽略 */
    }
  }

  // ---- 目录树 ----
  const dirs = [];
  const dirById = new Map(); // absPath → dirNode
  const dirNodeById = new Map(); // dirId → dirNode
  const fileNodes = [];
  const fileById = new Map(); // absPath → fileNode
  const fileNodeById = new Map(); // fileId → fileNode
  const fileIdSet = new Set();

  const relOf = (abs) => toPosix(path.relative(root, abs));

  const ensureDir = (absPath) => {
    if (dirById.has(absPath)) return dirById.get(absPath);
    let node;
    if (absPath === root) {
      node = {
        type: 'dir',
        id: 'd:<root>',
        name: path.basename(root) || root,
        path: absPath,
        relPath: '',
        parentId: null,
        childrenDirs: [],
        childrenFiles: [],
        stats: { files: 0, functions: 0 },
      };
    } else {
      const parent = ensureDir(path.dirname(absPath));
      node = {
        type: 'dir',
        id: `d:${relOf(absPath)}`,
        name: path.basename(absPath),
        path: absPath,
        relPath: relOf(absPath),
        parentId: parent.id,
        childrenDirs: [],
        childrenFiles: [],
        stats: { files: 0, functions: 0 },
      };
      parent.childrenDirs.push(node.id);
    }
    dirById.set(absPath, node);
    dirNodeById.set(node.id, node);
    dirs.push(node);
    return node;
  };

  for (const abs of sourceFiles) {
    const parent = ensureDir(path.dirname(abs));
    const id = `f:${relOf(abs)}`;
    const node = {
      type: 'file',
      id,
      dirId: parent.id,
      dirNode: parent,
      name: path.basename(abs),
      relPath: relOf(abs),
      path: abs,
      imports: [],
      exportNames: [],
      functions: [],
    };
    parent.childrenFiles.push(id);
    fileNodes.push(node);
    fileById.set(abs, node);
    fileNodeById.set(id, node);
    fileIdSet.add(id);
  }

  // ---- 提取函数 / 类 / 导出 ----
  let fnCounter = 0;
  const functions = [];
  const fnById = new Map();
  const exportedFnIndex = new Map(); // fileId → Map<exportName, fnNode>
  const defaultExportIndex = new Map(); // fileId → fnNode
  const classIndex = new Map(); // fileId → Map<className, { methods: Map<name, fnNode> }>
  const localSymbolsByFile = new Map(); // fileId → Map<name, fnNode | {kind:'class'}>
  const fileFnNodes = new Map(); // fileId → fnNode[]

  /** 生成一个函数节点 id（带计数器避免同名冲突）。 */
  const makeFnId = (fileRel, name) => {
    fnCounter++;
    return `fn:${fileRel}#${name}#${fnCounter}`;
  };

  /** 从 ts-morph 参数节点提取签名。 */
  const extractSignature = (fn) => {
    const params = fn.getParameters().map((p) => ({
      name: p.getName(),
      type: (() => {
        const typeNode = p.getTypeNode();
        if (typeNode) return typeNode.getText();
        try {
          return p.getType().getText();
        } catch {
          return 'any';
        }
      })(),
      optional: p.isOptional(),
      default: p.getInitializer()?.getText() ?? null,
    }));
    let returnType = 'void';
    try {
      returnType = fn.getReturnTypeNode()?.getText() ?? fn.getReturnType().getText();
    } catch {
      /* 类型推断失败时保留 void */
    }
    return { params, returnType };
  };

  /** 组件 props 提取：优先读 Props 接口/类型别名，其次内联对象类型。 */
  const extractProps = (fn) => {
    const first = fn.getParameters()[0];
    if (!first) return [];
    const typeNode = first.getTypeNode();
    if (!typeNode) return [];
    const readProps = (tNode) => {
      try {
        return tNode.getProperties().map((prop) => ({
          name: prop.getName(),
          type: prop.getTypeNode()?.getText() ?? prop.getType().getText(),
          optional: typeof prop.isOptional === 'function' ? prop.isOptional() : false,
        }));
      } catch {
        return [];
      }
    };
    if (typeNode.isKind(SyntaxKind.TypeReference)) {
      const typeName = typeNode.getTypeName().getText();
      const sf = first.getSourceFile();
      const iface = sf.getInterface(typeName);
      if (iface) return readProps(iface);
      const tAlias = sf.getTypeAlias(typeName);
      if (tAlias) {
        const t = tAlias.getTypeNode();
        if (t && t.isKind(SyntaxKind.TypeLiteral)) return readProps(t);
      }
    } else if (typeNode.isKind(SyntaxKind.TypeLiteral)) {
      return readProps(typeNode);
    }
    return [];
  };

  /** 是否看起来像 React 组件（大写开头或返回 JSX）。 */
  const looksLikeComponent = (node, name) => {
    if (name && /^[A-Z]/.test(name)) return true;
    try {
      return node.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0
        || node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;
    } catch {
      return false;
    }
  };

  for (const fileNode of fileNodes) {
    const sf = sourceFileMap.get(fileNode.path);
    if (!sf) continue;
    const localSymbols = new Map();
    localSymbolsByFile.set(fileNode.id, localSymbols);
    const fileFns = [];
    fileFnNodes.set(fileNode.id, fileFns);
    const exported = exportedFnIndex.get(fileNode.id) ?? new Map();
    exportedFnIndex.set(fileNode.id, exported);

    const registerFn = (name, kind, tsNode, className, isExported, isDefault) => {
      const id = makeFnId(fileNode.relPath, name);
      const node = {
        type: 'fn',
        id,
        fileId: fileNode.id,
        fileRel: fileNode.relPath,
        name,
        kind,
        className: className ?? null,
        signature: extractSignature(tsNode),
        props: kind === 'component' ? extractProps(tsNode) : [],
        calls: [],
        exported: isExported,
        defaultExport: isDefault,
      };
      functions.push(node);
      fnById.set(id, node);
      fileFns.push(node);
      fileNode.functions.push(id);
      fileNode.dirNode.stats.functions++;

      if (kind === 'method') {
        localSymbols.set(`${className}.${name}`, node);
        localSymbols.set(name, node);
      } else {
        localSymbols.set(name, node);
      }
      if (isDefault) defaultExportIndex.set(fileNode.id, node);
      if (isExported) {
        exported.set(name, node);
        if (!fileNode.exportNames.includes(name)) fileNode.exportNames.push(name);
      }
      // 临时挂载 ts-morph 节点，供调用点提取使用，最后统一清理
      node._tsNode = tsNode;
      return node;
    };

    // 函数声明
    for (const fn of sf.getFunctions()) {
      const name = fn.getName();
      if (!name) continue;
      const kind = looksLikeComponent(fn, name) ? 'component' : 'function';
      registerFn(name, kind, fn, null, fn.isExported(), fn.isDefaultExport());
    }

    // const/let/var 箭头函数
    for (const vd of sf.getVariableStatements()) {
      for (const decl of vd.getDeclarations()) {
        const name = decl.getName();
        if (!name) continue;
        const init = decl.getInitializer();
        if (!init) continue;
        if (init.isKind(SyntaxKind.ArrowFunction) || init.isKind(SyntaxKind.FunctionExpression)) {
          const kind = looksLikeComponent(init, name) ? 'component' : 'arrow';
          const exportedFlag = decl.isExported() || vd.isExported();
          registerFn(name, kind, init, null, exportedFlag, decl.isDefaultExport());
        }
      }
    }

    // 类及其方法
    const classMap = classIndex.get(fileNode.id) ?? new Map();
    classIndex.set(fileNode.id, classMap);
    for (const cls of sf.getClasses()) {
      const clsName = cls.getName();
      if (!clsName) continue;
      const methods = new Map();
      for (const member of cls.getMembers()) {
        if (
          member.isKind(SyntaxKind.MethodDeclaration)
          || member.isKind(SyntaxKind.GetAccessorDeclaration)
          || member.isKind(SyntaxKind.SetAccessorDeclaration)
        ) {
          const mName = member.getName();
          const kind = looksLikeComponent(member, mName) ? 'component' : 'method';
          const node = registerFn(mName, kind, member, clsName, cls.isExported(), false);
          methods.set(mName, node);
        }
      }
      localSymbols.set(clsName, { kind: 'class', methods, name: clsName });
      if (cls.isExported()) {
        classMap.set(clsName, { methods });
      }
    }
  }

  // ---- 第二阶段：跨文件符号索引 ----
  const importedFnsByFile = new Map(); // fileId → Map<alias, fnNode>
  const importedClassesByFile = new Map(); // fileId → Map<alias, {className, methods}>
  const importedNamespacesByFile = new Map(); // fileId → Map<alias, fileId>

  for (const fileNode of fileNodes) {
    const sf = sourceFileMap.get(fileNode.path);
    if (!sf) continue;
    const importedFns = new Map();
    const importedClasses = new Map();
    const importedNamespaces = new Map();
    const importTargets = new Set();
    importedFnsByFile.set(fileNode.id, importedFns);
    importedClassesByFile.set(fileNode.id, importedClasses);
    importedNamespacesByFile.set(fileNode.id, importedNamespaces);

    for (const imp of sf.getImportDeclarations()) {
      const spec = imp.getModuleSpecifierValue();
      const resolved = resolveImport(root, fileNode.path, spec, aliasCfg);
      if (!resolved) continue;
      const targetFile = fileById.get(resolved);
      if (!targetFile) continue;
      importTargets.add(targetFile.id);

      // 具名导入
      for (const named of imp.getNamedImports()) {
        const exportedName = named.getName();
        const alias = named.getAliasNode()?.getText() ?? exportedName;
        const fn = exportedFnIndex.get(targetFile.id)?.get(exportedName);
        if (fn) importedFns.set(alias, fn);
        const cls = classIndex.get(targetFile.id)?.get(exportedName);
        if (cls) importedClasses.set(alias, cls);
      }
      // 默认导入
      const defaultSpec = imp.getDefaultImport();
      if (defaultSpec) {
        const alias = defaultSpec.getText();
        const defFn = defaultExportIndex.get(targetFile.id);
        if (defFn) importedFns.set(alias, defFn);
      }
      // 命名空间导入：import * as lib from './x'
      const nsImport = imp.getNamespaceImport();
      if (nsImport) {
        importedNamespaces.set(nsImport.getText(), targetFile.id);
      }
    }
    fileNode.imports = [...importTargets];
  }

  // ---- 第三阶段：提取每个函数的调用点 ----
  const ctxOf = (fileId) => ({
    localSymbols: localSymbolsByFile.get(fileId) ?? new Map(),
    importedFns: importedFnsByFile.get(fileId) ?? new Map(),
    importedClasses: importedClassesByFile.get(fileId) ?? new Map(),
    importedNamespaces: importedNamespacesByFile.get(fileId) ?? new Map(),
    exportedFnIndex,
  });

  /** 压缩超长文本（折叠空白、截断）。 */
  const shortText = (s, max = 80) => {
    const t = String(s ?? '').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
  };

  const resolveCallTarget = (expr, className, ctx) => {
    const { localSymbols, importedFns, importedClasses, importedNamespaces } = ctx;
    if (expr.isKind(SyntaxKind.Identifier)) {
      const name = expr.getText();
      const local = localSymbols.get(name);
      if (local && local.kind !== 'class') return { target: local.id };
      const imp = importedFns.get(name);
      if (imp) return { target: imp.id };
      return { external: name };
    }
    if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
      const propName = expr.getName();
      const obj = expr.getExpression();
      if (obj.isKind(SyntaxKind.ThisKeyword)) {
        const key = className ? `${className}.${propName}` : propName;
        const local = localSymbols.get(key) ?? localSymbols.get(propName);
        if (local && local.kind !== 'class') return { target: local.id };
        return { external: `this.${propName}` };
      }
      if (obj.isKind(SyntaxKind.Identifier)) {
        const objName = obj.getText();
        const ns = importedNamespaces.get(objName);
        if (ns) {
          const fn = exportedFnIndex.get(ns)?.get(propName);
          if (fn) return { target: fn.id };
          return { external: `${objName}.${propName}` };
        }
        const cls = importedClasses.get(objName);
        if (cls) {
          const m = cls.methods.get(propName);
          if (m) return { target: m.id };
          return { external: `${objName}.${propName}` };
        }
        return { external: `${objName}.${propName}` };
      }
      return { external: expr.getText() };
    }
    return { external: expr.getText() };
  };

  for (const fn of functions) {
    const tsFn = fn._tsNode;
    if (!tsFn) continue;
    const body = tsFn.getBody();
    if (!body) continue;
    const ctx = ctxOf(fn.fileId);
    const calls = [];
    const visit = (node) => {
      // 跳过嵌套函数体（其中的调用归属内层函数，不属于当前函数）
      if (
        node !== tsFn
        && (node.isKind(SyntaxKind.ArrowFunction)
          || node.isKind(SyntaxKind.FunctionExpression)
          || node.isKind(SyntaxKind.FunctionDeclaration))
      ) {
        return;
      }
      if (node.isKind(SyntaxKind.CallExpression) || node.isKind(SyntaxKind.NewExpression)) {
        const expr = node.getExpression();
        const args = node.getArguments().map((a) => {
          // 回调函数直接标注，避免把整段函数源码塞进图数据
          if (
            a.isKind(SyntaxKind.ArrowFunction)
            || a.isKind(SyntaxKind.FunctionExpression)
            || a.isKind(SyntaxKind.FunctionDeclaration)
          ) {
            return '[函数]';
          }
          return shortText(a.getText(), 60);
        });
        const res = resolveCallTarget(expr, fn.className, ctx);
        if (res.external) res.external = shortText(res.external, 80);
        calls.push({ ...res, args });
      }
      for (const child of node.getChildren()) visit(child);
    };
    visit(body);
    fn.calls = calls;
  }

  // 清理临时挂载
  for (const fn of functions) delete fn._tsNode;

  // ---- 目录统计（递归） ----
  const computeDirStats = (dirNode) => {
    let files = dirNode.childrenFiles.length;
    let funcs = 0;
    for (const fid of dirNode.childrenFiles) {
      const f = fileNodeById.get(fid);
      if (f) funcs += f.functions.length;
    }
    for (const cid of dirNode.childrenDirs) {
      const c = dirNodeById.get(cid);
      if (!c) continue;
      const sub = computeDirStats(c);
      files += sub.files;
      funcs += sub.functions;
    }
    dirNode.stats = { files, functions: funcs };
    return dirNode.stats;
  };
  for (const d of dirs) if (d.parentId === null) computeDirStats(d);

  const graph = {
    kind: 'code-map',
    target: root,
    targetName: path.basename(root) || root,
    generatedAt: new Date().toISOString(),
    stats: {
      dirCount: dirs.length,
      fileCount: fileNodes.length,
      functionCount: functions.length,
      callCount: functions.reduce((acc, f) => acc + f.calls.length, 0),
      elapsedMs: Date.now() - start,
    },
    dirs,
    files: fileNodes,
    functions,
    diagnostics: {
      hasTsconfig,
      aliases: aliasCfg.aliases.map((a) => `${a.prefix}${a.wildcard ? '/*' : ''}`),
    },
  };

  return graph;
}
