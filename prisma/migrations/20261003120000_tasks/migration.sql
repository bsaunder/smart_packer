-- Pre-trip / post-trip Tasks (DESIGN.md 1.12): master Tasks with one level of
-- sub-tasks, Module membership, and per-Trip snapshots (TripTask).

-- CreateEnum
CREATE TYPE "TaskAnchor" AS ENUM ('DEPARTURE', 'RETURN');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "anchor" "TaskAnchor" NOT NULL DEFAULT 'DEPARTURE',
    "offsetDays" INTEGER,
    "parentId" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleTask" (
    "moduleId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "ModuleTask_pkey" PRIMARY KEY ("moduleId","taskId")
);

-- CreateTable
CREATE TABLE "TripTask" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "sourceTaskId" TEXT,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "anchor" "TaskAnchor" NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" TIMESTAMP(3),
    "removed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TripTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_ownerId_idx" ON "Task"("ownerId");

-- CreateIndex
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_ownerId_name_key" ON "Task"("ownerId", "name");

-- CreateIndex
CREATE INDEX "ModuleTask_taskId_idx" ON "ModuleTask"("taskId");

-- CreateIndex
CREATE INDEX "TripTask_tripId_idx" ON "TripTask"("tripId");

-- CreateIndex
CREATE INDEX "TripTask_sourceTaskId_idx" ON "TripTask"("sourceTaskId");

-- CreateIndex
CREATE INDEX "TripTask_parentId_idx" ON "TripTask"("parentId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleTask" ADD CONSTRAINT "ModuleTask_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleTask" ADD CONSTRAINT "ModuleTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripTask" ADD CONSTRAINT "TripTask_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripTask" ADD CONSTRAINT "TripTask_sourceTaskId_fkey" FOREIGN KEY ("sourceTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripTask" ADD CONSTRAINT "TripTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TripTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

