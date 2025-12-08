-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "github_id" BIGINT NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "email" VARCHAR(255),
    "avatar_url" TEXT,
    "role" VARCHAR(100),
    "access_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_repositories" (
    "id" SERIAL NOT NULL,
    "github_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "language" VARCHAR(100),
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "size" INTEGER NOT NULL DEFAULT 0,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT NOT NULL,
    "clone_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_projects" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "repository_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "evaluation_project_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "score" DOUBLE PRECISION,
    "grade" VARCHAR(10),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_metrics" (
    "id" SERIAL NOT NULL,
    "analysis_id" INTEGER NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "max_value" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "analysis_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" SERIAL NOT NULL,
    "analysis_id" INTEGER NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "estimated_hours" INTEGER,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "action" VARCHAR(255) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_projects" INTEGER NOT NULL DEFAULT 0,
    "completed_analyses" INTEGER NOT NULL DEFAULT 0,
    "average_score" DOUBLE PRECISION,
    "last_analysis_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_rankings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "percentile" DOUBLE PRECISION NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex
CREATE INDEX "users_github_id_idx" ON "users"("github_id");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "github_repositories_github_id_key" ON "github_repositories"("github_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_repositories_full_name_key" ON "github_repositories"("full_name");

-- CreateIndex
CREATE INDEX "github_repositories_github_id_idx" ON "github_repositories"("github_id");

-- CreateIndex
CREATE INDEX "github_repositories_language_idx" ON "github_repositories"("language");

-- CreateIndex
CREATE INDEX "evaluation_projects_user_id_idx" ON "evaluation_projects"("user_id");

-- CreateIndex
CREATE INDEX "evaluation_projects_repository_id_idx" ON "evaluation_projects"("repository_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_projects_user_id_repository_id_key" ON "evaluation_projects"("user_id", "repository_id");

-- CreateIndex
CREATE INDEX "analyses_user_id_idx" ON "analyses"("user_id");

-- CreateIndex
CREATE INDEX "analyses_evaluation_project_id_idx" ON "analyses"("evaluation_project_id");

-- CreateIndex
CREATE INDEX "analyses_status_idx" ON "analyses"("status");

-- CreateIndex
CREATE INDEX "analysis_metrics_analysis_id_idx" ON "analysis_metrics"("analysis_id");

-- CreateIndex
CREATE INDEX "analysis_metrics_category_idx" ON "analysis_metrics"("category");

-- CreateIndex
CREATE INDEX "recommendations_analysis_id_idx" ON "recommendations"("analysis_id");

-- CreateIndex
CREATE INDEX "recommendations_priority_idx" ON "recommendations"("priority");

-- CreateIndex
CREATE INDEX "user_activities_user_id_idx" ON "user_activities"("user_id");

-- CreateIndex
CREATE INDEX "user_activities_type_idx" ON "user_activities"("type");

-- CreateIndex
CREATE INDEX "user_activities_created_at_idx" ON "user_activities"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_key" ON "user_stats"("user_id");

-- CreateIndex
CREATE INDEX "user_rankings_category_rank_idx" ON "user_rankings"("category", "rank");

-- CreateIndex
CREATE INDEX "user_rankings_calculated_at_idx" ON "user_rankings"("calculated_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_rankings_user_id_category_key" ON "user_rankings"("user_id", "category");

-- AddForeignKey
ALTER TABLE "evaluation_projects" ADD CONSTRAINT "evaluation_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_projects" ADD CONSTRAINT "evaluation_projects_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "github_repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_evaluation_project_id_fkey" FOREIGN KEY ("evaluation_project_id") REFERENCES "evaluation_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_metrics" ADD CONSTRAINT "analysis_metrics_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rankings" ADD CONSTRAINT "user_rankings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
