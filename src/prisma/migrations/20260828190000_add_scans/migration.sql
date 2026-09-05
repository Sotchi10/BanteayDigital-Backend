CREATE TABLE `Scan` (
  `id` VARCHAR(191) NOT NULL,
  `inputType` ENUM('TEXT', 'URL') NOT NULL,
  `rawInput` LONGTEXT NOT NULL,
  `normalizedInput` LONGTEXT NOT NULL,
  `findings` JSON NOT NULL,
  `assessment` ENUM('NO_STRONG_WARNING_SIGNS', 'CAUTION', 'SUSPICIOUS', 'STRONG_SCAM_INDICATORS', 'UNABLE_TO_ASSESS') NOT NULL,
  `score` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `Scan_assessment_createdAt_idx`(`assessment`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ScamIndicator` (
  `id` VARCHAR(191) NOT NULL,
  `type` ENUM('TEXT', 'URL') NOT NULL,
  `value` VARCHAR(512) NOT NULL,
  `normalizedValue` VARCHAR(512) NOT NULL,
  `description` TEXT NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `approvedById` VARCHAR(191) NULL,
  `approvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ScamIndicator_type_normalizedValue_key`(`type`, `normalizedValue`),
  INDEX `ScamIndicator_type_isActive_approvedAt_idx`(`type`, `isActive`, `approvedAt`),
  INDEX `ScamIndicator_approvedById_idx`(`approvedById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ScamIndicator` ADD CONSTRAINT `ScamIndicator_approvedById_fkey`
  FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
