-- CreateTable
CREATE TABLE `FpdUnidade` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ord` INTEGER NOT NULL DEFAULT 1,
    `apartamento` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `contacto` VARCHAR(191) NOT NULL DEFAULT '',
    `taxa` DOUBLE NOT NULL DEFAULT 1000,
    `dividaAnterior` DOUBLE NOT NULL DEFAULT 0,
    `pagamentosHistoricos` DOUBLE NOT NULL DEFAULT 0,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FpdUnidade_apartamento_idx`(`apartamento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FpdFee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `unidadeId` INTEGER NOT NULL,
    `referenceMonth` INTEGER NOT NULL,
    `referenceYear` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL DEFAULT 1000,
    `valorPago` DOUBLE NOT NULL DEFAULT 0,
    `dueDate` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FpdFee_referenceYear_idx`(`referenceYear`),
    INDEX `FpdFee_status_idx`(`status`),
    UNIQUE INDEX `FpdFee_unidadeId_referenceYear_referenceMonth_key`(`unidadeId`, `referenceYear`, `referenceMonth`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FpdFeePayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `feeId` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `createdByUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Local MariaDB defaults to MyISAM, which silently ignores FK/transaction semantics.
-- Convert to InnoDB before adding the FK constraints below (see convert_tables_to_innodb migration).
ALTER TABLE `FpdUnidade` ENGINE=InnoDB;
ALTER TABLE `FpdFee` ENGINE=InnoDB;
ALTER TABLE `FpdFeePayment` ENGINE=InnoDB;

-- AddForeignKey
ALTER TABLE `FpdFee` ADD CONSTRAINT `FpdFee_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `FpdUnidade`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FpdFeePayment` ADD CONSTRAINT `FpdFeePayment_feeId_fkey` FOREIGN KEY (`feeId`) REFERENCES `FpdFee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
