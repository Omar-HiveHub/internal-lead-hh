-- CreateTable
CREATE TABLE "BusinessRow" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source_list" TEXT NOT NULL CHECK ("source_list" IN ('HVAC', 'Remodeling/Roofing/Landscaping')),
    "business_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "website_url" TEXT NOT NULL,
    "instagram_url" TEXT NOT NULL,
    "dm1_name" TEXT NOT NULL,
    "dm1_title" TEXT NOT NULL,
    "dm1_source_url" TEXT NOT NULL,
    "dm2_name" TEXT NOT NULL,
    "dm2_title" TEXT NOT NULL,
    "dm2_source_url" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "notes" TEXT NOT NULL,
    "enrich_status" TEXT NOT NULL DEFAULT 'idle' CHECK ("enrich_status" IN ('idle', 'running', 'done', 'error')),
    "enrich_error" TEXT,
    "last_enriched_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BusinessRow_business_name_idx" ON "BusinessRow"("business_name");

-- CreateIndex
CREATE INDEX "BusinessRow_city_idx" ON "BusinessRow"("city");

-- CreateIndex
CREATE INDEX "BusinessRow_state_idx" ON "BusinessRow"("state");

-- CreateIndex
CREATE INDEX "BusinessRow_enrich_status_idx" ON "BusinessRow"("enrich_status");

-- CreateIndex
CREATE INDEX "BusinessRow_created_at_idx" ON "BusinessRow"("created_at");
