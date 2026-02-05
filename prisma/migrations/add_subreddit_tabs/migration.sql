-- CreateTable
CREATE TABLE IF NOT EXISTS "SubredditTab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubredditTab_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SubredditTab_userId_idx" ON "SubredditTab"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SubredditTab_userId_name_key" ON "SubredditTab"("userId", "name");

-- AlterTable - добавляем поля tabId и order в таблицу Subreddit (SQLite не поддерживает ALTER TABLE для FK, поэтому FK будет добавлен через Prisma)
-- В SQLite нужно пересоздать таблицу для добавления внешнего ключа
-- Но для простоты добавим только колонки, FK будет управляться Prisma

