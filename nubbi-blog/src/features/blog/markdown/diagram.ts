let rendering: Promise<void> = Promise.resolve();
let diagramId = 0;

/**
 * 串行使用 Mermaid 的全局配置，临时测量节点脱离页面流。
 * @param source 已公开笔记中的 Mermaid 源码。
 * @returns 严格模式生成的 SVG；失败交由阅读组件显示源码。
 */
export function renderDiagram(source: string): Promise<string> {
  const result = rendering.then(async (): Promise<string> => {
    // 博客主题和安全配置由站点管理，不接受笔记内的初始化指令。
    if (/%%\s*\{|^\s*---\s*\n/.test(source)) throw new Error("图表包含自定义配置");
    const { default: mermaid } = await import("mermaid");
    const styles = getComputedStyle(document.documentElement);
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      fontFamily: styles.getPropertyValue("--font-body").trim(),
      htmlLabels: false,
      flowchart: { htmlLabels: false, useMaxWidth: false },
      themeVariables: {
        fontFamily: styles.getPropertyValue("--font-body").trim(),
        fontSize: styles.getPropertyValue("--diagram-font-size").trim(),
      },
    });
    if (!await mermaid.parse(source, { suppressErrors: true })) throw new Error("图表语法无法解析");
    const measurement = document.createElement("div");
    measurement.style.cssText = "position:fixed;inset:0 auto auto 0;visibility:hidden;pointer-events:none";
    document.body.append(measurement);
    try {
      const { svg } = await mermaid.render(`blog-diagram-${++diagramId}`, source, measurement);
      return svg;
    } finally {
      measurement.remove();
    }
  });
  // 单张图出错不能阻断后面的图；队列只保留完成状态。
  rendering = result.then(() => undefined, () => undefined);
  return result;
}
