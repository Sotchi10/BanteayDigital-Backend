CREATE TABLE `ScamCase` (
  `id` INTEGER NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `scamType` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `sampleText` LONGTEXT NOT NULL,
  `indicators` JSON NOT NULL,
  `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
  `source` VARCHAR(255) NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `ScamCase_scamType_riskLevel_idx`(`scamType`, `riskLevel`),
  INDEX `ScamCase_verified_idx`(`verified`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
