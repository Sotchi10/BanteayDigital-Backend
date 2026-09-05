-- A scan is private to the authenticated user who created it. Legacy scans
-- remain readable only at the database level and cannot be reported by the API.
ALTER TABLE `Scan` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Scan` ADD COLUMN `analysisSummary` TEXT NULL;
CREATE INDEX `Scan_userId_createdAt_idx` ON `Scan`(`userId`, `createdAt`);
ALTER TABLE `Scan` ADD CONSTRAINT `Scan_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Analysis belongs to Scan. A ScamSubmission is now only the private evidence
-- snapshot created when a user explicitly asks moderators to review a scan.
DROP INDEX `ScamSubmission_analysisStatus_idx` ON `ScamSubmission`;
ALTER TABLE `ScamSubmission` DROP COLUMN `analysisStatus`;
ALTER TABLE `ScamSubmission` DROP COLUMN `riskLevel`;
ALTER TABLE `ScamSubmission` DROP COLUMN `riskScore`;
ALTER TABLE `ScamSubmission` DROP COLUMN `analysisSummary`;
