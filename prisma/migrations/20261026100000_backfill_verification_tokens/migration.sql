-- Asegura que las cotizaciones antiguas también puedan verificarse con QR.
UPDATE "quotations"
SET "verificationToken" = gen_random_uuid()::text
WHERE "verificationToken" IS NULL;
