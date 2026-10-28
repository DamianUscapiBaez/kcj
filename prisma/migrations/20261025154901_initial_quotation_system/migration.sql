-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('OWNER', 'ADMIN', 'SALES', 'VIEWER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RUC', 'DNI', 'CE', 'PASSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('PEN', 'USD');

-- CreateEnum
CREATE TYPE "RateUnit" AS ENUM ('HOUR', 'DAY', 'TRIP', 'SERVICE', 'MONTH');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'CARD', 'OTHER');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "tax_id" VARCHAR(20) NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "trade_name" VARCHAR(200),
    "address" TEXT,
    "email" VARCHAR(200),
    "phone" VARCHAR(40),
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "company_id" UUID NOT NULL,
    "default_currency" "Currency" NOT NULL DEFAULT 'PEN',
    "default_tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "default_validity_days" INTEGER NOT NULL DEFAULT 7,
    "quotation_prefix" VARCHAR(10) NOT NULL DEFAULT 'CT',
    "default_terms" TEXT,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "company_bank_accounts" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "account_name" VARCHAR(200),
    "account_number" VARCHAR(60) NOT NULL,
    "cci" VARCHAR(60),
    "currency" "Currency" NOT NULL,
    "is_detraction" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "company_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_users" (
    "company_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CompanyRole" NOT NULL DEFAULT 'SALES',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_users_pkey" PRIMARY KEY ("company_id","user_id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL DEFAULT 'RUC',
    "document_number" VARCHAR(30) NOT NULL,
    "legal_name" VARCHAR(200) NOT NULL,
    "address" TEXT,
    "email" VARCHAR(200),
    "phone" VARCHAR(40),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(200),
    "phone" VARCHAR(40),
    "position" VARCHAR(100),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_types" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vehicle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_rates" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "vehicle_type_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "unit" "RateUnit" NOT NULL,
    "currency" "Currency" NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "valid_from" DATE,
    "valid_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "service_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_sequences" (
    "company_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quotation_sequences_pkey" PRIMARY KEY ("company_id","year")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "issue_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" DATE NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'PEN',
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "tax_included" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "payment_terms" TEXT,
    "terms" TEXT,
    "notes" TEXT,
    "contact_name" VARCHAR(160),
    "contact_email" VARCHAR(200),
    "client_document" VARCHAR(30) NOT NULL,
    "client_name" VARCHAR(200) NOT NULL,
    "client_address" TEXT,
    "seller_name" VARCHAR(160),
    "route" VARCHAR(160),
    "shift" VARCHAR(60),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "service_id" UUID,
    "vehicle_type_id" UUID,
    "service_rate_id" UUID,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "vehicle_description" VARCHAR(160),
    "unit" "RateUnit" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,2) NOT NULL,
    "service_start" DATE,
    "service_end" DATE,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_status_histories" (
    "id" UUID NOT NULL,
    "quotation_id" UUID NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "from_status" "QuotationStatus",
    "to_status" "QuotationStatus" NOT NULL,
    "note" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotation_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_tax_id_key" ON "companies"("tax_id");

-- CreateIndex
CREATE INDEX "company_bank_accounts_company_id_is_active_idx" ON "company_bank_accounts"("company_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "company_users_user_id_idx" ON "company_users"("user_id");

-- CreateIndex
CREATE INDEX "clients_company_id_legal_name_idx" ON "clients"("company_id", "legal_name");

-- CreateIndex
CREATE UNIQUE INDEX "clients_company_id_document_type_document_number_key" ON "clients"("company_id", "document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "clients_id_company_id_key" ON "clients"("id", "company_id");

-- CreateIndex
CREATE INDEX "client_contacts_client_id_idx" ON "client_contacts"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_types_company_id_name_key" ON "vehicle_types"("company_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_types_id_company_id_key" ON "vehicle_types"("id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "services_company_id_code_key" ON "services"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "services_id_company_id_key" ON "services"("id", "company_id");

-- CreateIndex
CREATE INDEX "service_rates_company_id_service_id_vehicle_type_id_is_acti_idx" ON "service_rates"("company_id", "service_id", "vehicle_type_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "service_rates_id_company_id_key" ON "service_rates"("id", "company_id");

-- CreateIndex
CREATE INDEX "quotations_company_id_status_issue_date_idx" ON "quotations"("company_id", "status", "issue_date");

-- CreateIndex
CREATE INDEX "quotations_company_id_client_id_idx" ON "quotations"("company_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_company_id_year_number_key" ON "quotations"("company_id", "year", "number");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_company_id_code_key" ON "quotations"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_id_company_id_key" ON "quotations"("id", "company_id");

-- CreateIndex
CREATE INDEX "quotation_items_company_id_service_id_idx" ON "quotation_items"("company_id", "service_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_items_quotation_id_position_key" ON "quotation_items"("quotation_id", "position");

-- CreateIndex
CREATE INDEX "quotation_status_histories_quotation_id_changed_at_idx" ON "quotation_status_histories"("quotation_id", "changed_at");

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_bank_accounts" ADD CONSTRAINT "company_bank_accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_types" ADD CONSTRAINT "vehicle_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_rates" ADD CONSTRAINT "service_rates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_rates" ADD CONSTRAINT "service_rates_service_id_company_id_fkey" FOREIGN KEY ("service_id", "company_id") REFERENCES "services"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_rates" ADD CONSTRAINT "service_rates_vehicle_type_id_company_id_fkey" FOREIGN KEY ("vehicle_type_id", "company_id") REFERENCES "vehicle_types"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_sequences" ADD CONSTRAINT "quotation_sequences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_client_id_company_id_fkey" FOREIGN KEY ("client_id", "company_id") REFERENCES "clients"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_company_id_fkey" FOREIGN KEY ("quotation_id", "company_id") REFERENCES "quotations"("id", "company_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_service_id_company_id_fkey" FOREIGN KEY ("service_id", "company_id") REFERENCES "services"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_vehicle_type_id_company_id_fkey" FOREIGN KEY ("vehicle_type_id", "company_id") REFERENCES "vehicle_types"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_service_rate_id_company_id_fkey" FOREIGN KEY ("service_rate_id", "company_id") REFERENCES "service_rates"("id", "company_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_status_histories" ADD CONSTRAINT "quotation_status_histories_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_status_histories" ADD CONSTRAINT "quotation_status_histories_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
