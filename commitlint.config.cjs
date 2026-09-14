module.exports = {
  extends: ["@commitlint/config-angular"],
  rules: {
    "body-max-line-length": [2, "always", 72],
    "footer-max-line-length": [2, "always", 72],
    "header-max-length": [2, "always", 72],
    "subject-full-stop": [2, "never", "."],
    "subject-max-length": [2, "always", 50],
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "merge",
        "perf",
        "refactor",
        "style",
        "test",
      ],
    ],
  },
};
