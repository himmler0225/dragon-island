-- CreateTable
CREATE TABLE "rig_tweaks" (
    "species" TEXT NOT NULL,
    "bone" TEXT NOT NULL,
    "dx" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rot" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rig_tweaks_pkey" PRIMARY KEY ("species","bone")
);
