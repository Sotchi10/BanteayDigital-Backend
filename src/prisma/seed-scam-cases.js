import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prisma from '../config/database.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.resolve(currentDirectory, '../../data/scam_datas.csv')

function parseCsv(csv) {
  const rows = []
  let field = ''
  let row = []
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]

    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && csv[index + 1] === '\n') index += 1
      row.push(field)
      if (row.some((value) => value.length > 0)) rows.push(row)
      field = ''
      row = []
    } else {
      field += character
    }
  }

  row.push(field)
  if (row.some((value) => value.length > 0)) rows.push(row)

  const [headers, ...records] = rows
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])))
}

function toScamCase(record) {
  return {
    id: Number.parseInt(record.id, 10),
    title: record.title,
    scamType: record.scam_type,
    description: record.description,
    sampleText: record.sample_text,
    indicators: record.indicators.split('|').map((indicator) => indicator.trim()).filter(Boolean),
    riskLevel: record.risk_level.toUpperCase(),
    source: record.source,
    verified: record.verified.trim().toLowerCase() === 'true',
  }
}

async function main() {
  const records = parseCsv(await fs.readFile(csvPath, 'utf8')).map(toScamCase)

  if (records.some((record) => !Number.isInteger(record.id) || !record.title || !record.scamType)) {
    throw new Error('scam_datas.csv contains an invalid ScamCase record.')
  }

  for (const record of records) {
    await prisma.scamCase.upsert({
      where: { id: record.id },
      create: record,
      update: record,
    })
  }

  console.log(`Imported ${records.length} scam cases from ${csvPath}.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
