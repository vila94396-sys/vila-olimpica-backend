-- CreateTable
CREATE TABLE `Document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `folder` VARCHAR(191) NULL DEFAULT 'Geral',
    `year` INTEGER NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileSize` VARCHAR(191) NULL,
    `fileType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Document_category_idx`(`category`),
    INDEX `Document_folder_idx`(`folder`),
    INDEX `Document_year_idx`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentDownload` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` INTEGER NOT NULL,
    `downloadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userAgent` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,

    INDEX `DocumentDownload_documentId_idx`(`documentId`),
    INDEX `DocumentDownload_downloadedAt_idx`(`downloadedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Local MariaDB defaults to MyISAM, which silently ignores FK/transaction semantics.
-- Convert to InnoDB before adding the FK constraint below (see convert_tables_to_innodb migration).
ALTER TABLE `Document` ENGINE=InnoDB;
ALTER TABLE `DocumentDownload` ENGINE=InnoDB;

-- AddForeignKey
ALTER TABLE `DocumentDownload` ADD CONSTRAINT `DocumentDownload_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
