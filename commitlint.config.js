/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'modes',       // src/modes/ — session mode implementations
        'session',     // src/session/ — state machine and detection
        'optimizer',   // src/optimizer/ — cache injection and validation
        'tracker',     // src/tracker/ — token usage accounting
        'server',      // src/index.ts — MCP server and tool registration
        'deps',        // dependency updates
        'ci',          // CI/CD workflows
        'docs',        // documentation
        'release',     // release tooling
      ],
    ],
    'subject-max-length': [2, 'always', 100],
  },
};
