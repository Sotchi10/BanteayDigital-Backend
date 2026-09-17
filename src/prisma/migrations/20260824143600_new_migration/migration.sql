/*
  Warnings:

  - You are about to drop the `like` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `share` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Comment` DROP FOREIGN KEY `Comment_postId_fkey`;

-- DropForeignKey
ALTER TABLE `Like` DROP FOREIGN KEY `Like_postId_fkey`;

-- DropForeignKey
ALTER TABLE `Like` DROP FOREIGN KEY `Like_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Share` DROP FOREIGN KEY `Share_postId_fkey`;

-- DropForeignKey
ALTER TABLE `Share` DROP FOREIGN KEY `Share_userId_fkey`;

-- AlterTable
ALTER TABLE `Comment` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `parentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `avatarUrl` VARCHAR(512) NULL,
    ADD COLUMN `role` ENUM('USER', 'MODERATOR', 'ADMIN') NOT NULL DEFAULT 'USER',
    ADD COLUMN `status` ENUM('ACTIVE', 'SUSPENDED', 'BANNED') NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE `Like`;

-- DropTable
DROP TABLE `Post`;

-- DropTable
DROP TABLE `Share`;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `category` ENUM('IMPERSONATION', 'FAKE_NEWS', 'INVESTMENT_FRAUD', 'JOB_OFFER', 'PHISHING_LINK', 'LOTTERY_PRIZE', 'LOAN_SCAM', 'ECOMMERCE_SCAM', 'ROMANCE_SCAM', 'MALWARE_APK', 'OTHER') NOT NULL,
    `status` ENUM('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `financialLossAmount` DECIMAL(12, 2) NULL,
    `currency` VARCHAR(10) NULL DEFAULT 'USD',
    `scammerContact` VARCHAR(255) NULL,
    `incidentDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Report_userId_idx`(`userId`),
    INDEX `Report_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Report_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(512) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `fileType` ENUM('IMAGE', 'DOCUMENT', 'AUDIO', 'VIDEO') NOT NULL DEFAULT 'IMAGE',
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(100) NULL,
    `isPublicSafe` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReportEvidence_reportId_idx`(`reportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportReviewLog` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED') NOT NULL,
    `newStatus` ENUM('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED') NOT NULL,
    `reviewNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReportReviewLog_reportId_idx`(`reportId`),
    INDEX `ReportReviewLog_adminId_idx`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScamIndicator` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('URL', 'DOMAIN', 'PHONE_NUMBER', 'BANK_ACCOUNT', 'TELEGRAM_HANDLE', 'SOCIAL_PROFILE', 'CRYPTO_WALLET', 'EMAIL') NOT NULL,
    `value` VARCHAR(255) NOT NULL,
    `sourceReportId` VARCHAR(191) NULL,
    `riskScore` INTEGER NOT NULL DEFAULT 80,
    `matchCount` INTEGER NOT NULL DEFAULT 1,
    `isBlacklisted` BOOLEAN NOT NULL DEFAULT true,
    `notes` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ScamIndicator_value_key`(`value`),
    INDEX `ScamIndicator_type_value_idx`(`type`, `value`),
    INDEX `ScamIndicator_isBlacklisted_idx`(`isBlacklisted`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityPost` (
    `id` VARCHAR(191) NOT NULL,
    `reportId` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `postType` ENUM('COMMUNITY_REPORT', 'OFFICIAL_ALERT', 'EDUCATIONAL_TIP', 'TREND_REPORT') NOT NULL DEFAULT 'COMMUNITY_REPORT',
    `severity` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO') NOT NULL DEFAULT 'HIGH',
    `category` ENUM('IMPERSONATION', 'FAKE_NEWS', 'INVESTMENT_FRAUD', 'JOB_OFFER', 'PHISHING_LINK', 'LOTTERY_PRIZE', 'LOAN_SCAM', 'ECOMMERCE_SCAM', 'ROMANCE_SCAM', 'MALWARE_APK', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `title` VARCHAR(255) NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CommunityPost_reportId_key`(`reportId`),
    INDEX `CommunityPost_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `CommunityPost_category_idx`(`category`),
    INDEX `CommunityPost_severity_idx`(`severity`),
    INDEX `CommunityPost_isPinned_idx`(`isPinned`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostMedia` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `mediaUrl` VARCHAR(512) NOT NULL,
    `mediaType` VARCHAR(50) NOT NULL DEFAULT 'IMAGE',
    `caption` VARCHAR(255) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostMedia_postId_idx`(`postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostLike` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PostLike_postId_userId_key`(`postId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostBookmark` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PostBookmark_postId_userId_key`(`postId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostShare` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `channel` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostShare_postId_createdAt_idx`(`postId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScanRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `ipHash` VARCHAR(64) NULL,
    `scanType` ENUM('URL', 'TEXT', 'IMAGE', 'QR_CODE', 'PHONE_NUMBER', 'BANK_ACCOUNT', 'SOCIAL_PROFILE') NOT NULL,
    `inputData` TEXT NULL,
    `fileUrl` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ScanRequest_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `ScanRequest_scanType_idx`(`scanType`),
    INDEX `ScanRequest_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScanResult` (
    `id` VARCHAR(191) NOT NULL,
    `scanId` VARCHAR(191) NOT NULL,
    `riskLevel` ENUM('SAFE', 'SUSPICIOUS', 'HIGH_RISK', 'DANGEROUS') NOT NULL,
    `riskScore` INTEGER NOT NULL,
    `confidence` DOUBLE NOT NULL,
    `summary` TEXT NOT NULL,
    `detectedThreats` JSON NULL,
    `ruleEngineFindings` JSON NULL,
    `aiAnalysisDetails` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ScanResult_scanId_key`(`scanId`),
    INDEX `ScanResult_riskLevel_idx`(`riskLevel`),
    INDEX `ScanResult_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScanFeedback` (
    `id` VARCHAR(191) NOT NULL,
    `scanId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `rating` ENUM('ACCURATE', 'FALSE_POSITIVE', 'FALSE_NEGATIVE') NOT NULL,
    `comment` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ScanFeedback_scanId_idx`(`scanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Comment_parentId_idx` ON `Comment`(`parentId`);

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);

-- CreateIndex
CREATE INDEX `User_status_idx` ON `User`(`status`);

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportEvidence` ADD CONSTRAINT `ReportEvidence_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportReviewLog` ADD CONSTRAINT `ReportReviewLog_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportReviewLog` ADD CONSTRAINT `ReportReviewLog_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScamIndicator` ADD CONSTRAINT `ScamIndicator_sourceReportId_fkey` FOREIGN KEY (`sourceReportId`) REFERENCES `Report`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityPost` ADD CONSTRAINT `CommunityPost_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `Report`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityPost` ADD CONSTRAINT `CommunityPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostMedia` ADD CONSTRAINT `PostMedia_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Comment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostLike` ADD CONSTRAINT `PostLike_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostLike` ADD CONSTRAINT `PostLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostBookmark` ADD CONSTRAINT `PostBookmark_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostBookmark` ADD CONSTRAINT `PostBookmark_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostShare` ADD CONSTRAINT `PostShare_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `CommunityPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostShare` ADD CONSTRAINT `PostShare_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScanRequest` ADD CONSTRAINT `ScanRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScanResult` ADD CONSTRAINT `ScanResult_scanId_fkey` FOREIGN KEY (`scanId`) REFERENCES `ScanRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScanFeedback` ADD CONSTRAINT `ScanFeedback_scanId_fkey` FOREIGN KEY (`scanId`) REFERENCES `ScanRequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScanFeedback` ADD CONSTRAINT `ScanFeedback_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `Comment` RENAME INDEX `Comment_userId_fkey` TO `Comment_userId_idx`;
