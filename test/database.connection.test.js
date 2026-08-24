import assert from "node:assert/strict";
import test from "node:test";
import prisma from "../src/config/database.js";

test("connects to the configured MySQL database", async (t) => {
  t.after(async () => {
    await prisma.$disconnect();
  });

  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl, "DATABASE_URL must be set to run the database integration test");

  const expectedDatabase = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));

  await prisma.$connect();

  const [connection] = await prisma.$queryRaw`
    SELECT
      DATABASE() AS databaseName,
      VERSION() AS serverVersion,
      1 AS connected
  `;

  assert.equal(Number(connection.connected), 1);
  assert.equal(connection.databaseName, expectedDatabase);
  assert.match(connection.serverVersion, /^\d+\./);
});
