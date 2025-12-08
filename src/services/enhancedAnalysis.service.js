const analysisRepository = require('../repositories/analysis.repository');
const evaluationProjectRepository = require('../repositories/evaluationProject.repository');
const githubService = require('./github.service');
const aiService = require('./ai.service');
const userStatsRepository = require('../repositories/userStats.repository');
const userActivityRepository = require('../repositories/userActivity.repository');

class EnhancedAnalysisService {
  async startComprehensiveAnalysis(userId, evaluationProjectIds, options = {}) {
    try {
      if (!evaluationProjectIds || evaluationProjectIds.length === 0) {
        const error = new Error('At least one evaluation project is required');
        error.statusCode = 400;
        error.code = 'INSUFFICIENT_PROJECTS';
        throw error;
      }

      const evaluationProjects = await evaluationProjectRepository.findByIds(evaluationProjectIds);

      if (evaluationProjects.length !== evaluationProjectIds.length) {
        const error = new Error('Some evaluation projects not found');
        error.statusCode = 404;
        throw error;
      }

      for (const project of evaluationProjects) {
        if (project.userId !== userId) {
          const error = new Error('Unauthorized to analyze some projects');
          error.statusCode = 403;
          throw error;
        }
      }

      // Create individual analyses for each project
      const analyses = [];
      for (const project of evaluationProjects) {
        const analysis = await analysisRepository.create({
          userId,
          evaluationProjectId: project.id,
          status: 'pending'
        });
        analyses.push(analysis);
      }

      // Start background processing for all analyses
      setImmediate(() => {
        this.performComprehensiveAnalysis(userId, analyses, evaluationProjects, options).catch(error => {
          console.error('Comprehensive analysis failed:', error);
        });
      });

      await userActivityRepository.logActivity(
        userId,
        'analysis',
        `Started comprehensive analysis of ${evaluationProjects.length} projects`,
        {
          analysisIds: analyses.map(a => a.id),
          evaluationProjectIds,
          analysisType: options.analysisType || 'comprehensive'
        }
      );

      return {
        analyses: analyses.map((analysis, idx) => ({
          analysisId: analysis.id,
          evaluationProjectId: analysis.evaluationProjectId,
          githubRepoName: evaluationProjects[idx].repository.name,
          status: 'pending'
        })),
        status: 'started',
        projectsToAnalyze: evaluationProjects.length,
        overallEstimatedDuration: `${evaluationProjects.length * 8}-${evaluationProjects.length * 15} minutes`,
        startedAt: new Date()
      };
    } catch (error) {
      console.error('Error starting comprehensive analysis:', error);
      throw error;
    }
  }

  async performComprehensiveAnalysis(userId, analyses, evaluationProjects, options) {
    try {
      const projectResults = [];

      // Process each analysis
      for (let i = 0; i < analyses.length; i++) {
        const analysis = analyses[i];
        const project = evaluationProjects[i];

        try {
          await analysisRepository.updateStatus(analysis.id, 'processing');

          const result = await this.analyzeProject(project, options);
          projectResults.push({
            ...result,
            analysisId: analysis.id
          });

          // Update individual analysis with results
          await analysisRepository.updateStatus(analysis.id, 'completed', {
            score: result.score,
            grade: result.grade,
            completedAt: new Date()
          });

        } catch (error) {
          console.error(`Analysis failed for project ${project.id}:`, error);
          await analysisRepository.updateStatus(analysis.id, 'failed', {
            completedAt: new Date()
          });
          projectResults.push({
            evaluationProjectId: project.id,
            analysisId: analysis.id,
            error: error.message,
            score: 0,
            grade: 'F'
          });
        }
      }

      // 개별 분석들은 이미 DB에 저장됨
      // UserStats의 averageScore를 재계산하여 종합 점수 업데이트
      await userStatsRepository.updateAverageScore(userId);

      // 종합 분석 결과 생성 (대시보드 응답용)
      const comprehensiveResults = await this.generateComprehensiveResults(projectResults, options);

      await userActivityRepository.logActivity(
        userId,
        'analysis',
        `Completed comprehensive analysis (${comprehensiveResults.successfulCount}/${comprehensiveResults.projectCount} projects, Score: ${comprehensiveResults.overallScore.toFixed(1)})`,
        {
          analysisIds: analyses.map(a => a.id),
          projectCount: projectResults.length,
          successfulCount: comprehensiveResults.successfulCount,
          overallScore: comprehensiveResults.overallScore,
          overallGrade: comprehensiveResults.overallGrade
        }
      );

      return comprehensiveResults;

    } catch (error) {
      console.error('Comprehensive analysis processing failed:', error);

      // Mark all analyses as failed
      for (const analysis of analyses) {
        await analysisRepository.updateStatus(analysis.id, 'failed', {
          completedAt: new Date()
        }).catch(err => console.error('Failed to update analysis status:', err));
      }

      throw error;
    }
  }

