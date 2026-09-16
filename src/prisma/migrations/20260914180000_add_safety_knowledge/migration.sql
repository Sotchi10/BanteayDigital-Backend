CREATE TABLE `SafetyKnowledge` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `shortDescription` VARCHAR(500) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `warningSigns` JSON NOT NULL,
  `preventionTips` JSON NOT NULL,
  `indicators` JSON NOT NULL,
  `imageUrl` VARCHAR(512) NULL,
  `icon` VARCHAR(100) NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `SafetyKnowledge_slug_key`(`slug`),
  INDEX `SafetyKnowledge_isPublished_category_updatedAt_idx`(`isPublished`, `category`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SafetyKnowledgeRelation` (
  `sourceId` VARCHAR(191) NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `SafetyKnowledgeRelation_targetId_idx`(`targetId`),
  PRIMARY KEY (`sourceId`, `targetId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SafetyKnowledgeRelation` ADD CONSTRAINT `SafetyKnowledgeRelation_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `SafetyKnowledge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `SafetyKnowledgeRelation` ADD CONSTRAINT `SafetyKnowledgeRelation_targetId_fkey` FOREIGN KEY (`targetId`) REFERENCES `SafetyKnowledge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
