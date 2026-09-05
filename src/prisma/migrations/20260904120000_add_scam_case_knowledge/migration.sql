CREATE TABLE `ScamCaseKnowledge` (
  `id` VARCHAR(191) NOT NULL,
  `scamCaseId` INTEGER NOT NULL,
  `content` LONGTEXT NOT NULL,
  `contentHash` CHAR(64) NOT NULL,
  `indexStatus` ENUM('PENDING', 'INDEXED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `embeddingProvider` VARCHAR(100) NULL,
  `embeddingModel` VARCHAR(255) NULL,
  `vectorId` VARCHAR(255) NULL,
  `indexedAt` DATETIME(3) NULL,
  `indexError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ScamCaseKnowledge_scamCaseId_key`(`scamCaseId`),
  UNIQUE INDEX `ScamCaseKnowledge_vectorId_key`(`vectorId`),
  INDEX `ScamCaseKnowledge_indexStatus_updatedAt_idx`(`indexStatus`, `updatedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ScamCaseKnowledge_scamCaseId_fkey` FOREIGN KEY (`scamCaseId`) REFERENCES `ScamCase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
