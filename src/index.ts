import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { getConfigPath } from './utils/paths.js'

const args = process.argv.slice(2)

if (args.includes('--version')) {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as { version: string }
  process.stdout.write(`prompt-caching v${pkg.version}\n`)
  process.exit(0)
}

// MCP server entry point — implementation coming in subsequent commits
process.stderr.write(`[prompt-caching] Config path: ${getConfigPath()}\n`)
process.stderr.write('[prompt-caching] MCP server starting...\n')
