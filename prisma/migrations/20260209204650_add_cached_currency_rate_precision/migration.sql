-- Clear cached currency rates to repopulate with precision
TRUNCATE TABLE "CachedCurrencyRate";

-- Add precision to cached currency rates
ALTER TABLE "CachedCurrencyRate"
ADD COLUMN "precision" INTEGER NOT NULL;
