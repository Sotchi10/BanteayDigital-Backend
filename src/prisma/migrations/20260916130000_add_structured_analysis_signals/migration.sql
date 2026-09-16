ALTER TABLE `Scan`
  ADD COLUMN `analysisSignals` JSON NULL,
  ADD COLUMN `evidenceSufficiency` VARCHAR(20) NULL;
