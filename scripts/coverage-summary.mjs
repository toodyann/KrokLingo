// Prints a Markdown table of each workspace's coverage (from `npm run test:coverage`) for the CI job summary.
import { existsSync, readFileSync } from 'node:fs'

const WORKSPACES = ['apps/api', 'apps/web', 'packages/shared']
const METRICS = ['lines', 'statements', 'functions', 'branches']

const rows = WORKSPACES.map((dir) => {
  const file = `${dir}/coverage/coverage-summary.json`
  if (!existsSync(file)) return `| ${dir} | ${METRICS.map(() => '—').join(' | ')} |`
  const { total } = JSON.parse(readFileSync(file, 'utf8'))
  return `| ${dir} | ${METRICS.map((m) => `${total[m].pct}%`).join(' | ')} |`
})

console.log(
  [
    '### Coverage',
    '',
    `| Workspace | ${METRICS.join(' | ')} |`,
    `|---|${METRICS.map(() => '---:').join('|')}|`,
    ...rows,
  ].join('\n'),
)
