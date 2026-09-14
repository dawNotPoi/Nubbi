/**
 * 浏览器端渲染器：读取 window.GRAPH（由 analyze 产出的图数据），
 * 渲染「目录 → 文件 → 函数调用」的可点击下钻视图。
 * 本文件以纯字符串注入 HTML，注意避免出现 <\/script>（当前文件内不允许出现该字面量）。
 */
(function () {
  'use strict';

  var G = window.GRAPH;
  if (!G) {
    document.body.innerHTML = '<p style="padding:40px;color:#c00">缺少图数据（window.GRAPH）。</p>';
    return;
  }

  // ---- 索引 ----
  var dirById = {};
  var fileById = {};
  var fnById = {};
  G.dirs.forEach(function (d) { dirById[d.id] = d; });
  G.files.forEach(function (f) { fileById[f.id] = f; });
  G.functions.forEach(function (fn) { fnById[fn.id] = fn; });

  // 全局调用者索引：fnId → [{caller, args}]
  var callersIndex = {};
  G.functions.forEach(function (fn) {
    (fn.calls || []).forEach(function (c) {
      if (c.target && fnById[c.target]) {
        if (!callersIndex[c.target]) callersIndex[c.target] = [];
        callersIndex[c.target].push({ caller: fn.id, args: c.args || [] });
      }
    });
  });

  // 目录后代文件集（用于目录层依赖聚合）
  var descendantsCache = {};
  function descendantsOf(dirId) {
    if (descendantsCache[dirId]) return descendantsCache[dirId];
    var d = dirById[dirId];
    var set = new Set();
    (d.childrenFiles || []).forEach(function (fid) { set.add(fid); });
    (d.childrenDirs || []).forEach(function (cid) {
      descendantsOf(cid).forEach(function (f) { set.add(f); });
    });
    descendantsCache[dirId] = set;
    return set;
  }

  // 目录内子节点之间的 import 依赖边
  function dirEdges(dirId) {
    var d = dirById[dirId];
    var children = (d.childrenDirs || []).concat(d.childrenFiles || []);
    var childSet = new Set(children);
    var fileToChild = {};
    children.forEach(function (cid) {
      if (fileById[cid]) {
        fileToChild[cid] = cid;
      } else {
        descendantsOf(cid).forEach(function (f) { fileToChild[f] = cid; });
      }
    });
    var edgeMap = {};
    children.forEach(function (cid) {
      var files = fileById[cid] ? [cid] : Array.from(descendantsOf(cid));
      files.forEach(function (f) {
        var file = fileById[f];
        if (!file) return;
        (file.imports || []).forEach(function (imp) {
          var dst = fileToChild[imp];
          if (dst && dst !== cid && childSet.has(dst)) {
            var key = cid + '|' + dst;
            edgeMap[key] = (edgeMap[key] || 0) + 1;
          }
        });
      });
    });
    return Object.keys(edgeMap).map(function (key) {
      var parts = key.split('|');
      return { src: parts[0], dst: parts[1], count: edgeMap[key] };
    });
  }

  // ---- 布局 ----
  function gridLayout(n, cardW, cardH, gapX, gapY, maxCols) {
    var cols = Math.min(maxCols, Math.max(1, Math.ceil(Math.sqrt(n * (cardH / cardW)))));
    var rows = Math.ceil(n / cols);
    var positions = [];
    for (var i = 0; i < n; i++) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      positions.push({ x: col * (cardW + gapX), y: row * (cardH + gapY) });
    }
    return {
      positions: positions,
      width: cols * cardW + (cols - 1) * gapX,
      height: rows * cardH + (rows - 1) * gapY,
    };
  }

  // 有向无环分层布局（函数调用图）
  function layeredLayout(nodes, edges, cardW, cardH, gapX, gapY) {
    var adj = {};
    var indeg = {};
    nodes.forEach(function (n) { adj[n.id] = []; indeg[n.id] = 0; });
    var present = new Set(nodes.map(function (n) { return n.id; }));
    edges.forEach(function (e) {
      if (!present.has(e.src) || !present.has(e.dst) || e.src === e.dst) return;
      adj[e.src].push(e.dst);
      indeg[e.dst]++;
    });
    var layer = {};
    var queue = [];
    nodes.forEach(function (n) {
      if (indeg[n.id] === 0) { layer[n.id] = 0; queue.push(n.id); }
    });
    while (queue.length) {
      var u = queue.shift();
      var lu = layer[u] == null ? 0 : layer[u];
      adj[u].forEach(function (v) {
        layer[v] = Math.max(layer[v] == null ? 0 : layer[v], lu + 1);
        indeg[v]--;
        if (indeg[v] === 0) queue.push(v);
      });
    }
    nodes.forEach(function (n) { if (layer[n.id] == null) layer[n.id] = 0; });
    var groups = {};
    nodes.forEach(function (n) {
      var l = layer[n.id];
      (groups[l] = groups[l] || []).push(n.id);
    });
    var maxLayer = 0;
    Object.keys(groups).forEach(function (k) { if (+k > maxLayer) maxLayer = +k; });
    var positions = {};
    Object.keys(groups).forEach(function (l) {
      groups[l].forEach(function (id, i) {
        positions[id] = { x: +l * (cardW + gapX), y: i * (cardH + gapY) };
      });
    });
    var height = 0;
    Object.keys(groups).forEach(function (l) {
      var h = groups[l].length * (cardH + gapY);
      if (h > height) height = h;
    });
    return {
      positions: positions,
      width: (maxLayer + 1) * (cardW + gapX),
      height: height,
    };
  }

  // ---- DOM 工具 ----
  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function shortFile(rel) {
    // 展示相对路径，去掉文件名只留目录+文件名，足够短
    return rel;
  }

  // ---- 视图状态 ----
  var view = { type: 'dir', id: 'd:<root>', highlight: null };

  // ---- 颜色 ----
  var KIND_COLOR = {
    function: '#2563eb',
    arrow: '#0d9488',
    method: '#7c3aed',
    component: '#ea580c',
  };
  var KIND_LABEL = {
    function: '函数',
    arrow: '箭头函数',
    method: '方法',
    component: '组件',
  };

  // ---- 卡片渲染 ----
  var CARD_W = 210;
  var CARD_H = 84;

  function cardInner(node) {
    if (node.type === 'dir') {
      return '<div class="card-ico dir">&#128193;</div>'
        + '<div class="card-title">' + esc(node.name) + '</div>'
        + '<div class="card-sub">' + node.stats.files + ' 文件 · ' + node.stats.functions + ' 函数</div>';
    }
    if (node.type === 'file') {
      return '<div class="card-ico file">&#128196;</div>'
        + '<div class="card-title">' + esc(node.name) + '</div>'
        + '<div class="card-sub">' + node.functions.length + ' 函数 · ' + esc(shortFile(node.relPath)) + '</div>';
    }
    if (node.kind === 'external') {
      var tf = fnById[node.targetFnId];
      return '<div class="card-ico ext">&#128279;</div>'
        + '<div class="card-title">' + esc(tf ? tf.name : '?') + '</div>'
        + '<div class="card-sub">' + esc(tf ? tf.fileRel : '') + '</div>'
        + '<div class="card-tag">外部 ' + node.count + '</div>';
    }
    // 本地函数
    var color = KIND_COLOR[node.kind] || '#64748b';
    var paramsText = node.signature.params.map(function (p) {
      return p.name + (p.optional ? '?' : '') + (p.type && p.type !== 'any' ? ': ' + p.type : '');
    }).join(', ');
    return '<div class="card-ico fn" style="background:' + color + '">' + esc(node.name[0] || 'f') + '</div>'
      + '<div class="card-title">' + esc(node.name) + '</div>'
      + '<div class="card-sub">' + esc(KIND_LABEL[node.kind] || node.kind)
      + (node.className ? ' · ' + esc(node.className) : '') + '</div>'
      + '<div class="card-params">(' + esc(paramsText) + ')</div>';
  }

  // ---- 画布 ----
  var svgNS = 'http://www.w3.org/2000/svg';

  function makeSvg(w, h) {
    var s = document.createElementNS(svgNS, 'svg');
    s.setAttribute('width', w);
    s.setAttribute('height', h);
    s.setAttribute('class', 'edge-layer');
    return s;
  }

  function drawEdge(svg, x1, y1, x2, y2, label, color, dashed) {
    var path = document.createElementNS(svgNS, 'path');
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    // 缩短路径末端，避免箭头被卡片遮住
    var sx = x1 + ux * 8, sy = y1 + uy * 8;
    var ex = x2 - ux * 18, ey = y2 - uy * 18;
    var cx1 = sx + ux * 40, cy1 = sy + uy * 40;
    var d = 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) + ' C' + cx1.toFixed(1) + ',' + cy1.toFixed(1) + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1) + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1);
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color || '#94a3b8');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('marker-end', 'url(#arrow)');
    if (dashed) path.setAttribute('stroke-dasharray', '5,4');
    svg.appendChild(path);
    if (label) {
      var mx = (sx + ex) / 2, my = (sy + ey) / 2;
      var text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', mx);
      text.setAttribute('y', my - 4);
      text.setAttribute('class', 'edge-label');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = String(label);
      svg.appendChild(text);
    }
  }

  function clearCanvas() {
    var canvas = $('#canvas');
    canvas.innerHTML = '';
  }

  function renderCards(cards, posById, pad, onCardClick) {
    var canvas = $('#canvas');
    Object.keys(posById).forEach(function (id) {
      var p = posById[id];
      var div = el('div', 'card ' + (cards[id].type === 'dir' ? 'card-dir' : cards[id].type === 'file' ? 'card-file' : 'card-fn'));
      div.setAttribute('data-nav-id', id);
      div.innerHTML = cardInner(cards[id]);
      div.style.left = (pad + p.x) + 'px';
      div.style.top = (pad + p.y) + 'px';
      div.style.width = CARD_W + 'px';
      div.addEventListener('click', function () { onCardClick(id, cards[id]); });
      canvas.appendChild(div);
    });
  }

  // ---- 目录视图 ----
  function renderDir(dirId) {
    var d = dirById[dirId];
    if (!d) { showEmpty('目录不存在'); return; }
    var childIds = (d.childrenDirs || []).concat(d.childrenFiles || []);
    if (childIds.length === 0) {
      showEmpty('该目录下没有可分析的源码文件');
      return;
    }
    var cards = {};
    childIds.forEach(function (id) {
      cards[id] = dirById[id] ? dirById[id] : fileById[id];
    });
    var edges = dirEdges(dirId);

    var PAD = 40;
    var layout = gridLayout(childIds.length, CARD_W, CARD_H, 70, 50, 5);
    var canvas = $('#canvas');
    canvas.style.width = (layout.width + PAD * 2) + 'px';
    canvas.style.height = (layout.height + PAD * 2) + 'px';
    var svg = makeSvg(layout.width + PAD * 2, layout.height + PAD * 2);
    canvas.appendChild(svg);

    var posById = {};
    childIds.forEach(function (id, i) {
      posById[id] = { x: PAD + layout.positions[i].x, y: PAD + layout.positions[i].y };
    });

    // 边（先画，卡片覆盖其上）
    edges.forEach(function (e) {
      var sp = posById[e.src], dp = posById[e.dst];
      if (!sp || !dp) return;
      var sx = sp.x + CARD_W / 2, sy = sp.y + CARD_H / 2;
      var dx = dp.x + CARD_W / 2, dy = dp.y + CARD_H / 2;
      drawEdge(svg, sx, sy, dx, dy, e.count > 1 ? String(e.count) : null, '#64748b', false);
    });

    renderCards(cards, posById, 0, function (id) {
      var node = cards[id];
      if (node.type === 'dir') {
        view = { type: 'dir', id: id, highlight: null };
        render();
      } else if (node.type === 'file') {
        view = { type: 'file', id: id, highlight: null };
        render();
      }
    });
  }

  // ---- 文件视图（函数调用图） ----
  function renderFile(fileId) {
    var f = fileById[fileId];
    if (!f) { showEmpty('文件不存在'); return; }
    var localFns = (f.functions || []).map(function (id) { return fnById[id]; }).filter(Boolean);
    if (localFns.length === 0) { showEmpty('该文件没有可展示的函数'); return; }

    // 本地调用边
    var localEdges = [];
    localFns.forEach(function (fn) {
      (fn.calls || []).forEach(function (c) {
        if (c.target && fnById[c.target] && fnById[c.target].fileId === fileId) {
          localEdges.push({ src: fn.id, dst: c.target, args: c.args || [] });
        }
      });
    });

    // 跨文件调用：外部目标 → 来源函数
    var extGroups = {};
    localFns.forEach(function (fn) {
      (fn.calls || []).forEach(function (c) {
        if (c.target && fnById[c.target] && fnById[c.target].fileId !== fileId) {
          (extGroups[c.target] = extGroups[c.target] || []).push({ from: fn.id, args: c.args || [] });
        }
      });
    });

    var MAX_EXT = 20;
    var extKeys = Object.keys(extGroups);
    var overflow = 0;
    var extNodes = [];
    var extIdx = 0;
    extKeys.forEach(function (tid) {
      if (extIdx >= MAX_EXT) { overflow += extGroups[tid].length; return; }
      extNodes.push({ id: 'ext:' + tid, kind: 'external', targetFnId: tid, count: extGroups[tid].length });
      extIdx++;
    });

    // 节点集合
    var nodes = [];
    var cards = {};
    localFns.forEach(function (fn) {
      nodes.push({ id: fn.id });
      cards[fn.id] = fn;
    });
    var extEdges = [];
    extNodes.forEach(function (n) {
      var tid = n.targetFnId;
      var first = extGroups[tid][0];
      nodes.push({ id: n.id });
      cards[n.id] = n;
      // 多个来源时取第一个画边，其余在卡片标注 count
      extEdges.push({ src: first.from, dst: n.id, external: true });
    });

    // 布局
    var PAD = 40;
    var allEdges = localEdges.concat(extEdges);
    var layout = layeredLayout(nodes, allEdges, CARD_W, CARD_H, 130, 30);
    var canvas = $('#canvas');
    canvas.style.width = (layout.width + PAD * 2) + 'px';
    canvas.style.height = (layout.height + PAD * 2) + 'px';
    var svg = makeSvg(layout.width + PAD * 2, layout.height + PAD * 2);
    canvas.appendChild(svg);

    var posById = {};
    nodes.forEach(function (n) {
      var p = layout.positions[n.id];
      posById[n.id] = { x: PAD + p.x, y: PAD + p.y };
    });

    // 边
    allEdges.forEach(function (e) {
      var sp = posById[e.src], dp = posById[e.dst];
      if (!sp || !dp) return;
      var sx = sp.x + CARD_W / 2, sy = sp.y + CARD_H / 2;
      var dx = dp.x + CARD_W / 2, dy = dp.y + CARD_H / 2;
      var label = e.external ? null : (e.args && e.args.length ? e.args.join(', ') : null);
      drawEdge(svg, sx, sy, dx, dy, label, e.external ? '#f59e0b' : '#334155', e.external ? true : false);
    });

    renderCards(cards, posById, 0, function (id, node) {
      if (node.kind === 'external') {
        var tf = fnById[node.targetFnId];
        if (tf) {
          view = { type: 'file', id: tf.fileId, highlight: tf.id };
          render();
        }
        return;
      }
      showFnDetail(node.id);
    });

    if (overflow > 0) {
      var tip = el('div', 'canvas-tip', '另有 ' + overflow + ' 条跨文件调用未展示，可在函数详情中查看。');
      canvas.appendChild(tip);
    }
    if (view.highlight) {
      setTimeout(function () {
        var hc = document.querySelector('[data-nav-id="' + view.highlight + '"]');
        if (hc) {
          hc.classList.add('highlight');
          if (typeof hc.scrollIntoView === 'function') {
            hc.scrollIntoView({ block: 'center', inline: 'center' });
          }
        }
      }, 50);
    }
  }

  function showEmpty(msg) {
    var canvas = $('#canvas');
    canvas.style.width = '100%';
    canvas.style.height = '200px';
    canvas.appendChild(el('div', 'empty', msg));
  }

  // ---- 函数详情面板 ----
  function showFnDetail(fnId) {
    var fn = fnById[fnId];
    if (!fn) return;
    var panel = $('#detail');
    panel.classList.add('open');
    panel.innerHTML = '';

    var color = KIND_COLOR[fn.kind] || '#64748b';
    panel.appendChild(el('div', 'detail-head', '<span class="dot" style="background:' + color + '"></span>'
      + '<span class="dt-title">' + esc(fn.name) + '</span>'
      + '<span class="dt-kind">' + esc(KIND_LABEL[fn.kind] || fn.kind) + '</span>'
      + '<button class="dt-close" title="关闭">&#10005;</button>'));

    var fileLink = el('div', 'dt-file', '📍 ' + esc(fn.fileRel));
    fileLink.addEventListener('click', function () {
      view = { type: 'file', id: fn.fileId, highlight: fnId };
      render();
    });
    panel.appendChild(fileLink);

    // 签名
    var sig = el('div', 'dt-section', '<div class="dt-h">签名</div>');
    if (fn.signature.params.length === 0) {
      sig.appendChild(el('div', 'dt-row', '<code>( )</code>'));
    } else {
      var table = el('table', 'dt-table');
      fn.signature.params.forEach(function (p) {
        var tr = el('tr');
        tr.appendChild(el('td', 'td-name', esc(p.name) + (p.optional ? '?' : '') + (p.default ? ' = ' + esc(p.default) : '')));
        tr.appendChild(el('td', 'td-type', esc(p.type)));
        table.appendChild(tr);
      });
      sig.appendChild(table);
    }
    sig.appendChild(el('div', 'dt-row', '<span class="dt-label">返回</span> <code>' + esc(fn.signature.returnType) + '</code>'));
    panel.appendChild(sig);

    // props
    if (fn.props && fn.props.length) {
      var pr = el('div', 'dt-section', '<div class="dt-h">Props</div>');
      var pt = el('table', 'dt-table');
      fn.props.forEach(function (p) {
        var tr = el('tr');
        tr.appendChild(el('td', 'td-name', esc(p.name) + (p.optional ? '?' : '')));
        tr.appendChild(el('td', 'td-type', esc(p.type)));
        pt.appendChild(tr);
      });
      pr.appendChild(pt);
      panel.appendChild(pr);
    }

    // 入向调用
    var callers = callersIndex[fnId] || [];
    var ca = el('div', 'dt-section', '<div class="dt-h">谁调用它（' + callers.length + '）</div>');
    if (callers.length === 0) ca.appendChild(el('div', 'dt-muted', '没有静态可解析的调用者'));
    callers.forEach(function (c) {
      var cfn = fnById[c.caller];
      var row = el('div', 'dt-call', '');
      var name = el('span', 'dt-callee', esc(cfn ? cfn.name : '?'));
      name.addEventListener('click', function () {
        if (cfn) { view = { type: 'file', id: cfn.fileId, highlight: cfn.id }; render(); }
      });
      row.appendChild(name);
      if (c.args.length) row.appendChild(el('span', 'dt-args', '(' + esc(c.args.join(', ')) + ')'));
      if (cfn) row.appendChild(el('div', 'dt-src', esc(cfn.fileRel)));
      ca.appendChild(row);
    });
    panel.appendChild(ca);

    // 出向调用
    var out = (fn.calls || []);
    var outLocal = out.filter(function (c) { return c.target && fnById[c.target]; });
    var outExt = out.filter(function (c) { return !c.target; });
    var od = el('div', 'dt-section', '<div class="dt-h">它调用了谁（' + outLocal.length + '）</div>');
    if (outLocal.length === 0) od.appendChild(el('div', 'dt-muted', '没有静态可解析的被调函数'));
    outLocal.forEach(function (c) {
      var tfn = fnById[c.target];
      var row = el('div', 'dt-call', '');
      var name = el('span', 'dt-callee', esc(tfn.name));
      name.addEventListener('click', function () {
        view = { type: 'file', id: tfn.fileId, highlight: tfn.id };
        render();
      });
      row.appendChild(name);
      if (c.args.length) row.appendChild(el('span', 'dt-args', '(' + esc(c.args.join(', ')) + ')'));
      row.appendChild(el('div', 'dt-src', esc(tfn.fileRel)));
      od.appendChild(row);
    });
    panel.appendChild(od);

    // 未解析的外部调用
    if (outExt.length) {
      var ex = el('div', 'dt-section', '<div class="dt-h">未解析调用（' + outExt.length + '）</div>');
      var seen = {};
      outExt.forEach(function (c) {
        var key = c.external;
        if (seen[key]) return;
        seen[key] = true;
        ex.appendChild(el('div', 'dt-call', '<code>' + esc(c.external) + '</code>'
          + (c.args.length ? '<span class="dt-args">(' + esc(c.args.join(', ')) + ')</span>' : '')));
      });
      panel.appendChild(ex);
    }

    // 关闭按钮
    panel.querySelector('.dt-close').addEventListener('click', function () {
      panel.classList.remove('open');
    });
  }

  // ---- 面包屑 ----
  function renderBreadcrumb() {
    var crumb = $('#crumb');
    crumb.innerHTML = '';
    var segments = [];
    if (view.type === 'dir') {
      segments = dirPath(view.id);
    } else {
      var f = fileById[view.id];
      segments = dirPath(f.dirId);
      segments.push({ id: view.id, name: f.name, kind: 'file' });
    }
    segments.forEach(function (seg, i) {
      if (i > 0) crumb.appendChild(el('span', 'crumb-sep', '/'));
      var a = el('span', 'crumb-item' + (i === segments.length - 1 ? ' cur' : ''), esc(seg.name));
      if (i < segments.length - 1) {
        a.style.cursor = 'pointer';
        a.addEventListener('click', function () {
          if (seg.kind === 'file') view = { type: 'file', id: seg.id, highlight: null };
          else view = { type: 'dir', id: seg.id, highlight: null };
          render();
        });
      }
      crumb.appendChild(a);
    });
  }

  function dirPath(dirId) {
    var out = [];
    var cur = dirById[dirId];
    while (cur) {
      out.unshift({ id: cur.id, name: cur.name, kind: 'dir' });
      cur = cur.parentId ? dirById[cur.parentId] : null;
    }
    return out;
  }

  // ---- 左侧树 ----
  function renderTree() {
    var tree = $('#tree');
    tree.innerHTML = '';
    tree.appendChild(buildTree('d:<root>', 0));
    highlightTree();
  }

  function buildTree(dirId, depth) {
    var d = dirById[dirId];
    var details = el('details', 'tree-dir');
    if (isInCurrentPath(dirId) || depth < 1) details.open = true;
    var summary = el('summary', 'tree-label', esc(d.name) + ' <span class="tree-count">' + d.stats.files + ' 文件</span>');
    summary.setAttribute('data-nav-id', d.id);
    summary.addEventListener('click', function (ev) {
      if (ev.target.tagName === 'SUMMARY') {
        // 点击 summary 默认开合；此处导航通过显式按钮
      }
    });
    details.appendChild(summary);
    (d.childrenDirs || []).forEach(function (cid) {
      details.appendChild(buildTree(cid, depth + 1));
    });
    (d.childrenFiles || []).forEach(function (fid) {
      var f = fileById[fid];
      var item = el('div', 'tree-file', esc(f.name));
      item.setAttribute('data-nav-id', f.id);
      item.addEventListener('click', function () {
        view = { type: 'file', id: f.id, highlight: null };
        render();
      });
      details.appendChild(item);
    });
    return details;
  }

  function isInCurrentPath(dirId) {
    var cur = view.type === 'dir' ? view.id : fileById[view.id].dirId;
    var p = dirById[cur];
    while (p) {
      if (p.id === dirId) return true;
      p = p.parentId ? dirById[p.parentId] : null;
    }
    return false;
  }

  function highlightTree() {
    var currentId = view.type === 'dir' ? view.id : view.id;
    var nodes = document.querySelectorAll('[data-nav-id]');
    nodes.forEach(function (n) {
      n.classList.remove('active');
      if (n.getAttribute('data-nav-id') === currentId) n.classList.add('active');
    });
  }

  // ---- 搜索 ----
  function initSearch() {
    var input = $('#search');
    var box = $('#search-results');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      box.innerHTML = '';
      if (!q) { box.classList.remove('show'); return; }
      var results = [];
      G.files.forEach(function (f) {
        if (f.relPath.toLowerCase().indexOf(q) >= 0) {
          results.push({ kind: 'file', id: f.id, label: f.relPath, sub: f.functions.length + ' 函数' });
        }
      });
      G.functions.forEach(function (fn) {
        if (fn.name.toLowerCase().indexOf(q) >= 0) {
          results.push({ kind: 'fn', id: fn.id, label: fn.name + ' (' + fn.fileRel + ')', sub: KIND_LABEL[fn.kind] || fn.kind });
        }
      });
      results = results.slice(0, 30);
      if (results.length === 0) {
        box.appendChild(el('div', 'sr-item muted', '无匹配'));
      }
      results.forEach(function (r) {
        var item = el('div', 'sr-item', esc(r.label) + ' <span class="tree-count">' + esc(r.sub) + '</span>');
        item.addEventListener('click', function () {
          if (r.kind === 'file') view = { type: 'file', id: r.id, highlight: null };
          else {
            var fn = fnById[r.id];
            view = { type: 'file', id: fn.fileId, highlight: fn.id };
          }
          render();
          box.classList.remove('show');
          input.value = '';
        });
        box.appendChild(item);
      });
      box.classList.add('show');
    });
    document.addEventListener('click', function (e) {
      if (!box.contains(e.target) && e.target !== input) box.classList.remove('show');
    });
  }

  // ---- 状态栏 ----
  function renderStats() {
    var s = $('#stats');
    var label = view.type === 'dir'
      ? '目录「' + dirById[view.id].relPath + '」'
      : '文件「' + fileById[view.id].relPath + '」';
    s.textContent = '目标: ' + G.targetName + ' · ' + label
      + ' · 共 ' + G.stats.fileCount + ' 文件 / ' + G.stats.functionCount + ' 函数 / ' + G.stats.callCount + ' 条调用'
      + ' · 生成耗时 ' + G.stats.elapsedMs + 'ms';
  }

  function showEmptyMessage() { /* placeholder */ }

  function render() {
    clearCanvas();
    if (view.type === 'dir') renderDir(view.id);
    else renderFile(view.id);
    renderBreadcrumb();
    renderTree();
    renderStats();
  }

  // ---- 图例 ----
  function initLegend() {
    var legend = $('#legend');
    legend.innerHTML = ''
      + '<span class="lg"><i style="background:#2563eb"></i>函数</span>'
      + '<span class="lg"><i style="background:#0d9488"></i>箭头函数</span>'
      + '<span class="lg"><i style="background:#7c3aed"></i>方法</span>'
      + '<span class="lg"><i style="background:#ea580c"></i>组件</span>'
      + '<span class="lg"><i style="background:#f59e0b"></i>跨文件调用</span>';
  }

  // ---- 启动 ----
  function init() {
    $('#target-name').textContent = G.targetName;
    initLegend();
    initSearch();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
