const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not set. AI analysis features will be disabled.');
      this.enabled = false;
      return;
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    this.enabled = true;
  }

  isEnabled() {
    return this.enabled;
  }

  async analyzeCodeQuality(repositoryData, fileContents = [], languageStats = {}) {
    if (!this.enabled) {
      return this.getFallbackCodeQualityAnalysis(repositoryData, languageStats);
    }

    try {
      const prompt = this.buildCodeQualityPrompt(repositoryData, fileContents, languageStats);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(response.text());

      return {
        score: analysis.score,
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
      console.error('AI code quality analysis failed:', error);
      return this.getFallbackCodeQualityAnalysis(repositoryData, languageStats);
    }
  }

  async analyzeProjectStructure(repositoryData, fileStructure = [], packageJson = null) {
    if (!this.enabled) {
      return this.getFallbackStructureAnalysis(repositoryData);
    }

    try {
      const prompt = this.buildProjectStructurePrompt(repositoryData, fileStructure, packageJson);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(response.text());

      return {
        score: analysis.score,
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
      console.error('AI project structure analysis failed:', error);
      return this.getFallbackStructureAnalysis(repositoryData);
    }
  }

  async analyzeSkillAssessment(repositoryData, technicalIndicators = {}) {
    if (!this.enabled) {
      return this.getFallbackSkillAnalysis(repositoryData);
    }

    try {
      const prompt = this.buildSkillAssessmentPrompt(repositoryData, technicalIndicators);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(response.text());

      return {
        score: analysis.score,
        skillLevel: analysis.skillLevel || 'Intermediate',
        technicalProficiency: analysis.technicalProficiency || {},
        frameworkMastery: analysis.frameworkMastery || 75,
        bestPracticesAdherence: analysis.bestPracticesAdherence || 70,
        detectedSkills: analysis.detectedSkills || [],
        learningRecommendations: analysis.learningRecommendations || [],
        reasoning: analysis.reasoning || ''
      };
    } catch (error) {
      console.error('AI skill assessment failed:', error);
      return this.getFallbackSkillAnalysis(repositoryData);
    }
  }

  async generateRecommendations(allAnalysisResults, userContext = {}) {
    if (!this.enabled) {
      return this.getFallbackRecommendations(allAnalysisResults);
    }

    try {
      const prompt = this.buildRecommendationsPrompt(allAnalysisResults, userContext);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const recommendations = JSON.parse(response.text());

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
      console.error('AI recommendations generation failed:', error);
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

Please analyze and return a JSON response with:
{
  "score": (0-100 integer representing overall code quality),
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

Return JSON analysis:
{
  "score": (0-100 overall structure score),
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

Return JSON assessment:
{
  "score": (0-100 overall skill score),
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
    let baseScore = 60;

    if (repositoryData.description) baseScore += 10;
    if (languages.length > 0) baseScore += 10;
    if (repositoryData.stars > 5) baseScore += 5;

    return {
      score: Math.min(baseScore, 100),
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
    let baseScore = 65;
    if (repositoryData.size > 100) baseScore += 10;
    if (repositoryData.language) baseScore += 10;

    return {
      score: Math.min(baseScore, 100),
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
      score: 70,
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