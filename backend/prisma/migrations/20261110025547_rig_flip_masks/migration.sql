-- AlterTable
ALTER TABLE "rig_tweaks" ADD COLUMN     "flip_x" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "rig_masks" (
    "species" TEXT NOT NULL,
    "bone" TEXT NOT NULL,
    "png" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rig_masks_pkey" PRIMARY KEY ("species","bone")
);
