const { GoogleGenerativeAI } = require('@google/generative-ai');
const { analysisLogger } = require('../config/logger');

class AIService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      analysisLogger.warn('🤖 AI 기능이 비활성화되었습니다 (GEMINI_API_KEY 없음)');
      this.enabled = false;
      return;
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    this.enabled = true;
    analysisLogger.info('🤖 AI 분석 서비스가 활성화되었습니다 (Gemini 2.5 Flash)');
  }

  isEnabled() {
    return this.enabled;
  }

  async analyzeCodeQuality(repositoryData, fileContents = [], languageStats = {}) {
    if (!this.enabled) {
      analysisLogger.warn('📊 코드 품질 분석: AI 비활성화 상태로 기본 분석 사용');
      return this.getFallbackCodeQualityAnalysis(repositoryData, languageStats);
    }

    try {
      analysisLogger.info(`📊 코드 품질 AI 분석 시작: ${repositoryData.name} (${repositoryData.language})`);
      const prompt = this.buildCodeQualityPrompt(repositoryData, fileContents, languageStats);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      analysisLogger.debug('📊 AI 응답 길이:', { responseLength: text.length });

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : text.trim();

      let analysis;
      try {
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        analysisLogger.warn('⚠️ AI 응답 파싱 실패, 기본 분석으로 전환', {
          responsePreview: text.substring(0, 200) + '...',
          parseError: parseError.message
        });
        return this.getFallbackCodeQualityAnalysis(repositoryData, languageStats);
      }

      // AI가 null이나 유효하지 않은 점수를 반환하면 fallback 사용
      if (analysis.score === null || analysis.score === undefined ||
          typeof analysis.score !== 'number' || analysis.score < 0) {
        analysisLogger.warn('⚠️ AI가 유효하지 않은 점수를 반환, 기본 분석으로 전환', { invalidScore: analysis.score });
        return this.getFallbackCodeQualityAnalysis(repositoryData, languageStats);
      }

      const finalScore = Math.min(Math.max(analysis.score, 0), 150);
      analysisLogger.info('✅ 코드 품질 AI 분석 완료', {
        repository: repositoryData.name,
        score: finalScore,
        strengthsCount: (analysis.strengths || []).length,
        improvementsCount: (analysis.improvements || []).length
      });

      return {
        score: finalScore, // 0-100 범위 보장
        metrics: {
          maintainabilityIndex: analysis.maintainabilityIndex || 75,
          cyclomaticComplexity: analysis.cyclomaticComplexity || 8,
          cognitiveComplexity: analysis.cognitiveComplexity || 6,
          duplicatedCodeRatio: analysis.duplicatedCodeRatio || 5,
          commentRatio: analysis.commentRatio || 10,
          technicalDebt: analysis.technicalDebt || 'Low'
        },
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
        reasoning: analysis.reasoning || ''
      };
    } catch (error) {
      analysisLogger.error('❌ 코드 품질 AI 분석 실패, 기본 분석으로 전환', {
        repository: repositoryData.name,
        error: error.message
      });
      return this.getFallbackCodeQualityAnalysis(repositoryData, languageStats);
    }
  }

  async analyzeProjectStructure(repositoryData, fileStructure = [], packageJson = null) {
    if (!this.enabled) {
      analysisLogger.warn('🏗️ 프로젝트 구조 분석: AI 비활성화 상태로 기본 분석 사용');
      return this.getFallbackStructureAnalysis(repositoryData);
    }

    try {
      analysisLogger.info(`🏗️ 프로젝트 구조 AI 분석 시작: ${repositoryData.name}`, {
        fileCount: fileStructure.length,
        hasPackageJson: !!packageJson
      });
      const prompt = this.buildProjectStructurePrompt(repositoryData, fileStructure, packageJson);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : text.trim();

      let analysis;
      try {
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        analysisLogger.warn('⚠️ AI 프로젝트 구조 분석 응답 파싱 실패, 기본 분석으로 전환', {
          responsePreview: text.substring(0, 200) + '...',
          parseError: parseError.message
        });
        return this.getFallbackStructureAnalysis(repositoryData);
      }

      // AI가 null이나 유효하지 않은 점수를 반환하면 fallback 사용
      if (analysis.score === null || analysis.score === undefined ||
          typeof analysis.score !== 'number' || analysis.score < 0) {
        analysisLogger.warn('⚠️ AI가 유효하지 않은 구조 점수를 반환, 기본 분석으로 전환', { invalidScore: analysis.score });
        return this.getFallbackStructureAnalysis(repositoryData);
      }

      const finalScore = Math.min(Math.max(analysis.score, 0), 120);
      analysisLogger.info('✅ 프로젝트 구조 AI 분석 완료', {
        repository: repositoryData.name,
        score: finalScore,
        detectedPatternsCount: (analysis.detectedPatterns || []).length,
        architectureScore: analysis.architectureScore || 80
      });

      return {
        score: finalScore,
        metrics: {
          architectureScore: analysis.architectureScore || 80,
          organizationScore: analysis.organizationScore || 85,
          conventionsScore: analysis.conventionsScore || 75,
          scalabilityScore: analysis.scalabilityScore || 70
        },
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
        detectedPatterns: analysis.detectedPatterns || [],
        reasoning: analysis.reasoning || ''
      };
    } catch (error) {
      analysisLogger.error('❌ 프로젝트 구조 AI 분석 실패, 기본 분석으로 전환', {
        repository: repositoryData.name,
        error: error.message
      });
      return this.getFallbackStructureAnalysis(repositoryData);
    }
  }

  async analyzeSkillAssessment(repositoryData, technicalIndicators = {}) {
    if (!this.enabled) {
      analysisLogger.warn('🎓 기술 역량 분석: AI 비활성화 상태로 기본 분석 사용');
      return this.getFallbackSkillAnalysis(repositoryData);
    }

    try {
      analysisLogger.info(`🎓 기술 역량 AI 분석 시작: ${repositoryData.name}`, {
        totalCommits: technicalIndicators.totalCommits,
        contributorsCount: technicalIndicators.contributorsCount
      });
      const prompt = this.buildSkillAssessmentPrompt(repositoryData, technicalIndicators);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : text.trim();

      let analysis;
      try {
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        analysisLogger.warn('⚠️ AI 기술 역량 분석 응답 파싱 실패, 기본 분석으로 전환', {
          responsePreview: text.substring(0, 200) + '...',
          parseError: parseError.message
        });
        return this.getFallbackSkillAnalysis(repositoryData);
      }

      // AI가 null이나 유효하지 않은 점수를 반환하면 fallback 사용
      if (analysis.score === null || analysis.score === undefined ||
          typeof analysis.score !== 'number' || analysis.score < 0) {
        analysisLogger.warn('⚠️ AI가 유효하지 않은 기술 역량 점수를 반환, 기본 분석으로 전환', { invalidScore: analysis.score });
        return this.getFallbackSkillAnalysis(repositoryData);
      }

      const finalScore = Math.min(Math.max(analysis.score, 0), 100);
      analysisLogger.info('✅ 기술 역량 AI 분석 완료', {
        repository: repositoryData.name,
        score: finalScore,
        skillLevel: analysis.skillLevel || 'Intermediate',
        detectedSkillsCount: (analysis.detectedSkills || []).length
      });

      return {
        score: finalScore,
        skillLevel: analysis.skillLevel || 'Intermediate',
        technicalProficiency: analysis.technicalProficiency || {},
        frameworkMastery: analysis.frameworkMastery || 75,
        bestPracticesAdherence: analysis.bestPracticesAdherence || 70,
        detectedSkills: analysis.detectedSkills || [],
        learningRecommendations: analysis.learningRecommendations || [],
        reasoning: analysis.reasoning || ''
      };
    } catch (error) {
      analysisLogger.error('❌ 기술 역량 AI 분석 실패, 기본 분석으로 전환', {
        repository: repositoryData.name,
        error: error.message
      });
      return this.getFallbackSkillAnalysis(repositoryData);
    }
  }

  async generateRecommendations(allAnalysisResults, userContext = {}) {
    if (!this.enabled) {
      analysisLogger.warn('💡 개선 추천 생성: AI 비활성화 상태로 기본 추천 사용');
      return this.getFallbackRecommendations(allAnalysisResults);
    }

    try {
      analysisLogger.info('💡 개선 추천 AI 생성 시작', {
        codeQualityScore: allAnalysisResults.codeQuality?.score,
        structureScore: allAnalysisResults.projectStructure?.score,
        skillScore: allAnalysisResults.skillAssessment?.score
      });
      const prompt = this.buildRecommendationsPrompt(allAnalysisResults, userContext);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : text.trim();

      const recommendations = JSON.parse(jsonText);

      analysisLogger.info('✅ 개선 추천 AI 생성 완료', {
        recommendationsCount: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'high').length
      });

      return recommendations.map(rec => ({
        priority: rec.priority || 'medium',
        category: rec.category || 'general',
        title: rec.title || 'Improvement Needed',
        description: rec.description || 'Consider making improvements to this area.',
        actionItems: rec.actionItems || [],
        estimatedImpact: rec.estimatedImpact || '+2-3 points',
        effort: rec.effort || 'medium',
        timeframe: rec.timeframe || '1-2 weeks',
        reasoning: rec.reasoning || ''
      }));
    } catch (error) {
      analysisLogger.error('❌ 개선 추천 AI 생성 실패, 기본 추천으로 전환', {
        error: error.message
      });
      return this.getFallbackRecommendations(allAnalysisResults);
    }
  }

  buildCodeQualityPrompt(repositoryData, fileContents, languageStats) {
    return `
Analyze the code quality of this ${repositoryData.language || 'software'} project:

Repository Information:
- Name: ${repositoryData.name}
- Description: ${repositoryData.description || 'No description'}
- Language: ${repositoryData.language || 'Mixed'}
- Size: ${repositoryData.size} KB
- Stars: ${repositoryData.stars || 0}
- Forks: ${repositoryData.forks || 0}

Language Statistics: ${JSON.stringify(languageStats)}

Sample File Contents (first 500 chars each):
${fileContents.slice(0, 3).map(file => `
File: ${file.name}
${file.content.substring(0, 500)}...
`).join('\n')}

IMPORTANT: Our scoring system uses a bit-based tier system where:
- Intern level: 0-127 bytes (0-1016 bits)
- Junior Dev: 128-255 bytes (1024-2040 bits)
- Senior Dev: 256-767 bytes (2048-6136 bits)
- Architect: 768+ bytes (6144+ bits)

Score projects realistically - typical good projects should score 50-90 bits (representing solid code quality).
Exceptional projects with advanced patterns, testing, and architecture might score 100+ bits.

Please analyze and return a JSON response with:
{
  "score": (0-150 bits representing code quality level - consider project complexity and skill demonstration),
  "maintainabilityIndex": (0-100 float),
  "cyclomaticComplexity": (average complexity score),
  "cognitiveComplexity": (average cognitive complexity),
  "duplicatedCodeRatio": (0-100 percentage),
  "commentRatio": (0-100 percentage),
  "technicalDebt": ("Low"|"Medium"|"High"),
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "reasoning": "Brief explanation of the analysis"
}

Focus on: code organization, naming conventions, complexity, documentation, testing patterns, and language-specific best practices.
Score should reflect realistic skill level - most projects should score 30-90 bits unless exceptional.
`;
  }

  buildProjectStructurePrompt(repositoryData, fileStructure, packageJson) {
    return `
Analyze the project structure and architecture:

Repository: ${repositoryData.name} (${repositoryData.language})
Description: ${repositoryData.description || 'No description'}

File Structure:
${fileStructure.slice(0, 20).join('\n')}

Package.json Dependencies:
${packageJson ? JSON.stringify(packageJson.dependencies, null, 2) : 'Not available'}

IMPORTANT: Our scoring system uses bits where typical good projects score 40-80 bits for structure.
Projects with excellent architecture, patterns, and organization might score 90+ bits.

Return JSON analysis:
{
  "score": (0-120 bits overall structure score),
  "architectureScore": (0-100),
  "organizationScore": (0-100),
  "conventionsScore": (0-100),
  "scalabilityScore": (0-100),
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "detectedPatterns": ["pattern1", "pattern2", ...],
  "reasoning": "Analysis explanation"
}

Evaluate: directory organization, separation of concerns, architectural patterns, dependency management, and scalability indicators.
Score realistically based on demonstrated architectural skills - most projects should score 30-80 bits.
`;
  }

  buildSkillAssessmentPrompt(repositoryData, technicalIndicators) {
    return `
Assess the developer's technical skills based on this project:

Project: ${repositoryData.name} (${repositoryData.language})
Technical Indicators: ${JSON.stringify(technicalIndicators)}

Repository Stats:
- Size: ${repositoryData.size} KB
- Commits: ${technicalIndicators.totalCommits || 'Unknown'}
- Contributors: ${technicalIndicators.contributorsCount || 1}
- Last Updated: ${repositoryData.updatedAt}

IMPORTANT: Our scoring system uses bits for skill assessment. Typical scores:
- Basic projects: 20-50 bits
- Good skill demonstration: 50-80 bits
- Advanced skills: 80+ bits

Return JSON assessment:
{
  "score": (0-100 bits overall skill score),
  "skillLevel": ("Beginner"|"Intermediate"|"Advanced"|"Expert"),
  "technicalProficiency": {
    "languageSpecific": (0-100),
    "frameworks": (0-100),
    "tooling": (0-100),
    "architecture": (0-100)
  },
  "frameworkMastery": (0-100),
  "bestPracticesAdherence": (0-100),
  "detectedSkills": ["skill1", "skill2", ...],
  "learningRecommendations": ["recommendation1", "recommendation2", ...],
  "reasoning": "Assessment explanation"
}

Consider: code complexity, framework usage, architectural decisions, best practices, and innovation.
Score based on demonstrated technical proficiency - most projects should score 20-70 bits.
`;
  }

  buildRecommendationsPrompt(allAnalysisResults, userContext) {
    return `
Generate personalized improvement recommendations:

Analysis Results:
${JSON.stringify(allAnalysisResults, null, 2)}

User Context:
${JSON.stringify(userContext, null, 2)}

Generate 3-5 actionable recommendations as JSON array:
[
  {
    "priority": ("high"|"medium"|"low"),
    "category": ("code_quality"|"testing"|"documentation"|"architecture"|"performance"|"security"),
    "title": "Recommendation title",
    "description": "Detailed description",
    "actionItems": ["action1", "action2", "action3"],
    "estimatedImpact": "+X-Y points",
    "effort": ("low"|"medium"|"high"),
    "timeframe": "time estimate",
    "reasoning": "Why this recommendation"
  }
]

Prioritize high-impact improvements that align with the user's current skill level and project goals.
`;
  }

  getFallbackCodeQualityAnalysis(repositoryData, languageStats) {
    const languages = Object.keys(languageStats);
    let baseScore = 50; // 티어 시스템에 맞게 조정 (50 bits)

    if (repositoryData.description) baseScore += 8;
    if (languages.length > 0) baseScore += 8;
    if (repositoryData.stars > 5) baseScore += 4;

    return {
      score: Math.min(baseScore, 80), // 최대 80 bits로 제한
      metrics: {
        maintainabilityIndex: 75,
        cyclomaticComplexity: 8,
        cognitiveComplexity: 6,
        duplicatedCodeRatio: 5,
        commentRatio: 10,
        technicalDebt: 'Medium'
      },
      strengths: ['Code compiles successfully', 'Project has clear structure'],
      improvements: ['Add more documentation', 'Consider refactoring complex functions'],
      reasoning: 'Basic analysis without AI assistance'
    };
  }

  getFallbackStructureAnalysis(repositoryData) {
    let baseScore = 45; // 티어 시스템에 맞게 조정 (45 bits)
    if (repositoryData.size > 100) baseScore += 8;
    if (repositoryData.language) baseScore += 7;

    return {
      score: Math.min(baseScore, 70), // 최대 70 bits로 제한
      metrics: {
        architectureScore: 70,
        organizationScore: 75,
        conventionsScore: 65,
        scalabilityScore: 60
      },
      strengths: ['Project follows basic structure conventions'],
      improvements: ['Consider improving directory organization'],
      detectedPatterns: ['Standard project layout'],
      reasoning: 'Basic structure analysis without AI assistance'
    };
  }

  getFallbackSkillAnalysis(repositoryData) {
    return {
      score: 40, // 티어 시스템에 맞게 조정 (40 bits) - 가중치 10%이므로 상대적으로 낮게
      skillLevel: 'Intermediate',
      technicalProficiency: {
        languageSpecific: 70,
        frameworks: 65,
        tooling: 60,
        architecture: 65
      },
      frameworkMastery: 65,
      bestPracticesAdherence: 70,
      detectedSkills: [repositoryData.language || 'Programming'].filter(Boolean),
      learningRecommendations: ['Improve testing practices', 'Learn more advanced patterns'],
      reasoning: 'Basic skill assessment without AI assistance'
    };
  }

  getFallbackRecommendations(allAnalysisResults) {
    const recommendations = [];

    if (allAnalysisResults.codeQuality?.score < 80) {
      recommendations.push({
        priority: 'high',
        category: 'code_quality',
        title: 'Improve Code Quality',
        description: 'Focus on improving code organization and documentation.',
        actionItems: ['Add code comments', 'Refactor complex functions', 'Improve naming conventions'],
        estimatedImpact: '+5-10 points',
        effort: 'medium',
        timeframe: '1-2 weeks',
        reasoning: 'Code quality score indicates room for improvement'
      });
    }

    if (allAnalysisResults.projectStructure?.score < 75) {
      recommendations.push({
        priority: 'medium',
        category: 'architecture',
        title: 'Enhance Project Structure',
        description: 'Improve project organization and architectural patterns.',
        actionItems: ['Organize files into logical directories', 'Implement proper separation of concerns'],
        estimatedImpact: '+3-7 points',
        effort: 'medium',
        timeframe: '1-2 weeks',
        reasoning: 'Project structure could be more organized'
      });
    }

    return recommendations;
  }
}

module.exports = new AIService();