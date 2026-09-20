ALTER TABLE `SafetyKnowledge`
  ADD COLUMN `titleKm` VARCHAR(255) NULL,
  ADD COLUMN `categoryKm` VARCHAR(100) NULL,
  ADD COLUMN `shortDescriptionKm` VARCHAR(500) NULL,
  ADD COLUMN `contentKm` LONGTEXT NULL,
  ADD COLUMN `warningSignsKm` JSON NULL,
  ADD COLUMN `preventionTipsKm` JSON NULL,
  ADD COLUMN `indicatorsKm` JSON NULL;

UPDATE `SafetyKnowledge`
SET
  `titleKm` = `title`,
  `categoryKm` = `category`,
  `shortDescriptionKm` = `shortDescription`,
  `contentKm` = `content`,
  `warningSignsKm` = `warningSigns`,
  `preventionTipsKm` = `preventionTips`,
  `indicatorsKm` = `indicators`;

ALTER TABLE `SafetyKnowledge`
  MODIFY `titleKm` VARCHAR(255) NOT NULL,
  MODIFY `categoryKm` VARCHAR(100) NOT NULL,
  MODIFY `shortDescriptionKm` VARCHAR(500) NOT NULL,
  MODIFY `contentKm` LONGTEXT NOT NULL,
  MODIFY `warningSignsKm` JSON NOT NULL,
  MODIFY `preventionTipsKm` JSON NOT NULL,
  MODIFY `indicatorsKm` JSON NOT NULL;
