-- Replace the legacy scanner, evidence, social, and old report structures
-- with the submission → report → community-post workflow.
ALTER TABLE `comment` DROP FOREIGN KEY `Comment_parentId_fkey`;
ALTER TABLE `comment` DROP FOREIGN KEY `Comment_postId_fkey`;
ALTER TABLE `comment` DROP FOREIGN KEY `Comment_userId_fkey`;
ALTER TABLE `communitypost` DROP FOREIGN KEY `CommunityPost_authorId_fkey`;
ALTER TABLE `communitypost` DROP FOREIGN KEY `CommunityPost_reportId_fkey`;
ALTER TABLE `postbookmark` DROP FOREIGN KEY `PostBookmark_postId_fkey`;
ALTER TABLE `postbookmark` DROP FOREIGN KEY `PostBookmark_userId_fkey`;
ALTER TABLE `postlike` DROP FOREIGN KEY `PostLike_postId_fkey`;
ALTER TABLE `postlike` DROP FOREIGN KEY `PostLike_userId_fkey`;
ALTER TABLE `postmedia` DROP FOREIGN KEY `PostMedia_postId_fkey`;
ALTER TABLE `postshare` DROP FOREIGN KEY `PostShare_postId_fkey`;
ALTER TABLE `postshare` DROP FOREIGN KEY `PostShare_userId_fkey`;
ALTER TABLE `report` DROP FOREIGN KEY `Report_userId_fkey`;
ALTER TABLE `reportevidence` DROP FOREIGN KEY `ReportEvidence_reportId_fkey`;
ALTER TABLE `reportreviewlog` DROP FOREIGN KEY `ReportReviewLog_adminId_fkey`;
ALTER TABLE `reportreviewlog` DROP FOREIGN KEY `ReportReviewLog_reportId_fkey`;
ALTER TABLE `scamindicator` DROP FOREIGN KEY `ScamIndicator_sourceReportId_fkey`;
ALTER TABLE `scanfeedback` DROP FOREIGN KEY `ScanFeedback_scanId_fkey`;
ALTER TABLE `scanfeedback` DROP FOREIGN KEY `ScanFeedback_userId_fkey`;
ALTER TABLE `scanrequest` DROP FOREIGN KEY `ScanRequest_userId_fkey`;
ALTER TABLE `scanresult` DROP FOREIGN KEY `ScanResult_scanId_fkey`;

UPDATE `user` SET `role` = 'ADMIN' WHERE `role` = 'MODERATOR';
ALTER TABLE `user` MODIFY `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER';

DROP TABLE `comment`;
DROP TABLE `communitypost`;
DROP TABLE `postbookmark`;
DROP TABLE `postlike`;
DROP TABLE `postmedia`;
DROP TABLE `postshare`;
DROP TABLE `report`;
DROP TABLE `reportevidence`;
DROP TABLE `reportreviewlog`;
DROP TABLE `scamindicator`;
DROP TABLE `scanfeedback`;
DROP TABLE `scanrequest`;
DROP TABLE `scanresult`;

CREATE TABLE `ScamSubmission` (
  `id` VARCHAR(191) NOT NULL, `userId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NULL, `content` LONGTEXT NOT NULL, `sourceUrl` VARCHAR(512) NULL,
  `analysisStatus` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `riskLevel` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NULL, `riskScore` INTEGER NULL,
  `analysisSummary` TEXT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `ScamSubmission_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `ScamSubmission_analysisStatus_idx`(`analysisStatus`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ScamReport` (
  `id` VARCHAR(191) NOT NULL, `submissionId` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `reviewNote` TEXT NULL, `reviewedById` VARCHAR(191) NULL, `reviewedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ScamReport_submissionId_key`(`submissionId`),
  INDEX `ScamReport_status_createdAt_idx`(`status`, `createdAt`),
  INDEX `ScamReport_reviewedById_idx`(`reviewedById`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `CommunityPost` (
  `id` VARCHAR(191) NOT NULL, `reportId` VARCHAR(191) NOT NULL, `authorId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL, `summary` VARCHAR(500) NOT NULL, `content` LONGTEXT NOT NULL,
  `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `CommunityPost_reportId_key`(`reportId`),
  INDEX `CommunityPost_publishedAt_idx`(`publishedAt`), PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ScamSubmission` ADD CONSTRAINT `ScamSubmission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ScamReport` ADD CONSTRAINT `ScamReport_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `ScamSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ScamReport` ADD CONSTRAINT `ScamReport_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CommunityPost` ADD CONSTRAINT `CommunityPost_reportId_fkey` FOREIGN KEY (`reportId`) REFERENCES `ScamReport`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `CommunityPost` ADD CONSTRAINT `CommunityPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
