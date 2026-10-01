-- The I24 status and dates are removed: forms marked as scheduled go back to planned, paid forms carry notes instead.
UPDATE "F24" SET "status" = 'PLANNED' WHERE "status" = 'SCHEDULED_I24';

-- AlterEnum
BEGIN;
CREATE TYPE "F24Status_new" AS ENUM ('PLANNED', 'PAID', 'CANCELLED');
ALTER TABLE "public"."F24" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "F24" ALTER COLUMN "status" TYPE "F24Status_new" USING ("status"::text::"F24Status_new");
ALTER TYPE "F24Status" RENAME TO "F24Status_old";
ALTER TYPE "F24Status_new" RENAME TO "F24Status";
DROP TYPE "public"."F24Status_old";
ALTER TABLE "F24" ALTER COLUMN "status" SET DEFAULT 'PLANNED';
COMMIT;

-- AlterTable
ALTER TABLE "F24" DROP COLUMN "i24CancelBy",
DROP COLUMN "i24ScheduledAt";

