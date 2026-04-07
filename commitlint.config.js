/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allowed commit types — "security" added beyond conventional defaults
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "chore",
        "docs",
        "test",
        "ci",
        "refactor",
        "perf",
        "security",
      ],
    ],
    // Scope must be kebab-case (e.g., auth-service, ai-service)
    "scope-case": [2, "always", "kebab-case"],
    // Subject must not start with a capital letter or be upper-case
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    // Keep commit headers concise — max 100 characters
    "header-max-length": [2, "always", 100],
  },
};
