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

      const analysisId = await this.generateAnalysisId();

      const analysis = await analysisRepository.create({
        id: analysisId,
        userId,
        status: 'started',
        analysisType: options.analysisType || 'comprehensive',
        options: options
      });

      setImmediate(() => {
        this.performComprehensiveAnalysis(analysisId, evaluationProjects, options).catch(error => {
          console.error('Comprehensive analysis failed:', error);
        });
      });

      await userActivityRepository.logActivity(
        userId,
        'analysis',
        `Started comprehensive analysis of ${evaluationProjects.length} projects`,
        {
          analysisId,
          evaluationProjectIds,
          analysisType: options.analysisType || 'comprehensive'
        }
      );

      return {
        analysisId,
        status: 'started',
        projectsToAnalyze: evaluationProjects.map(project => ({
          evaluationProjectId: project.id,
          githubRepoName: project.repository.name,
          status: 'queued',
          estimatedDuration: '8-12 minutes'
        })),
        overallEstimatedDuration: `${evaluationProjects.length * 8}-${evaluationProjects.length * 15} minutes`,
        startedAt: new Date(),
        queuePosition: 1
      };
    } catch (error) {
      console.error('Error starting comprehensive analysis:', error);
      throw error;
    }
  }

  async performComprehensiveAnalysis(analysisId, evaluationProjects, options) {
    try {
      await analysisRepository.updateStatus(analysisId, 'running');

      const projectResults = [];
      const phases = [
        'Repository Analysis',
        'Code Quality Analysis',
        'Project Structure Analysis',
        'Contribution Pattern Analysis',
        'Skill Assessment',
        'Report Generation'
      ];

      await this.updateAnalysisPhase(analysisId, 'Repository Analysis', 'running');

      for (let i = 0; i < evaluationProjects.length; i++) {
        const project = evaluationProjects[i];
        const result = await this.analyzeProject(project, options);
        projectResults.push(result);

        await this.updateAnalysisProgress(analysisId, ((i + 1) / evaluationProjects.length) * 100);
      }

      await this.updateAnalysisPhase(analysisId, 'Code Quality Analysis', 'completed');
      await this.updateAnalysisPhase(analysisId, 'Project Structure Analysis', 'completed');
      await this.updateAnalysisPhase(analysisId, 'Contribution Pattern Analysis', 'completed');
      await this.updateAnalysisPhase(analysisId, 'Skill Assessment', 'completed');
      await this.updateAnalysisPhase(analysisId, 'Report Generation', 'running');

      const overallResults = await this.generateOverallResults(projectResults, options);

      const finalAnalysis = await analysisRepository.updateWithResults(analysisId, {
        status: 'completed',
        completedAt: new Date(),
        overallResults,
        projectResults,
        totalScore: overallResults.totalScore,
        grade: overallResults.overallGrade
      });

      await this.updateAnalysisPhase(analysisId, 'Report Generation', 'completed');

      await userStatsRepository.incrementAnalyses(
        evaluationProjects[0].userId,
        overallResults.totalScore
      );

      await userActivityRepository.logActivity(
        evaluationProjects[0].userId,
        'analysis',
        `Completed comprehensive analysis (Score: ${overallResults.totalScore.toFixed(1)}, Grade: ${overallResults.overallGrade})`,
        {
          analysisId,
          score: overallResults.totalScore,
          grade: overallResults.overallGrade,
          projectCount: projectResults.length
        }
      );

      return finalAnalysis;

    } catch (error) {
      console.error('Comprehensive analysis processing failed:', error);

      await analysisRepository.updateStatus(analysisId, 'failed', {
        completedAt: new Date(),
        error: error.message
      });

      throw error;
    }
  }

  async analyzeProject(evaluationProject, options) {
    const repository = evaluationProject.repository;
    const [owner, repo] = repository.fullName.split('/');
    const user = evaluationProject.user;

    if (!user.accessToken) {
      throw new Error('GitHub access token not found');
    }

    const [languages, stats, fileContents, fileStructure, packageJson] = await Promise.allSettled([
      githubService.getRepositoryLanguages(owner, repo, user.accessToken),
      githubService.getRepositoryStats(owner, repo, user.accessToken),
      this.getRepositoryFiles(owner, repo, user.accessToken),
      this.getRepositoryStructure(owner, repo, user.accessToken),
      this.getPackageJson(owner, repo, user.accessToken)
    ]);

    const analysisResults = {};

    if (options.includeCodeQuality !== false) {
      analysisResults.codeQuality = await aiService.analyzeCodeQuality(
        repository,
        fileContents.value || [],
        languages.value || []
      );
    }

    if (options.includeProjectStructure !== false) {
      analysisResults.projectStructure = await aiService.analyzeProjectStructure(
        repository,
        fileStructure.value || [],
        packageJson.value
      );
    }

    if (options.includeContributionPattern !== false) {
      analysisResults.contributionPattern = await this.analyzeContributionPattern(
        repository,
        stats.value
      );
    }

    if (options.includeSkillAssessment !== false) {
      analysisResults.skillAssessment = await aiService.analyzeSkillAssessment(
        repository,
        {
          languages: languages.value || [],
          stats: stats.value,
          fileStructure: fileStructure.value || []
        }
      );
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
}

module.exports = new EnhancedAnalysisService();