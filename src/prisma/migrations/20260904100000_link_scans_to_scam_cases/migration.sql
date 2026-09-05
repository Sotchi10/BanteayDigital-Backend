CREATE TABLE `ScanScamCaseMatch` (
  `scanId` VARCHAR(191) NOT NULL,
  `scamCaseId` INTEGER NOT NULL,
  `similarity` INTEGER NOT NULL,
  `matchReason` VARCHAR(500) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`scanId`, `scamCaseId`),
  INDEX `ScanScamCaseMatch_scamCaseId_idx`(`scamCaseId`),
  CONSTRAINT `ScanScamCaseMatch_scanId_fkey` FOREIGN KEY (`scanId`) REFERENCES `Scan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ScanScamCaseMatch_scamCaseId_fkey` FOREIGN KEY (`scamCaseId`) REFERENCES `ScamCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
