CREATE TABLE `DetectionRule` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(100) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `severity` ENUM('CAUTION', 'SUSPICIOUS') NOT NULL,
  `weight` INTEGER NOT NULL,
  `matchTerms` JSON NOT NULL,
  `languages` JSON NOT NULL,
  `recommendation` TEXT NULL,
  `source` VARCHAR(255) NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT false,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `DetectionRule_code_key`(`code`),
  INDEX `DetectionRule_enabled_severity_idx`(`enabled`, `severity`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
