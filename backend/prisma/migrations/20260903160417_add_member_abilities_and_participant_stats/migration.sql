-- AlterTable
ALTER TABLE "MatchParticipant" ADD COLUMN "assists" INTEGER;
ALTER TABLE "MatchParticipant" ADD COLUMN "goals" INTEGER;
ALTER TABLE "MatchParticipant" ADD COLUMN "minutesPlayed" INTEGER;

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "thumbPath" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "team" TEXT,
    "familyId" TEXT,
    "avatarUrl" TEXT,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "shooting" INTEGER NOT NULL DEFAULT 60,
    "passing" INTEGER NOT NULL DEFAULT 60,
    "defending" INTEGER NOT NULL DEFAULT 60,
    "pace" INTEGER NOT NULL DEFAULT 60,
    "stamina" INTEGER NOT NULL DEFAULT 60,
    "dribbling" INTEGER NOT NULL DEFAULT 60,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Member_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Member" ("avatarUrl", "createdAt", "displayName", "familyId", "id", "isCaptain", "team", "updatedAt") SELECT "avatarUrl", "createdAt", "displayName", "familyId", "id", "isCaptain", "team", "updatedAt" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE INDEX "Member_team_idx" ON "Member"("team");
CREATE INDEX "Member_familyId_idx" ON "Member"("familyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
