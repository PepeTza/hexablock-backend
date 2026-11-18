-- CreateEnum
CREATE TYPE "game_id" AS ENUM ('hexa-lines', 'hexa-fit', 'hexa-sort', 'hexa-merge');

-- CreateEnum
CREATE TYPE "role" AS ENUM ('player', 'admin');

-- CreateEnum
CREATE TYPE "seed_mode" AS ENUM ('fixed', 'random');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('accepted', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'player',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_progress" (
    "user_id" UUID NOT NULL,
    "game_id" "game_id" NOT NULL,
    "best_score" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "player_progress_pkey" PRIMARY KEY ("user_id","game_id")
);

-- CreateTable
CREATE TABLE "level_progress" (
    "user_id" UUID NOT NULL,
    "level_id" UUID NOT NULL,
    "best_score" INTEGER NOT NULL,
    "stars" SMALLINT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "level_progress_pkey" PRIMARY KEY ("user_id","level_id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" UUID NOT NULL,
    "game_id" "game_id" NOT NULL,
    "order" INTEGER NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "spec" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" UUID NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_configs" (
    "id" UUID NOT NULL,
    "game_id" "game_id" NOT NULL,
    "level_id" UUID,
    "mode" "seed_mode" NOT NULL,
    "value" BIGINT,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "seed_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_submissions" (
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" "game_id" NOT NULL,
    "level_id" UUID,
    "score" INTEGER NOT NULL,
    "seed" BIGINT,
    "move_count" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "finished_at" TIMESTAMPTZ NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "submission_status" NOT NULL,
    "reject_reason" TEXT,

    CONSTRAINT "score_submissions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "leaderboard_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "game_id" "game_id" NOT NULL,
    "level_id" UUID,
    "best_score" INTEGER NOT NULL,
    "achieved_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "levels_game_id_order_key" ON "levels"("game_id", "order");

-- CreateIndex
CREATE INDEX "score_submissions_user_id_received_at_idx" ON "score_submissions"("user_id", "received_at");

-- CreateIndex
CREATE INDEX "leaderboard_entries_game_id_level_id_best_score_achieved_at_idx" ON "leaderboard_entries"("game_id", "level_id", "best_score" DESC, "achieved_at" ASC);

-- AddForeignKey
ALTER TABLE "player_progress" ADD CONSTRAINT "player_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_progress" ADD CONSTRAINT "level_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_progress" ADD CONSTRAINT "level_progress_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "levels" ADD CONSTRAINT "levels_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seed_configs" ADD CONSTRAINT "seed_configs_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seed_configs" ADD CONSTRAINT "seed_configs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_submissions" ADD CONSTRAINT "score_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_submissions" ADD CONSTRAINT "score_submissions_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Partial unique indexes (data-model §5), written by hand: Prisma cannot
-- express them in the schema. NULL values are distinct in a normal unique
-- index, so one index covers the rows without a level (endless games) and
-- another the rows with a level (Fit and Sort).

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_per_game" ON "leaderboard_entries"("user_id", "game_id") WHERE "level_id" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_per_level" ON "leaderboard_entries"("user_id", "level_id") WHERE "level_id" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "seed_config_per_game" ON "seed_configs"("game_id") WHERE "level_id" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "seed_config_per_level" ON "seed_configs"("level_id") WHERE "level_id" IS NOT NULL;
