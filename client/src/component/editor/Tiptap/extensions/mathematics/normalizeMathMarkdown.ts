const LEGACY_BLOCK_MATH_START = /^\s*(?:#{1,6}\s+)?\\\[\s*$/;
const LEGACY_BLOCK_MATH_END = /^\s*\\\]\s*$/;
const LEGACY_INLINE_MATH = /\\\((.+?)\\\)/g;
const LEGACY_PARENTHESIZED_INLINE_MATH = /\(([^()\n]+)\)/g;
const CODE_FENCE = /^\s*(`{3,}|~{3,})/;

type CodeFence = {
  character: "`" | "~";
  length: number;
};

function normalizeLegacyLatex(latex: string) {
  return latex
    .replace(/\\\\(?=[A-Za-z])/g, "\\")
    .replace(/\\_/g, "_")
    .replace(/&amp;/g, "&");
}

function getCodeFence(line: string): CodeFence | null {
  const match = line.match(CODE_FENCE);
  if (!match) return null;

  return {
    character: match[1][0] as CodeFence["character"],
    length: match[1].length,
  };
}

function isLikelyLegacyInlineMath(value: string) {
  const latex = normalizeLegacyLatex(value).trim();
  if (!latex || [...latex].some((character) => character.charCodeAt(0) > 127)) {
    return false;
  }
  if (/^(?:https?:\/\/|mailto:)/i.test(latex)) return false;

  if (/^[A-Za-z]$/.test(latex)) return true;
  if (/^\d+[A-Za-z]$/.test(latex)) return true;
  if (latex === "pos") return true;
  if (/\\[A-Za-z]+|[_^{}]/.test(latex)) return true;

  const symbolicTerms = latex.split(",").map((term) => term.trim());
  return (
    symbolicTerms.length > 1 &&
    symbolicTerms.every((term) =>
      /^(?:[A-Za-z]|pos|\d+[A-Za-z](?:[+-]\d+)?)$/.test(term),
    )
  );
}

function replaceLegacyParenthesizedMath(value: string) {
  return value.replace(
    LEGACY_PARENTHESIZED_INLINE_MATH,
    (match, latex: string) => {
      if (!isLikelyLegacyInlineMath(latex)) return match;
      return `$${normalizeLegacyLatex(latex).trim()}$`;
    },
  );
}

function normalizeInlineMath(line: string) {
  const normalizedLegacyDelimiters = line.replace(
    LEGACY_INLINE_MATH,
    (_match, latex: string) => `$${normalizeLegacyLatex(latex)}$`,
  );
  let output = "";
  let unprotectedStart = 0;
  let cursor = 0;

  const appendProtectedSegment = (start: number, end: number) => {
    output += replaceLegacyParenthesizedMath(
      normalizedLegacyDelimiters.slice(unprotectedStart, start),
    );
    output += normalizedLegacyDelimiters.slice(start, end);
    unprotectedStart = end;
    cursor = end;
  };

  while (cursor < normalizedLegacyDelimiters.length) {
    const character = normalizedLegacyDelimiters[cursor];

    if (character === "`") {
      let delimiterLength = 1;
      while (
        normalizedLegacyDelimiters[cursor + delimiterLength] === "`"
      ) {
        delimiterLength += 1;
      }

      const delimiter = "`".repeat(delimiterLength);
      const closingIndex = normalizedLegacyDelimiters.indexOf(
        delimiter,
        cursor + delimiterLength,
      );
      if (closingIndex >= 0) {
        appendProtectedSegment(
          cursor,
          closingIndex + delimiterLength,
        );
        continue;
      }
    }

    if (character === "$" && normalizedLegacyDelimiters[cursor - 1] !== "\\") {
      const closingIndex = normalizedLegacyDelimiters.indexOf("$", cursor + 1);
      if (closingIndex >= 0) {
        appendProtectedSegment(cursor, closingIndex + 1);
        continue;
      }
    }

    cursor += 1;
  }

  output += replaceLegacyParenthesizedMath(
    normalizedLegacyDelimiters.slice(unprotectedStart),
  );
  return output;
}

export function normalizeMathMarkdown(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  let inLegacyBlockMath = false;
  let inStandardBlockMath = false;
  let codeFence: CodeFence | null = null;

  return lines
    .map((line) => {
      const currentFence = getCodeFence(line);
      if (codeFence) {
        if (
          currentFence?.character === codeFence.character &&
          currentFence.length >= codeFence.length
        ) {
          codeFence = null;
        }
        return line;
      }

      if (currentFence) {
        codeFence = currentFence;
        return line;
      }

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

      const standardBlockDelimiters = line.match(/(?<!\\)\$\$/g)?.length ?? 0;
      if (inStandardBlockMath || standardBlockDelimiters > 0) {
        if (standardBlockDelimiters % 2 === 1) {
          inStandardBlockMath = !inStandardBlockMath;
        }
        return line;
      }

      return normalizeInlineMath(line);
    })
    .join("\n");
}
