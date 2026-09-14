const LEGACY_BLOCK_MATH_START = /^\s*(?:#{1,6}\s+)?\\\[\s*$/;
const LEGACY_BLOCK_MATH_END = /^\s*\\\]\s*$/;
const LEGACY_INLINE_MATH = /\\\((.+?)\\\)/g;

function normalizeLegacyLatex(latex: string) {
  return latex
    .replace(/\\\\(?=[A-Za-z])/g, "\\")
    .replace(/\\_/g, "_")
    .replace(/&amp;/g, "&");
}

export function normalizeMathMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  let inLegacyBlockMath = false;

  return lines
    .map((line) => {
      if (!inLegacyBlockMath && LEGACY_BLOCK_MATH_START.test(line)) {
        inLegacyBlockMath = true;
        return "$$";
      }

      if (inLegacyBlockMath && LEGACY_BLOCK_MATH_END.test(line)) {
        inLegacyBlockMath = false;
        return "$$";
      }

      if (inLegacyBlockMath) {
        return normalizeLegacyLatex(line);
      }

      return line.replace(LEGACY_INLINE_MATH, (_match, latex: string) => {
        return `$${normalizeLegacyLatex(latex)}$`;
      });
    })
    .join("\n");
}
