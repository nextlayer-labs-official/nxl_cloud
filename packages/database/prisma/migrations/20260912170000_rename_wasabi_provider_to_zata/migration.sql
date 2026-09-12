-- Provider id "wasabi" was always actually Zata in practice (env vars named
-- WASABI_* were pointed at a Zata endpoint) — renaming the id to "zata" for
-- clarity, freeing up "wasabi" as the id for an actual future Wasabi
-- provider. Existing rows already stamped "wasabi" must be relabeled, not
-- just the column default, or every file uploaded before this migration
-- would suddenly resolve against a provider id ("wasabi") that no longer
-- means what it used to.

-- AlterTable
ALTER TABLE `File` MODIFY `storageProvider` VARCHAR(191) NOT NULL DEFAULT 'zata';
ALTER TABLE `FileVersion` MODIFY `storageProvider` VARCHAR(191) NOT NULL DEFAULT 'zata';
ALTER TABLE `PlatformSettings` MODIFY `defaultStorageProvider` VARCHAR(191) NOT NULL DEFAULT 'zata';

-- Backfill existing rows
UPDATE `File` SET `storageProvider` = 'zata' WHERE `storageProvider` = 'wasabi';
UPDATE `FileVersion` SET `storageProvider` = 'zata' WHERE `storageProvider` = 'wasabi';
UPDATE `PlatformSettings` SET `defaultStorageProvider` = 'zata' WHERE `defaultStorageProvider` = 'wasabi';
