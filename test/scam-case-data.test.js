import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const csvPath = path.join(testDirectory, '..', 'data', 'scam_datas.csv')

test('sample scam-case catalogue has ten structured synthetic records', () => {
  const [header, ...rows] = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/)

  assert.deepEqual(header.split(','), [
    'id', 'title', 'scam_type', 'description', 'sample_text', 'indicators',
    'risk_level', 'source', 'verified',
  ])
  assert.equal(rows.length, 10)
  assert.ok(rows.every((row) => /"synthetic_test_data","false"$/.test(row)))
})
