-- CreateTable
CREATE TABLE `InstitutionFee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `institution` VARCHAR(191) NOT NULL,
    `referenceYear` INTEGER NOT NULL,
    `referenceMonth` INTEGER NOT NULL,
    `periodLabel` VARCHAR(191) NOT NULL,
    `descricao` VARCHAR(191) NOT NULL DEFAULT 'Taxa de condomínio',
    `taxa` DOUBLE NOT NULL DEFAULT 1000,
    `nApartamentos` INTEGER NOT NULL DEFAULT 0,
    `valor` DOUBLE NOT NULL DEFAULT 0,
    `valorPago` DOUBLE NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'PARTIAL', 'PAID') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InstitutionFee_institution_idx`(`institution`),
    INDEX `InstitutionFee_status_idx`(`status`),
    UNIQUE INDEX `InstitutionFee_institution_referenceYear_referenceMonth_key`(`institution`, `referenceYear`, `referenceMonth`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstitutionPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `feeId` INTEGER NOT NULL,
    `institution` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdByUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Local MariaDB defaults to MyISAM, which silently ignores FK/transaction semantics.
-- Convert to InnoDB before adding the FK constraint below (see convert_tables_to_innodb migration).
ALTER TABLE `InstitutionFee` ENGINE=InnoDB;
ALTER TABLE `InstitutionPayment` ENGINE=InnoDB;

-- AddForeignKey
ALTER TABLE `InstitutionPayment` ADD CONSTRAINT `InstitutionPayment_feeId_fkey` FOREIGN KEY (`feeId`) REFERENCES `InstitutionFee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
