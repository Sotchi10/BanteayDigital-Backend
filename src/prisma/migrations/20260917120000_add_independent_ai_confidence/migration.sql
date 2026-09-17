ALTER TABLE `Scan`
  ADD COLUMN `analysisRiskLevel` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NULL,
  ADD COLUMN `analysisConfidence` DOUBLE NULL;
