import assert from 'node:assert/strict'
import test from 'node:test'
import { listOwnedScans, setScanRepositoryForTests } from '../src/services/scan.service.js'

test('scan history only returns scans owned by the authenticated user', async (t) => {
  let scanQuery
  let countQuery
  setScanRepositoryForTests({
    scan: {
      findMany: async (query) => {
        scanQuery = query
        return [{
          id: 'scan-1', userId: 'user-1', inputType: 'TEXT', rawInput: 'Suspicious message', normalizedInput: 'Suspicious message',
          findings: [], assessment: 'SUSPICIOUS', deterministicAssessment: 'SUSPICIOUS', score: 20,
          analysisSummary: 'Contains a warning sign.', analysisReasons: [], recommendedActions: [], analysisSource: 'TEST',
          citedCaseIds: [], retrievalEvidence: { matches: [] }, reportStatus: 'NOT_REPORTED', createdAt: new Date(), scamCaseMatches: [],
        }]
      },
      count: async (query) => { countQuery = query; return 1 },
    },
  })
  t.after(() => setScanRepositoryForTests())

  const result = await listOwnedScans({ userId: 'user-1', query: { page: 2, limit: 10 } })

  assert.deepEqual(scanQuery.where, { userId: 'user-1' })
  assert.deepEqual(countQuery, { where: { userId: 'user-1' } })
  assert.equal(scanQuery.skip, 10)
  assert.equal(result.scans[0].id, 'scan-1')
  assert.deepEqual(result.meta, { total: 1, page: 2, limit: 10, totalPages: 1 })
})
