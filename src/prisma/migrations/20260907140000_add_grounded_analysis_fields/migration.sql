ALTER TABLE `Scan`
  ADD COLUMN `analysisReasons` JSON NULL,
  ADD COLUMN `recommendedActions` JSON NULL,
  ADD COLUMN `analysisSource` VARCHAR(50) NULL,
  ADD COLUMN `citedCaseIds` JSON NULL;

ALTER TABLE `ScanScamCaseMatch`
  DROP FOREIGN KEY `ScanScamCaseMatch_scamCaseId_fkey`;

ALTER TABLE `ScamCase`
  MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT;

ALTER TABLE `ScanScamCaseMatch`
  ADD CONSTRAINT `ScanScamCaseMatch_scamCaseId_fkey`
  FOREIGN KEY (`scamCaseId`) REFERENCES `ScamCase`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