  async analyzeProject(evaluationProject, options) {
    const repository = evaluationProject.repository;
    const [owner, repo] = repository.fullName.split('/');
    const user = evaluationProject.user;

    if (!user) {
      throw new Error('User information not found for evaluation project');
    }

    if (!user.accessToken) {
      throw new Error('GitHub access token not found');
    }

    // GitHub 데이터 수집 (Promise.allSettled로 일부 실패해도 계속 진행)
    const [languages, stats, fileContents, fileStructure, packageJson] = await Promise.allSettled([
      githubService.getRepositoryLanguages(owner, repo, user.accessToken),
      githubService.getRepositoryStats(owner, repo, user.accessToken),
      this.getRepositoryFiles(owner, repo, user.accessToken),
      this.getRepositoryStructure(owner, repo, user.accessToken),
      this.getPackageJson(owner, repo, user.accessToken)
    ]);

    // 결과 추출 및 에러 로깅
    const languagesData = languages.status === 'fulfilled' ? languages.value : null;
    const statsData = stats.status === 'fulfilled' ? stats.value : null;
    const fileContentsData = fileContents.status === 'fulfilled' ? fileContents.value : [];
    const fileStructureData = fileStructure.status === 'fulfilled' ? fileStructure.value : [];
    const packageJsonData = packageJson.status === 'fulfilled' ? packageJson.value : null;

    // 실패한 데이터 로깅
    if (languages.status === 'rejected') console.warn('Failed to fetch languages:', languages.reason?.message);
    if (stats.status === 'rejected') console.warn('Failed to fetch stats:', stats.reason?.message);
    if (fileContents.status === 'rejected') console.warn('Failed to fetch file contents:', fileContents.reason?.message);
    if (fileStructure.status === 'rejected') console.warn('Failed to fetch file structure:', fileStructure.reason?.message);
    if (packageJson.status === 'rejected') console.warn('Failed to fetch package.json:', packageJson.reason?.message);

    const analysisResults = {};

    // AI 분석 수행 (각각 개별 try-catch로 일부 실패해도 계속 진행)
    if (options.includeCodeQuality !== false) {
      try {
        analysisResults.codeQuality = await aiService.analyzeCodeQuality(
          repository,
          fileContentsData,
          languagesData || {}
        );
      } catch (error) {
        console.error('Code quality analysis failed:', error);
        analysisResults.codeQuality = aiService.getFallbackCodeQualityAnalysis(repository, languagesData);
      }
    }

    if (options.includeProjectStructure !== false) {
      try {
        analysisResults.projectStructure = await aiService.analyzeProjectStructure(
          repository,
          fileStructureData,
          packageJsonData
        );
      } catch (error) {
        console.error('Project structure analysis failed:', error);
        analysisResults.projectStructure = aiService.getFallbackStructureAnalysis(repository);
      }
    }

    if (options.includeContributionPattern !== false) {
      try {
        analysisResults.contributionPattern = await this.analyzeContributionPattern(
          repository,
          statsData
        );
      } catch (error) {
        console.error('Contribution pattern analysis failed:', error);
        analysisResults.contributionPattern = { score: 50, metrics: {}, strengths: [], improvements: [], reasoning: 'Fallback analysis due to error' };
      }
    }

    if (options.includeSkillAssessment !== false) {
      try {
        analysisResults.skillAssessment = await aiService.analyzeSkillAssessment(
          repository,
          {
            languages: languagesData || {},
            stats: statsData,
            fileStructure: fileStructureData
          }
        );
      } catch (error) {
        console.error('Skill assessment failed:', error);
        analysisResults.skillAssessment = aiService.getFallbackSkillAnalysis(repository);
      }
    }

    const projectScore = this.calculateProjectScore(analysisResults);
    const projectGrade = this.calculateGrade(projectScore);

    return {
      evaluationProjectId: evaluationProject.id,
      githubRepo: {
        name: repository.name,
        fullName: repository.fullName,
        language: repository.language,
        description: repository.description
      },
      score: projectScore,
      grade: projectGrade,
      weight: evaluationProject.weight || (1 / evaluationProject.length),
      analysis: analysisResults
    };
  }

