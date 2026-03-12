import os from 'os'
import path from 'path'

/**
 * Returns the Claude Code settings file path, cross-platform.
 * Windows: C:\Users\<user>\.claude\settings.json
 * Unix:    ~/.claude/settings.json
 */
export function getConfigPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json')
}

/**
 * Returns the project-level plugin config path.
 * Resolves relative to cwd, rejects paths that escape the project root.
 */
export function resolveProjectPath(inputPath: string): string {
  const resolved = path.resolve(process.cwd(), inputPath)
  if (!resolved.startsWith(process.cwd() + path.sep) && resolved !== process.cwd()) {
    throw new Error(`Path escapes project root: ${inputPath}`)
  }
  return resolved
}
