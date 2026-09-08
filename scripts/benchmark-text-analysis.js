import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { runScan } from '../src/scanner/scan.engine.js'

const benchmarkPath = fileURLToPath(new URL('../data/text_benchmark.csv', import.meta.url))
const flagged = (result) => result.deterministicAssessment !== 'INSUFFICIENT_EVIDENCE'
const percent = (value) => `${(value * 100).toFixed(1)}%`

const main = async () => {
  const [header, ...rows] = (await readFile(benchmarkPath, 'utf8')).trim().split(/\r?\n/)
  const fields = header.split(',')
  const cases = rows.map((row) => Object.fromEntries(row.split(',').map((value, index) => [fields[index], value.trim()])))
  const counts = { tp: 0, fp: 0, tn: 0, fn: 0 }
  const failures = []

  for (const item of cases) {
    const result = runScan({ type: 'TEXT', value: item.text })
    const predictedScam = flagged(result)
    const actualScam = item.label === 'SCAM'
    if (predictedScam && actualScam) counts.tp += 1
    if (predictedScam && !actualScam) { counts.fp += 1; failures.push({ id: item.id, type: 'false_positive', findings: result.findings.map(({ code }) => code) }) }
    if (!predictedScam && !actualScam) counts.tn += 1
    if (!predictedScam && actualScam) { counts.fn += 1; failures.push({ id: item.id, type: 'missed_scam' }) }
  }

  const precision = counts.tp / (counts.tp + counts.fp || 1)
  const recall = counts.tp / (counts.tp + counts.fn || 1)
  const specificity = counts.tn / (counts.tn + counts.fp || 1)
  const accuracy = (counts.tp + counts.tn) / cases.length
  console.log(JSON.stringify({ cases: cases.length, ...counts, precision: percent(precision), recall: percent(recall), specificity: percent(specificity), accuracy: percent(accuracy), failures }, null, 2))

  if (process.argv.includes('--strict') && (precision < 0.8 || recall < 0.8)) process.exitCode = 1
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
