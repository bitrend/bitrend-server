const { prisma } = require('../config/prisma');

class RecommendationService {
  async generateRecommendationsForAnalysis(analysisId, analysisData) {
    const recommendations = [];

    // Code quality recommendations
    const qualityRecs = this._generateCodeQualityRecommendations(analysisData);
    recommendations.push(...qualityRecs);

    // Architecture recommendations
    const architectureRecs = this._generateArchitectureRecommendations(analysisData);
    recommendations.push(...architectureRecs);

    // Performance recommendations
    const performanceRecs = this._generatePerformanceRecommendations(analysisData);
    recommendations.push(...performanceRecs);

    // Best practices recommendations
    const bestPracticesRecs = this._generateBestPracticesRecommendations(analysisData);
    recommendations.push(...bestPracticesRecs);

    // Save recommendations to database
    const savedRecommendations = await Promise.all(
      recommendations.map(rec =>
        prisma.recommendation.create({
          data: {
            analysisId,
            category: rec.category,
            title: rec.title,
            description: rec.description,
            priority: rec.priority,
            estimatedHours: rec.estimatedHours
          }
        })
      )
    );

    return savedRecommendations;
  }

  async getRecommendationsByAnalysis(analysisId) {
    return await prisma.recommendation.findMany({
      where: { analysisId },
      orderBy: { priority: 'desc' }
    });
  }

