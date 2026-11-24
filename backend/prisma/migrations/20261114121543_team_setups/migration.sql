-- CreateTable
CREATE TABLE "team_setups" (
    "owner_id" UUID NOT NULL,
    "teams" JSONB NOT NULL,
    "active" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_setups_pkey" PRIMARY KEY ("owner_id")
);

-- AddForeignKey
ALTER TABLE "team_setups" ADD CONSTRAINT "team_setups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
