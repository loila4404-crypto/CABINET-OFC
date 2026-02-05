-- CreateTable
CREATE TABLE "CabinetInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canManageMembers" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CabinetInvitation_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CabinetInvitation_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CabinetInvitation_senderId_idx" ON "CabinetInvitation"("senderId");

-- CreateIndex
CREATE INDEX "CabinetInvitation_receiverId_idx" ON "CabinetInvitation"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "CabinetInvitation_token_key" ON "CabinetInvitation"("token");

-- CreateIndex
CREATE INDEX "CabinetInvitation_status_idx" ON "CabinetInvitation"("status");





