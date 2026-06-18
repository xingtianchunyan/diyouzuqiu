-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "memberId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "team" TEXT,
    "familyId" TEXT,
    "avatarUrl" TEXT,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Member_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "takenAt" DATETIME,
    "year" INTEGER,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaAsset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaPersonTag" (
    "mediaId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("mediaId", "memberId"),
    CONSTRAINT "MediaPersonTag_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaPersonTag_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorMemberId" TEXT,
    "authorName" TEXT,
    "year" INTEGER,
    "date" DATETIME,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Work_authorMemberId_fkey" FOREIGN KEY ("authorMemberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Work_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playedAt" DATETIME NOT NULL,
    "redScore" INTEGER NOT NULL,
    "blueScore" INTEGER NOT NULL,
    "mvpMemberId" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_mvpMemberId_fkey" FOREIGN KEY ("mvpMemberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchParticipant" (
    "matchId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("matchId", "memberId"),
    CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MatchParticipant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YearEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "happenedAt" DATETIME,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "chronicle_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "happenedAt" DATETIME NOT NULL,
    "year" INTEGER NOT NULL,
    "mediaId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "chronicle_events_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chronicle_events_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeDoc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "plannerProjectId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeDoc_plannerProjectId_fkey" FOREIGN KEY ("plannerProjectId") REFERENCES "PlannerProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeDoc_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlannerProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlannerProject_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlannerChatMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scopeKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "constraintsJson" TEXT,
    "plannerProjectId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlannerChatMemory_plannerProjectId_fkey" FOREIGN KEY ("plannerProjectId") REFERENCES "PlannerProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlannerChatMemory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgeDocId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgeChunk_knowledgeDocId_fkey" FOREIGN KEY ("knowledgeDocId") REFERENCES "KnowledgeDoc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ChronicleEventToMember" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ChronicleEventToMember_A_fkey" FOREIGN KEY ("A") REFERENCES "chronicle_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ChronicleEventToMember_B_fkey" FOREIGN KEY ("B") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ChronicleMediaAssets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ChronicleMediaAssets_A_fkey" FOREIGN KEY ("A") REFERENCES "chronicle_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ChronicleMediaAssets_B_fkey" FOREIGN KEY ("B") REFERENCES "MediaAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ChronicleEventToWork" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ChronicleEventToWork_A_fkey" FOREIGN KEY ("A") REFERENCES "chronicle_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ChronicleEventToWork_B_fkey" FOREIGN KEY ("B") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ChronicleEventToMatch" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ChronicleEventToMatch_A_fkey" FOREIGN KEY ("A") REFERENCES "chronicle_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ChronicleEventToMatch_B_fkey" FOREIGN KEY ("B") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "Family_label_key" ON "Family"("label");

-- CreateIndex
CREATE INDEX "Member_team_idx" ON "Member"("team");

-- CreateIndex
CREATE INDEX "Member_familyId_idx" ON "Member"("familyId");

-- CreateIndex
CREATE INDEX "MediaAsset_type_idx" ON "MediaAsset"("type");

-- CreateIndex
CREATE INDEX "MediaAsset_year_idx" ON "MediaAsset"("year");

-- CreateIndex
CREATE INDEX "MediaAsset_takenAt_idx" ON "MediaAsset"("takenAt");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "MediaPersonTag_memberId_idx" ON "MediaPersonTag"("memberId");

-- CreateIndex
CREATE INDEX "Work_type_idx" ON "Work"("type");

-- CreateIndex
CREATE INDEX "Work_year_idx" ON "Work"("year");

-- CreateIndex
CREATE INDEX "Work_authorMemberId_idx" ON "Work"("authorMemberId");

-- CreateIndex
CREATE INDEX "Work_createdAt_idx" ON "Work"("createdAt");

-- CreateIndex
CREATE INDEX "Match_playedAt_idx" ON "Match"("playedAt");

-- CreateIndex
CREATE INDEX "Match_mvpMemberId_idx" ON "Match"("mvpMemberId");

-- CreateIndex
CREATE INDEX "Match_createdAt_idx" ON "Match"("createdAt");

-- CreateIndex
CREATE INDEX "MatchParticipant_memberId_idx" ON "MatchParticipant"("memberId");

-- CreateIndex
CREATE INDEX "MatchParticipant_side_idx" ON "MatchParticipant"("side");

-- CreateIndex
CREATE INDEX "YearEvent_year_idx" ON "YearEvent"("year");

-- CreateIndex
CREATE INDEX "chronicle_events_year_idx" ON "chronicle_events"("year");

-- CreateIndex
CREATE INDEX "chronicle_events_happenedAt_idx" ON "chronicle_events"("happenedAt");

-- CreateIndex
CREATE INDEX "KnowledgeDoc_category_idx" ON "KnowledgeDoc"("category");

-- CreateIndex
CREATE INDEX "KnowledgeDoc_plannerProjectId_idx" ON "KnowledgeDoc"("plannerProjectId");

-- CreateIndex
CREATE INDEX "PlannerProject_year_idx" ON "PlannerProject"("year");

-- CreateIndex
CREATE UNIQUE INDEX "PlannerChatMemory_scopeKey_key" ON "PlannerChatMemory"("scopeKey");

-- CreateIndex
CREATE INDEX "PlannerChatMemory_plannerProjectId_idx" ON "PlannerChatMemory"("plannerProjectId");

-- CreateIndex
CREATE INDEX "PlannerChatMemory_createdByUserId_idx" ON "PlannerChatMemory"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_contentHash_key" ON "KnowledgeChunk"("contentHash");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_knowledgeDocId_idx" ON "KnowledgeChunk"("knowledgeDocId");

-- CreateIndex
CREATE UNIQUE INDEX "_ChronicleEventToMember_AB_unique" ON "_ChronicleEventToMember"("A", "B");

-- CreateIndex
CREATE INDEX "_ChronicleEventToMember_B_index" ON "_ChronicleEventToMember"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ChronicleMediaAssets_AB_unique" ON "_ChronicleMediaAssets"("A", "B");

-- CreateIndex
CREATE INDEX "_ChronicleMediaAssets_B_index" ON "_ChronicleMediaAssets"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ChronicleEventToWork_AB_unique" ON "_ChronicleEventToWork"("A", "B");

-- CreateIndex
CREATE INDEX "_ChronicleEventToWork_B_index" ON "_ChronicleEventToWork"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ChronicleEventToMatch_AB_unique" ON "_ChronicleEventToMatch"("A", "B");

-- CreateIndex
CREATE INDEX "_ChronicleEventToMatch_B_index" ON "_ChronicleEventToMatch"("B");

