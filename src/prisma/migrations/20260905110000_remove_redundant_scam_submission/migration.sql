-- A ScamSubmission and ScamReport were always created together in the new flow.
-- Preserve the private evidence snapshot directly on ScamReport, then remove the
-- redundant intermediate table.
ALTER TABLE `ScamReport` ADD COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `ScamReport` ADD COLUMN `scanId` VARCHAR(191) NULL;
ALTER TABLE `ScamReport` ADD COLUMN `title` VARCHAR(255) NULL;
ALTER TABLE `ScamReport` ADD COLUMN `content` LONGTEXT NULL;
ALTER TABLE `ScamReport` ADD COLUMN `sourceUrl` VARCHAR(512) NULL;

UPDATE `ScamReport`
INNER JOIN `ScamSubmission` ON `ScamSubmission`.`id` = `ScamReport`.`submissionId`
SET
  `ScamReport`.`userId` = `ScamSubmission`.`userId`,
  `ScamReport`.`scanId` = `ScamSubmission`.`scanId`,
  `ScamReport`.`title` = `ScamSubmission`.`title`,
  `ScamReport`.`content` = `ScamSubmission`.`content`,
  `ScamReport`.`sourceUrl` = `ScamSubmission`.`sourceUrl`;

ALTER TABLE `ScamReport` MODIFY `userId` VARCHAR(191) NOT NULL;
ALTER TABLE `ScamReport` MODIFY `content` LONGTEXT NOT NULL;
ALTER TABLE `ScamReport` DROP FOREIGN KEY `ScamReport_submissionId_fkey`;
DROP INDEX `ScamReport_submissionId_key` ON `ScamReport`;
ALTER TABLE `ScamReport` DROP COLUMN `submissionId`;
CREATE UNIQUE INDEX `ScamReport_scanId_key` ON `ScamReport`(`scanId`);
CREATE INDEX `ScamReport_userId_createdAt_idx` ON `ScamReport`(`userId`, `createdAt`);
ALTER TABLE `ScamReport` ADD CONSTRAINT `ScamReport_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ScamReport` ADD CONSTRAINT `ScamReport_scanId_fkey`
  FOREIGN KEY (`scanId`) REFERENCES `Scan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `ScamSubmission` DROP FOREIGN KEY `ScamSubmission_userId_fkey`;
ALTER TABLE `ScamSubmission` DROP FOREIGN KEY `ScamSubmission_scanId_fkey`;
DROP TABLE `ScamSubmission`;
