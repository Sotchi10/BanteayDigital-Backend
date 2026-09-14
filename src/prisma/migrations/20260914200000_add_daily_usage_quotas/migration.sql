CREATE TABLE `UserDailyUsage` (
  `userId` VARCHAR(191) NOT NULL,
  `quotaDate` CHAR(10) NOT NULL,
  `scanCount` INT NOT NULL DEFAULT 0,
  `imageUploadCount` INT NOT NULL DEFAULT 0,
  `reportCount` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`userId`, `quotaDate`),
  CONSTRAINT `UserDailyUsage_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `GuestDailyUsage` (
  `guestIdentifier` CHAR(64) NOT NULL,
  `quotaDate` CHAR(10) NOT NULL,
  `scanCount` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`guestIdentifier`, `quotaDate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
