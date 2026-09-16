import assert from 'node:assert/strict'
import test from 'node:test'
import prisma from '../src/config/database.js'

test('the generated Prisma client exposes the PostSave delegate used by saved-post APIs', () => {
  assert.equal(typeof prisma.postSave?.findMany, 'function')
})
