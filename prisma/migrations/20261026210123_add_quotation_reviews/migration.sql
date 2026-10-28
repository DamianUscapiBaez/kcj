-- CreateTable
CREATE TABLE "quotation_reviews" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "observation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotation_reviews_quotation_id_key" ON "quotation_reviews"("quotation_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_reviews_token_hash_key" ON "quotation_reviews"("token_hash");

-- CreateIndex
CREATE INDEX "quotation_reviews_expires_at_idx" ON "quotation_reviews"("expires_at");

-- AddForeignKey
ALTER TABLE "quotation_reviews" ADD CONSTRAINT "quotation_reviews_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