  async analyzeContributionPattern(repository, stats) {
    const score = this.calculateContributionScore(repository, stats);

    const daysSinceUpdate = (new Date() - new Date(repository.updatedAt)) / (1000 * 60 * 60 * 24);

    return {
      score,
      metrics: {
        commitFrequency: this.calculateCommitFrequency(stats?.totalCommits, repository.createdAt),
        commitQuality: 85,
        branchingStrategy: stats?.branchCount > 1 ? 90 : 70,
        collaborationLevel: stats?.contributorsCount > 1 ? 85 : 60
      },
      strengths: [
        daysSinceUpdate < 30 ? 'Recent activity' : null,
        stats?.totalCommits > 20 ? 'Regular commits' : null,
        repository.forks > 0 ? 'Community interest' : null
      ].filter(Boolean),
      improvements: [
        daysSinceUpdate > 90 ? 'Increase commit frequency' : null,
        stats?.contributorsCount <= 1 ? 'Encourage collaboration' : null
      ].filter(Boolean),
      reasoning: 'Analysis based on commit patterns and repository activity'
    };
  }

  calculateContributionScore(repository, stats) {
    let score = 40;

    const daysSinceUpdate = (new Date() - new Date(repository.updatedAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 25;
    else if (daysSinceUpdate < 90) score += 15;
    else if (daysSinceUpdate < 180) score += 5;

    if (stats?.totalCommits > 20) score += 20;
    else if (stats?.totalCommits > 10) score += 10;
    else if (stats?.totalCommits > 5) score += 5;

    if (stats?.contributorsCount > 1) score += 10;
    if (repository.forks > 0) score += 5;

    return Math.min(score, 100);
  }

  calculateCommitFrequency(totalCommits, createdAt) {
    if (!totalCommits || !createdAt) return 50;

    const daysSinceCreated = (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24);
    const commitsPerDay = totalCommits / Math.max(daysSinceCreated, 1);

    if (commitsPerDay > 0.5) return 95;
    if (commitsPerDay > 0.2) return 85;
    if (commitsPerDay > 0.1) return 75;
    if (commitsPerDay > 0.05) return 65;
    return 50;
  }

  async generateOverallResults(projectResults, options) {
    const totalScore = this.calculateWeightedScore(projectResults);
    const overallGrade = this.calculateGrade(totalScore);
    const skillLevel = this.determineSkillLevel(totalScore);

    const skillAssessment = this.aggregateSkillAssessment(projectResults);
    const strongPoints = this.extractStrongPoints(projectResults);
    const improvementAreas = this.extractImprovementAreas(projectResults);

    let recommendations = [];
    if (options.generateRecommendations !== false) {
      recommendations = await aiService.generateRecommendations(
        { projectResults, totalScore, skillLevel },
        { userId: projectResults[0]?.userId }
      );
    }

    return {
      totalScore,
      overallGrade,
      skillLevel,
      ranking: {
        position: 0,
        outOf: 0,
        percentile: 0
      },
      skillAssessment,
      strongPoints,
      improvementAreas,
      recommendations
    };
  }

  calculateProjectScore(analysisResults) {
    const weights = {
      codeQuality: 0.35,
      projectStructure: 0.25,
      contributionPattern: 0.20,
      skillAssessment: 0.20
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([category, weight]) => {
      if (analysisResults[category]?.score !== undefined) {
        totalScore += analysisResults[category].score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  calculateWeightedScore(projectResults) {
    const totalWeight = projectResults.reduce((sum, result) => sum + result.weight, 0);
    const weightedSum = projectResults.reduce((sum, result) => sum + (result.score * result.weight), 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  calculateGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    return 'D';
  }

  determineSkillLevel(score) {
    if (score >= 90) return 'Expert';
    if (score >= 80) return 'Senior Developer';
    if (score >= 70) return 'Intermediate Developer';
    if (score >= 60) return 'Junior Developer';
    return 'Beginner';
  }

  aggregateSkillAssessment(projectResults) {
    const categories = ['frontend', 'backend', 'devOps', 'testing', 'documentation'];
    const assessment = {};

    categories.forEach(category => {
      const scores = projectResults
        .map(result => result.analysis.skillAssessment?.technicalProficiency?.[category])
        .filter(score => score !== undefined);

      assessment[category] = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 70;
    });

    return assessment;
  }

  extractStrongPoints(projectResults) {
    const allStrengths = [];
    projectResults.forEach(result => {
      Object.values(result.analysis).forEach(analysis => {
        if (analysis.strengths) {
          allStrengths.push(...analysis.strengths);
        }
      });
    });

    return [...new Set(allStrengths)].slice(0, 5);
  }

  extractImprovementAreas(projectResults) {
    const allImprovements = [];
    projectResults.forEach(result => {
      Object.values(result.analysis).forEach(analysis => {
        if (analysis.improvements) {
          allImprovements.push(...analysis.improvements);
        }
      });
    });

    return [...new Set(allImprovements)].slice(0, 5);
  }

  async getRepositoryFiles(owner, repo, accessToken) {
    try {
      return await githubService.getRepositoryFiles(owner, repo, accessToken);
    } catch (error) {
      console.warn('Failed to fetch repository files:', error.message);
      return [];
    }
  }

  async getRepositoryStructure(owner, repo, accessToken) {
    try {
      return await githubService.getRepositoryStructure(owner, repo, accessToken);
    } catch (error) {
      console.warn('Failed to fetch repository structure:', error.message);
      return [];
    }
  }

  async getPackageJson(owner, repo, accessToken) {
    try {
      return await githubService.getPackageJson(owner, repo, accessToken);
    } catch (error) {
      console.warn('Failed to fetch package.json:', error.message);
      return null;
    }
  }

  async updateAnalysisPhase(analysisId, phase, status) {
    // Implementation for updating analysis phase in database
    console.log(`Analysis ${analysisId}: ${phase} - ${status}`);
  }

  async updateAnalysisProgress(analysisId, progress) {
    // Implementation for updating analysis progress in database
    console.log(`Analysis ${analysisId}: ${progress}% completed`);
  }

  async generateAnalysisId() {
    return `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getAnalysisStatus(userId, analysisId) {
    try {
      const analysis = await analysisRepository.findById(analysisId);

      if (!analysis) {
        const error = new Error('Analysis not found');
        error.statusCode = 404;
        throw error;
      }

      if (analysis.userId !== userId) {
        const error = new Error('Unauthorized to access this analysis');
        error.statusCode = 403;
        throw error;
      }

      return analysis;
    } catch (error) {
      console.error('Error fetching analysis status:', error);
      throw error;
    }
  }

  async getAnalysisResults(userId, analysisId) {
    try {
      const analysis = await this.getAnalysisStatus(userId, analysisId);

      if (analysis.status !== 'completed') {
        const error = new Error('Analysis is not completed yet');
        error.statusCode = 400;
        error.code = 'ANALYSIS_NOT_COMPLETED';
        throw error;
      }

      return analysis;
    } catch (error) {
      console.error('Error fetching analysis results:', error);
      throw error;
    }
  }

  async generateComprehensiveResults(projectResults, options) {
    const successfulResults = projectResults.filter(r => !r.error && r.score != null);
    
    if (successfulResults.length === 0) {
      throw new Error('All project analyses failed');
    }

    // Calculate weighted average score
    const totalWeight = successfulResults.reduce((sum, r) => sum + (r.weight || 1), 0);
    const overallScore = successfulResults.reduce((sum, r) => {
      const weight = r.weight || 1;
      return sum + (r.score * weight);
    }, 0) / totalWeight;

    const overallGrade = this.calculateGrade(overallScore);

    // Aggregate metrics across all projects
    const aggregatedMetrics = this.aggregateMetrics(successfulResults);

    // Generate comprehensive insights
    const insights = this.generateComprehensiveInsights(successfulResults, aggregatedMetrics);

    return {
      overallScore,
      overallGrade,
      projectCount: projectResults.length,
      successfulCount: successfulResults.length,
      failedCount: projectResults.length - successfulResults.length,
      projects: projectResults.map(r => ({
        evaluationProjectId: r.evaluationProjectId,
        analysisId: r.analysisId,
        name: r.githubRepo?.name,
        score: r.score,
        grade: r.grade,
        error: r.error
      })),
      aggregatedMetrics,
      insights,
      strengths: insights.strengths,
      improvements: insights.improvements,
      detailedAnalysis: successfulResults.map(r => ({
        project: r.githubRepo,
        score: r.score,
        grade: r.grade,
        metrics: r.analysis
      }))
    };
  }

  aggregateMetrics(projectResults) {
    const metrics = {
      codeQuality: { total: 0, count: 0 },
      projectStructure: { total: 0, count: 0 },
      contributionPattern: { total: 0, count: 0 },
      skillAssessment: { total: 0, count: 0 },
      languages: {},
      totalProjects: projectResults.length
    };

    projectResults.forEach(result => {
      if (result.analysis?.codeQuality?.score) {
        metrics.codeQuality.total += result.analysis.codeQuality.score;
        metrics.codeQuality.count++;
      }
      if (result.analysis?.projectStructure?.score) {
        metrics.projectStructure.total += result.analysis.projectStructure.score;
        metrics.projectStructure.count++;
      }
      if (result.analysis?.contributionPattern?.score) {
        metrics.contributionPattern.total += result.analysis.contributionPattern.score;
        metrics.contributionPattern.count++;
      }
      if (result.analysis?.skillAssessment?.score) {
        metrics.skillAssessment.total += result.analysis.skillAssessment.score;
        metrics.skillAssessment.count++;
      }

      // Aggregate languages
      const lang = result.githubRepo?.language;
      if (lang) {
        metrics.languages[lang] = (metrics.languages[lang] || 0) + 1;
      }
    });

    return {
      averageCodeQuality: metrics.codeQuality.count > 0 ? metrics.codeQuality.total / metrics.codeQuality.count : 0,
      averageProjectStructure: metrics.projectStructure.count > 0 ? metrics.projectStructure.total / metrics.projectStructure.count : 0,
      averageContributionPattern: metrics.contributionPattern.count > 0 ? metrics.contributionPattern.total / metrics.contributionPattern.count : 0,
      averageSkillAssessment: metrics.skillAssessment.count > 0 ? metrics.skillAssessment.total / metrics.skillAssessment.count : 0,
      languages: metrics.languages,
      totalProjects: metrics.totalProjects
    };
  }

  generateComprehensiveInsights(projectResults, aggregatedMetrics) {
    const strengths = [];
    const improvements = [];
    const summary = [];

    // Analyze overall performance
    if (aggregatedMetrics.averageCodeQuality >= 80) {
      strengths.push('Consistently high code quality across projects');
    } else if (aggregatedMetrics.averageCodeQuality < 60) {
      improvements.push('Focus on improving code quality standards');
    }

    if (aggregatedMetrics.averageProjectStructure >= 80) {
      strengths.push('Well-organized project structures');
    } else if (aggregatedMetrics.averageProjectStructure < 60) {
      improvements.push('Enhance project organization and architecture');
    }

    if (Object.keys(aggregatedMetrics.languages).length > 2) {
      strengths.push('Diverse technology stack demonstrates versatility');
    }

    const topLanguage = Object.entries(aggregatedMetrics.languages)
      .sort((a, b) => b[1] - a[1])[0];
    if (topLanguage) {
      summary.push(`Primary expertise in ${topLanguage[0]} (${topLanguage[1]} projects)`);
    }

    if (projectResults.length >= 3) {
      strengths.push('Strong portfolio with multiple projects');
    } else {
      improvements.push('Build a more diverse project portfolio');
    }

    return {
      strengths,
      improvements,
      summary: summary.join('. '),
      overallAssessment: this.generateOverallAssessment(aggregatedMetrics)
    };
  }

  generateOverallAssessment(metrics) {
    const avgScore = (metrics.averageCodeQuality + metrics.averageProjectStructure + 
                     metrics.averageContributionPattern + metrics.averageSkillAssessment) / 4;

    if (avgScore >= 85) {
      return 'Exceptional developer with strong technical skills across multiple areas';
    } else if (avgScore >= 70) {
      return 'Solid developer with good technical foundation and room for growth';
    } else if (avgScore >= 55) {
      return 'Developing skills with potential for improvement';
    } else {
      return 'Early-stage developer with foundational skills';
    }
  }
}

module.exports = new EnhancedAnalysisService();