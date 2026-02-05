-- CreateTable
CREATE TABLE "CabinetMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cabinetOwnerId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canManageMembers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CabinetMember_cabinetOwnerId_fkey" FOREIGN KEY ("cabinetOwnerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CabinetMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CabinetMember_cabinetOwnerId_idx" ON "CabinetMember"("cabinetOwnerId");

-- CreateIndex
CREATE INDEX "CabinetMember_memberId_idx" ON "CabinetMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "CabinetMember_cabinetOwnerId_memberId_key" ON "CabinetMember"("cabinetOwnerId", "memberId");





