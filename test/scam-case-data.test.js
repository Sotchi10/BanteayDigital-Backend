import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.join(testDirectory, '..', 'data', 'scam_datas.csv')

test('scam-case catalogue has 120 structured seed records', () => {
  const [header, ...rows] = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/)

  assert.deepEqual(header.split(','), [
    'id', 'title', 'scam_type', 'description', 'sample_text', 'indicators',
    'risk_level', 'source', 'verified',
  ])
  assert.equal(rows.length, 120)
  assert.equal(rows.filter((row) => /"synthetic_test_data","false"$/.test(row)).length, 10)
  assert.equal(rows.filter((row) => /BanteayDigital demo verified seed,true$/.test(row)).length, 10)
  assert.equal(rows.filter((row) => /(?:,|\")true\"?$/.test(row)).length, 110)
})
