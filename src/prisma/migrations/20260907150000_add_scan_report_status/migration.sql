ALTER TABLE `Scan`
  ADD COLUMN `reportStatus` ENUM('NOT_REPORTED', 'REPORTED') NOT NULL DEFAULT 'NOT_REPORTED',
  ADD INDEX `Scan_reportStatus_createdAt_idx` (`reportStatus`, `createdAt`);

UPDATE `Scan`
INNER JOIN `ScamReport` ON `ScamReport`.`scanId` = `Scan`.`id`
SET `Scan`.`reportStatus` = 'REPORTED';
