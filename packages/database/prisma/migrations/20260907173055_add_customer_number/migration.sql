-- AlterTable
-- MySQL requires an AUTO_INCREMENT column to already be indexed at the
-- moment it's added — combined into one statement instead of the two
-- separate ones `prisma migrate diff` generates (ADD COLUMN, then
-- CREATE UNIQUE INDEX afterward), which fails with error 1075.
ALTER TABLE `Organization`
  ADD COLUMN `customerNumber` INTEGER NOT NULL AUTO_INCREMENT,
  ADD UNIQUE INDEX `Organization_customerNumber_key`(`customerNumber`);
