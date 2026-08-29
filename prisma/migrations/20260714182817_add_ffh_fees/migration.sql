-- CreateTable
CREATE TABLE `Unidade` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ord` INTEGER NOT NULL,
    `bloco` INTEGER NOT NULL,
    `edificio` INTEGER NOT NULL,
    `apartamento` INTEGER NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `contacto` VARCHAR(191) NOT NULL DEFAULT '',
    `via` VARCHAR(191) NOT NULL DEFAULT '',
    `categoria` VARCHAR(191) NOT NULL DEFAULT 'quitadas',
    `dividaAnterior` DOUBLE NOT NULL DEFAULT 0,
    `pagamentosHistoricos` DOUBLE NOT NULL DEFAULT 0,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Unidade_categoria_idx`(`categoria`),
    INDEX `Unidade_bloco_edificio_apartamento_idx`(`bloco`, `edificio`, `apartamento`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CondominiumFee` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `unidadeId` INTEGER NOT NULL,
    `referenceMonth` INTEGER NOT NULL,
    `referenceYear` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL DEFAULT 0,
    `valorPago` DOUBLE NOT NULL DEFAULT 0,
    `dueDate` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `receiptUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CondominiumFee_referenceYear_idx`(`referenceYear`),
    INDEX `CondominiumFee_status_idx`(`status`),
    UNIQUE INDEX `CondominiumFee_unidadeId_referenceYear_referenceMonth_key`(`unidadeId`, `referenceYear`, `referenceMonth`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeePayment` (
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

-- AddForeignKey
ALTER TABLE `CondominiumFee` ADD CONSTRAINT `CondominiumFee_unidadeId_fkey` FOREIGN KEY (`unidadeId`) REFERENCES `Unidade`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeePayment` ADD CONSTRAINT `FeePayment_feeId_fkey` FOREIGN KEY (`feeId`) REFERENCES `CondominiumFee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