  async getUserRecommendations(userId, limit = 10) {
    return await prisma.recommendation.findMany({
      where: {
        analysis: {
          userId
        }
      },
      include: {
        analysis: {
          include: {
            evaluationProject: {
              include: {
                repository: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { analysis: { createdAt: 'desc' } }
      ],
      take: limit
    });
  }

  _generateCodeQualityRecommendations(analysisData) {
    const recommendations = [];
    const metrics = analysisData.metrics || {};

    // Cyclomatic complexity
    if (metrics.cyclomaticComplexity && metrics.cyclomaticComplexity > 10) {
      recommendations.push({
        category: 'code_quality',
        title: 'Reduce Cyclomatic Complexity',
        description: 'Functions with high cyclomatic complexity are harder to test and maintain. Consider breaking down complex functions into smaller, more focused ones.',
        priority: metrics.cyclomaticComplexity > 15 ? 5 : 3,
        estimatedHours: Math.min(Math.floor(metrics.cyclomaticComplexity / 5), 8)
      });
    }

    // Code duplication
    if (metrics.duplicationRate && metrics.duplicationRate > 0.1) {
      recommendations.push({
        category: 'code_quality',
        title: 'Reduce Code Duplication',
        description: 'Extract common functionality into reusable functions or modules to improve maintainability.',
        priority: metrics.duplicationRate > 0.2 ? 4 : 3,
        estimatedHours: Math.floor(metrics.duplicationRate * 20)
      });
    }

    // Comment ratio
    if (metrics.commentRatio && metrics.commentRatio < 0.1) {
      recommendations.push({
        category: 'code_quality',
        title: 'Improve Code Documentation',
        description: 'Add meaningful comments and documentation to improve code readability and maintainability.',
        priority: 2,
        estimatedHours: 4
      });
    }

    // Test coverage
    if (metrics.testCoverage && metrics.testCoverage < 0.7) {
      recommendations.push({
        category: 'code_quality',
        title: 'Increase Test Coverage',
        description: 'Add unit tests to improve code reliability and catch potential bugs early.',
        priority: metrics.testCoverage < 0.5 ? 4 : 3,
        estimatedHours: Math.floor((0.8 - metrics.testCoverage) * 40)
      });
    }

    return recommendations;
  }

  _generateArchitectureRecommendations(analysisData) {
    const recommendations = [];
    const metrics = analysisData.metrics || {};

    // Module dependencies
    if (metrics.dependencyCount && metrics.dependencyCount > 20) {
      recommendations.push({
        category: 'architecture',
        title: 'Review Dependencies',
        description: 'High number of dependencies can lead to security vulnerabilities and maintenance issues. Consider reducing unnecessary dependencies.',
        priority: 3,
        estimatedHours: 6
      });
    }

    // Directory structure
    if (metrics.directoryDepth && metrics.directoryDepth > 6) {
      recommendations.push({
        category: 'architecture',
        title: 'Simplify Directory Structure',
        description: 'Deep directory nesting can make navigation difficult. Consider flattening the structure.',
        priority: 2,
        estimatedHours: 4
      });
    }

    // File size
    if (metrics.averageFileSize && metrics.averageFileSize > 300) {
      recommendations.push({
        category: 'architecture',
        title: 'Break Down Large Files',
        description: 'Large files are harder to maintain. Consider splitting functionality into smaller, focused modules.',
        priority: 3,
        estimatedHours: 8
      });
    }

    return recommendations;
  }

  _generatePerformanceRecommendations(analysisData) {
    const recommendations = [];
    const metrics = analysisData.metrics || {};

    // Bundle size (for web projects)
    if (metrics.bundleSize && metrics.bundleSize > 1000000) { // 1MB
      recommendations.push({
        category: 'performance',
        title: 'Optimize Bundle Size',
        description: 'Large bundle sizes can impact loading times. Consider code splitting and tree shaking.',
        priority: 4,
        estimatedHours: 6
      });
    }

    // Image optimization
    if (metrics.unoptimizedImages && metrics.unoptimizedImages > 0) {
      recommendations.push({
        category: 'performance',
        title: 'Optimize Images',
        description: 'Unoptimized images can slow down your application. Consider using modern formats and compression.',
        priority: 3,
        estimatedHours: 2
      });
    }

    return recommendations;
  }

  _generateBestPracticesRecommendations(analysisData) {
    const recommendations = [];
    const metrics = analysisData.metrics || {};

    // Security
    if (metrics.securityIssues && metrics.securityIssues > 0) {
      recommendations.push({
        category: 'security',
        title: 'Address Security Issues',
        description: 'Security vulnerabilities detected. Review and fix identified security issues.',
        priority: 5,
        estimatedHours: metrics.securityIssues * 2
      });
    }

    // Configuration
    if (!metrics.hasReadme) {
      recommendations.push({
        category: 'documentation',
        title: 'Add README Documentation',
        description: 'A comprehensive README helps other developers understand and contribute to your project.',
        priority: 2,
        estimatedHours: 3
      });
    }

    // Git practices
    if (metrics.averageCommitSize && metrics.averageCommitSize > 1000) {
      recommendations.push({
        category: 'git',
        title: 'Improve Commit Practices',
        description: 'Large commits are harder to review. Consider making smaller, more focused commits.',
        priority: 2,
        estimatedHours: 1
      });
    }

    return recommendations;
  }

  async getPersonalizedLearningPath(userId) {
    // Get user's recent analyses and skills
    const userAnalyses = await prisma.analysis.findMany({
      where: { userId },
      include: {
        metrics: true,
        evaluationProject: {
          include: {
            repository: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (userAnalyses.length === 0) {
      return this._getDefaultLearningPath();
    }

    // Analyze user's skills and weaknesses
    const skillAnalysis = this._analyzeUserSkills(userAnalyses);

    // Generate personalized learning path
    const learningPath = this._generateLearningPath(skillAnalysis);

    return learningPath;
  }

  _analyzeUserSkills(analyses) {
    const skills = {
      codeQuality: { total: 0, count: 0 },
      architecture: { total: 0, count: 0 },
      performance: { total: 0, count: 0 },
      security: { total: 0, count: 0 },
      testing: { total: 0, count: 0 },
      documentation: { total: 0, count: 0 }
    };

    analyses.forEach(analysis => {
      analysis.metrics.forEach(metric => {
        switch (metric.category) {
          case 'code_quality':
            skills.codeQuality.total += metric.value / (metric.maxValue || 100);
            skills.codeQuality.count++;
            break;
          case 'architecture':
            skills.architecture.total += metric.value / (metric.maxValue || 100);
            skills.architecture.count++;
            break;
          case 'performance':
            skills.performance.total += metric.value / (metric.maxValue || 100);
            skills.performance.count++;
            break;
          case 'security':
            skills.security.total += metric.value / (metric.maxValue || 100);
            skills.security.count++;
            break;
          case 'testing':
            skills.testing.total += metric.value / (metric.maxValue || 100);
            skills.testing.count++;
            break;
          case 'documentation':
            skills.documentation.total += metric.value / (metric.maxValue || 100);
            skills.documentation.count++;
            break;
        }
      });
    });

    // Calculate averages and identify weaknesses
    const skillAverages = {};
    const weakAreas = [];

    Object.keys(skills).forEach(skill => {
      if (skills[skill].count > 0) {
        skillAverages[skill] = skills[skill].total / skills[skill].count;
        if (skillAverages[skill] < 0.6) {
          weakAreas.push(skill);
        }
      }
    });

    return { skillAverages, weakAreas };
  }

  _generateLearningPath(skillAnalysis) {
    const { skillAverages, weakAreas } = skillAnalysis;
    const learningPath = [];

    // Prioritize weak areas
    weakAreas.forEach(area => {
      const pathItem = this._getLearningPathForSkill(area, skillAverages[area]);
      learningPath.push(pathItem);
    });

    // Add general improvement suggestions
    Object.keys(skillAverages).forEach(skill => {
      if (!weakAreas.includes(skill) && skillAverages[skill] < 0.8) {
        const pathItem = this._getLearningPathForSkill(skill, skillAverages[skill], false);
        learningPath.push(pathItem);
      }
    });

    return learningPath.slice(0, 5); // Return top 5 recommendations
  }

  _getLearningPathForSkill(skill, currentLevel, isWeakArea = true) {
    const skillData = {
      codeQuality: {
        title: 'Code Quality Improvement',
        description: 'Learn clean code principles, refactoring techniques, and code review best practices.',
        resources: [
          'Clean Code by Robert Martin',
          'Refactoring: Improving the Design of Existing Code',
          'Code review guidelines and tools'
        ],
        estimatedWeeks: isWeakArea ? 4 : 2
      },
      architecture: {
        title: 'Software Architecture',
        description: 'Master design patterns, architectural principles, and system design.',
        resources: [
          'Design Patterns: Elements of Reusable Object-Oriented Software',
          'Clean Architecture by Robert Martin',
          'System design fundamentals'
        ],
        estimatedWeeks: isWeakArea ? 6 : 3
      },
      performance: {
        title: 'Performance Optimization',
        description: 'Learn performance profiling, optimization techniques, and scalability principles.',
        resources: [
          'High Performance Browser Networking',
          'Performance optimization tools and techniques',
          'Caching strategies'
        ],
        estimatedWeeks: isWeakArea ? 3 : 2
      },
      security: {
        title: 'Security Best Practices',
        description: 'Understand common vulnerabilities and secure coding practices.',
        resources: [
          'OWASP Top 10',
          'Secure coding guidelines',
          'Security testing tools'
        ],
        estimatedWeeks: isWeakArea ? 4 : 2
      },
      testing: {
        title: 'Testing Strategies',
        description: 'Master unit testing, integration testing, and test-driven development.',
        resources: [
          'Test-Driven Development by Example',
          'Testing framework documentation',
          'Mocking and stubbing techniques'
        ],
        estimatedWeeks: isWeakArea ? 3 : 2
      },
      documentation: {
        title: 'Technical Documentation',
        description: 'Learn to write clear, comprehensive documentation for your projects.',
        resources: [
          'Documentation best practices',
          'API documentation tools',
          'README writing guidelines'
        ],
        estimatedWeeks: isWeakArea ? 2 : 1
      }
    };

    return {
      ...skillData[skill],
      currentLevel: Math.round(currentLevel * 100),
      priority: isWeakArea ? 'high' : 'medium'
    };
  }

  _getDefaultLearningPath() {
    return [
      {
        title: 'Code Quality Fundamentals',
        description: 'Start with clean code principles and basic refactoring techniques.',
        resources: [
          'Clean Code by Robert Martin',
          'JavaScript/Python style guides',
          'Code review basics'
        ],
        estimatedWeeks: 3,
        currentLevel: 0,
        priority: 'high'
      },
      {
        title: 'Version Control Mastery',
        description: 'Master Git workflows and collaboration techniques.',
        resources: [
          'Pro Git book',
          'Git branching strategies',
          'Pull request best practices'
        ],
        estimatedWeeks: 2,
        currentLevel: 0,
        priority: 'high'
      },
      {
        title: 'Testing Foundations',
        description: 'Learn unit testing and test-driven development basics.',
        resources: [
          'Testing framework tutorials',
          'Test-driven development',
          'Mocking techniques'
        ],
        estimatedWeeks: 3,
        currentLevel: 0,
        priority: 'medium'
      }
    ];
  }
}

module.exports = RecommendationService;