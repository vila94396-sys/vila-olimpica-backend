-- The local MariaDB server has default_storage_engine = MyISAM, so every table created so far
-- was silently built without real foreign keys or transaction support (MyISAM ignores FK/ENGINE
-- clauses in CREATE TABLE without erroring). Convert all tables to InnoDB first so the FK
-- constraints below (and $transaction() in application code) actually take effect.
ALTER TABLE `User` ENGINE=InnoDB;
ALTER TABLE `AccessRequest` ENGINE=InnoDB;
ALTER TABLE `Property` ENGINE=InnoDB;
ALTER TABLE `Unidade` ENGINE=InnoDB;
ALTER TABLE `CondominiumFee` ENGINE=InnoDB;
ALTER TABLE `FeePayment` ENGINE=InnoDB;

-- DropIndex
DROP INDEX `FeePayment_feeId_fkey` ON `feepayment`;

-- AddForeignKey
ALTER TABLE `CondominiumFee` ADD CONSTRAINT `CondominiumFee_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `Unidade`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeePayment` ADD CONSTRAINT `FeePayment_feeId_fkey` FOREIGN KEY (`feeId`) REFERENCES `CondominiumFee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
