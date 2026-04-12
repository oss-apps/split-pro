-- Add endpoint column first so we can backfill values from subscription JSON.
ALTER TABLE "public"."PushNotification"
ADD COLUMN "endpoint" TEXT;

-- Backfill endpoint from the serialized PushSubscription payload.
UPDATE "public"."PushNotification"
SET "endpoint" = "subscription"::jsonb ->> 'endpoint';

-- Drop rows with malformed legacy payloads that don't include endpoint.
DELETE FROM "public"."PushNotification"
WHERE "endpoint" IS NULL OR '' = "endpoint";

-- Replace single-device PK with multi-device composite PK.
ALTER TABLE "public"."PushNotification"
DROP CONSTRAINT "PushNotification_pkey";

ALTER TABLE "public"."PushNotification"
ALTER COLUMN "endpoint" SET NOT NULL;

ALTER TABLE "public"."PushNotification"
ADD CONSTRAINT "PushNotification_pkey" PRIMARY KEY ("userId", "endpoint");
