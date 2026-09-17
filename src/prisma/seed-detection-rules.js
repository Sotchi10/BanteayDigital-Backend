import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prisma from '../config/database.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.resolve(currentDirectory, '../../data/detection_rules.csv')

const parseCsv = (csv) => {
  const [header, ...rows] = csv.trim().split(/\r?\n/)
  const columns = header.split(',')
  return rows.map((row) => Object.fromEntries(row.split(',').map((value, index) => [columns[index], value.trim()])))
}

const toRule = (record) => ({
  code: record.code,
  title: record.title,
  description: record.description,
  severity: record.severity,
  weight: Number.parseInt(record.weight, 10),
  matchTerms: record.match_terms.split('|').map((term) => term.trim()).filter(Boolean),
  languages: record.languages.split('|').map((language) => language.trim()).filter(Boolean),
  recommendation: record.recommendation || null,
  source: record.source,
  verified: record.verified.toLowerCase() === 'true',
  enabled: record.enabled.toLowerCase() === 'true',
})

async function main() {
  const records = parseCsv(await fs.readFile(csvPath, 'utf8')).map(toRule)
  if (records.length !== 10 || records.some((record) => !record.code || !Number.isInteger(record.weight))) {
    throw new Error('detection_rules.csv must contain 10 valid rules.')
  }
  for (const record of records) {
    await prisma.detectionRule.upsert({
      where: { code: record.code }, create: record, update: record,
    })
  }
  console.log(`Imported ${records.length} detection rules from ${csvPath}.`)
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
