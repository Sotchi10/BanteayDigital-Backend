ALTER TABLE `ScamSubmission` ADD COLUMN `scanId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `ScamSubmission_scanId_key` ON `ScamSubmission`(`scanId`);
ALTER TABLE `ScamSubmission` ADD CONSTRAINT `ScamSubmission_scanId_fkey`
  FOREIGN KEY (`scanId`) REFERENCES `Scan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
