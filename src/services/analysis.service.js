const analysisRepository = require('../repositories/analysis.repository');
const evaluationProjectRepository = require('../repositories/evaluationProject.repository');
const githubService = require('./github.service');
const enhancedAnalysisService = require('./enhancedAnalysis.service');
const aiService = require('./ai.service');
const userStatsRepository = require('../repositories/userStats.repository');
const userActivityRepository = require('../repositories/userActivity.repository');

// Bit/Byte scoring system: 1024 bit = 128 byte
const MAX_SCORE_BIT = 1024;
const MAX_SCORE_BYTE = 128;

const startAnalysis = async (userId, evaluationProjectId) => {
  try {
    const evaluationProject = await evaluationProjectRepository.findById(evaluationProjectId);

    if (!evaluationProject) {
      const error = new Error('Evaluation project not found');
      error.statusCode = 404;
      throw error;
    }

    if (evaluationProject.userId !== userId) {
      const error = new Error('Unauthorized to analyze this project');
      error.statusCode = 403;
      throw error;
    }

    const existingAnalysis = await analysisRepository.findLatestByProjectId(evaluationProjectId);

    if (existingAnalysis && existingAnalysis.status === 'pending') {
      const error = new Error('Analysis already in progress for this project');
      error.statusCode = 400;
      error.code = 'ANALYSIS_IN_PROGRESS';
      throw error;
    }

    const analysis = await analysisRepository.create({
      userId,
      evaluationProjectId,
      status: 'pending'
    });

    setImmediate(() => {
      performAnalysis(analysis.id, evaluationProject).catch(error => {
        console.error('Analysis failed:', error);
      });
    });

    await userActivityRepository.logActivity(
      userId,
      'analysis',
      `Started analysis for project "${evaluationProject.repository.name}"`,
      {
        analysisId: analysis.id,
        evaluationProjectId,
        repositoryName: evaluationProject.repository.name
      }
    );

    return analysis;
  } catch (error) {
    console.error('Error starting analysis:', error);
    throw error;
  }
};

const performAnalysis = async (analysisId, evaluationProject) => {
  try {
    await analysisRepository.updateStatus(analysisId, 'processing');

    const repository = evaluationProject.repository;
    const [owner, repo] = repository.fullName.split('/');

    const user = evaluationProject.user;

    if (!user.accessToken) {
      throw new Error('GitHub access token not found');
    }

    // GitHub 데이터 수집
    const [languages, stats, files, fileStructure, packageJson] = await Promise.allSettled([
      githubService.getRepositoryLanguages(owner, repo, user.accessToken),
      githubService.getRepositoryStats(owner, repo, user.accessToken),
      githubService.getRepositoryFiles(owner, repo, user.accessToken, 10), // 최대 10개 파일
      githubService.getRepositoryStructure(owner, repo, user.accessToken),
      githubService.getPackageJson(owner, repo, user.accessToken)
    ]);

    const metrics = [];
    const languageStats = languages.value || [];
    const repoStats = stats.value || {};
    const fileContents = files.value || [];
    const structure = fileStructure.value || [];
    const packageData = packageJson.value || null;

    // AI 분석 활성화 여부 확인
    const useAI = aiService.isEnabled();

    // 1. Code Quality Analysis (35% weight, max 358.4 bits)
    let codeQualityScore = 0;
    if (useAI) {
      const aiQuality = await aiService.analyzeCodeQuality(repository, fileContents, languageStats);
      codeQualityScore = (aiQuality.score / 100) * 358.4; // Convert to bits
      
      metrics.push({
        category: 'code_quality',
        name: 'maintainability_index',
        value: aiQuality.metrics.maintainabilityIndex,
        maxValue: 100,
        weight: 0.1
      });
      
      metrics.push({
        category: 'code_quality',
        name: 'overall_score',
        value: codeQualityScore,
        maxValue: 358.4,
        weight: 0.35
      });
    } else {
      codeQualityScore = calculateCodeQuality(repository, languageStats, repoStats, structure, packageData);
      metrics.push({
        category: 'code_quality',
        name: 'overall_score',
        value: codeQualityScore,
        maxValue: 358.4,
        weight: 0.35
      });
    }

    // 2. Project Structure Analysis (30% weight, max 307.2 bits)
    let projectStructureScore = 0;
    if (useAI) {
      const aiStructure = await aiService.analyzeProjectStructure(repository, structure, packageData);
      projectStructureScore = (aiStructure.score / 100) * 307.2; // Convert to bits
      
      metrics.push({
        category: 'project_structure',
        name: 'architecture_score',
        value: aiStructure.metrics.architectureScore,
        maxValue: 100,
        weight: 0.08
      });
      
      metrics.push({
        category: 'project_structure',
        name: 'overall_score',
        value: projectStructureScore,
        maxValue: 307.2,
        weight: 0.30
      });
    } else {
      projectStructureScore = calculateProjectStructure(repository, repoStats, structure, packageData);
      metrics.push({
        category: 'project_structure',
        name: 'overall_score',
        value: projectStructureScore,
        maxValue: 307.2,
        weight: 0.30
      });
    }

    // 3. Contribution Pattern / Activity (25% weight, max 256 bits)
    const activityScore = calculateActivity(repository, repoStats);
    metrics.push({
      category: 'activity',
      name: 'overall_score',
      value: activityScore,
      maxValue: 256,
      weight: 0.25
    });

    // 4. Skill Assessment (10% weight, max 102.4 bits)
    let skillScore = 0;
    if (useAI) {
      const technicalIndicators = {
        commits: repoStats.totalCommits || 0,
        contributors: repoStats.contributorsCount || 1,
        languages: languageStats,
        hasTests: structure.some(f => f.path.includes('test') || f.path.includes('spec')),
        hasCI: structure.some(f => f.path.includes('.github/workflows') || f.path.includes('.gitlab-ci'))
      };
      
      const aiSkill = await aiService.analyzeSkillAssessment(repository, technicalIndicators);
      skillScore = (aiSkill.score / 100) * 102.4; // Convert to bits
      
      metrics.push({
        category: 'languages',
        name: 'skill_level',
        value: skillScore,
        maxValue: 102.4,
        weight: 0.10
      });
    } else {
      skillScore = calculateSkillScore(languageStats, repoStats, packageData);
      metrics.push({
        category: 'languages',
        name: 'skill_level',
        value: skillScore,
        maxValue: 153.6,
        weight: 0.15
      });
    }

    // 총점 계산 (bits) - 새로운 가중치: 35% + 30% + 25% + 15% = 105% → 100%로 정규화
    // 실제로는 35% + 30% + 25% + 10% = 100%를 유지하되, 스킬 점수 비중을 높임
    const totalScoreBit = codeQualityScore + projectStructureScore + activityScore + (skillScore * (102.4 / 153.6));
    const grade = calculateGradeFromBits(totalScoreBit);

    await analysisRepository.createMetrics(
      metrics.map(metric => ({
        analysisId,
        ...metric
      }))
    );

    // AI 기반 추천사항 생성
    let recommendations = [];
    if (useAI) {
      const allMetrics = {
        codeQuality: codeQualityScore,
        projectStructure: projectStructureScore,
        activity: activityScore,
        skill: skillScore,
        totalBit: totalScoreBit,
        grade
      };
      
      const aiRecommendations = await aiService.generateRecommendations(
        repository,
        allMetrics,
        languageStats
      );
      
      recommendations = aiRecommendations.map(rec => ({
        category: rec.category,
        title: rec.title,
        description: rec.description,
        priority: rec.priority === 'high' ? 3 : rec.priority === 'medium' ? 2 : 1,
        estimatedHours: rec.timeframe ? estimateHours(rec.timeframe) : null
      }));
    } else {
      recommendations = generateRecommendations(metrics, repository);
    }

    if (recommendations.length > 0) {
      await analysisRepository.createRecommendations(
        recommendations.map(rec => ({
          analysisId,
          ...rec
        }))
      );
    }

    await analysisRepository.updateScore(analysisId, totalScoreBit, grade);

    await userStatsRepository.incrementAnalyses(evaluationProject.userId, totalScoreBit);

    await userActivityRepository.logActivity(
      evaluationProject.userId,
      'analysis',
      `Completed analysis for project "${repository.name}" (Score: ${totalScoreBit.toFixed(1)} bits / ${(totalScoreBit / 8).toFixed(2)} bytes, Grade: ${grade})`,
      {
        analysisId,
        score: totalScoreBit,
        grade,
        repositoryName: repository.name
      }
    );

  } catch (error) {
    console.error('Analysis processing failed:', error);

    await analysisRepository.updateStatus(analysisId, 'failed', {
      completedAt: new Date()
    });

    await userActivityRepository.logActivity(
      evaluationProject.userId,
      'analysis',
      `Analysis failed for project "${evaluationProject.repository.name}"`,
      {
        analysisId,
        error: error.message,
        repositoryName: evaluationProject.repository.name
      }
    );
  }
};

// Fallback 계산 함수들 (AI 없을 때 사용, bit 단위 반환)
const calculateCodeQuality = (repository, languages, stats, structure = [], packageData = null) => {
  let score = 65; // 기본점 상향 조정 (0-100 scale)

  // 1. 문서화 점수 (0-20점)
  score += analyzeDocumentation(repository, structure);

  // 2. 코드 구조 복잡도 (0-15점)
  score += analyzeCodeComplexity(structure, repository);

  // 3. 테스트 존재 여부 (0-10점)
  score += analyzeTestPresence(structure);

  // 4. 설정 파일 품질 (0-8점)
  score += analyzeConfigQuality(packageData, structure);

  // 5. 프로젝트 성숙도 (0-12점)
  score += analyzeProjectMaturity(repository, stats, languages);

  score = Math.min(score, 130); // 최대 130점으로 상향

  // Convert to bits (35% of 1024 bits = 358.4 bits max)
  return (score / 130) * 358.4; // 130점 기준으로 정규화
};

const calculateProjectStructure = (repository, stats, structure = [], packageData = null) => {
  let score = 55; // 기본점 상향 조정

  // 1. 프로젝트 규모 및 복잡도 (0-25점)
  score += analyzeProjectScale(repository, structure);

  // 2. 모듈화 수준 (0-20점)
  score += analyzeModularization(structure, packageData);

  // 3. 아키텍처 패턴 (0-15점)
  score += analyzeArchitecturePattern(structure, repository);

  // 4. 의존성 관리 (0-12점)
  score += analyzeDependencyManagement(packageData);

  // 5. CI/CD 및 개발 도구 (0-8점)
  score += analyzeDevToolsSetup(structure);

  score = Math.min(score, 135); // 최대 135점으로 상향

  // Convert to bits (30% of 1024 bits = 307.2 bits max)
  return (score / 135) * 307.2; // 135점 기준으로 정규화
};

const calculateActivity = (repository, stats) => {
  let score = 40; // 기본점 상향 조정

  // 1. 최근 활동성 (0-25점)
  score += analyzeRecentActivity(repository, stats);

  // 2. 커밋 패턴 및 일관성 (0-20점)
  score += analyzeCommitPattern(stats);

  // 3. 협업 지표 (0-15점)
  score += analyzeCollaborationMetrics(repository, stats);

  // 4. 프로젝트 지속성 (0-15점)
  score += analyzeProjectSustainability(repository, stats);

  // 5. 커뮤니티 반응 (0-10점)
  score += analyzeCommunityEngagement(repository);

  score = Math.min(score, 125); // 최대 125점으로 상향

  // Convert to bits (25% of 1024 bits = 256 bits max)
  return (score / 125) * 256; // 125점 기준으로 정규화
};

const calculateSkillScore = (languages, stats, packageData = null) => {
  let score = 60; // 기본점 상향 조정

  // 1. 언어 다양성 및 숙련도 (0-25점)
  score += analyzeLanguageProficiency(languages);

  // 2. 기술 스택 현대성 (0-15점)
  score += analyzeTechStackModernity(packageData, languages);

  // 3. 고급 기술 사용 (0-12점)
  score += analyzeAdvancedTechUsage(packageData, languages);

  // 4. 프레임워크/라이브러리 활용 (0-10점)
  score += analyzeFrameworkUsage(packageData);

  // 5. 코딩 실력 지표 (0-8점)
  score += analyzeCodingSkillIndicators(stats, languages);

  score = Math.min(score, 130); // 최대 130점으로 상향

  // Convert to bits (15% of 1024 bits = 153.6 bits max) - 가중치 상향
  return (score / 130) * 153.6; // 15%로 가중치 증가
};

const calculateGradeFromBits = (bitScore) => {
  // Convert bit to byte (1 byte = 8 bits)
  const byteScore = Math.floor(bitScore / 8);
  
  if (byteScore >= 96) return 'A'; // 768+ bits
  if (byteScore >= 64) return 'B'; // 512+ bits
  if (byteScore >= 32) return 'C'; // 256+ bits
  if (byteScore >= 16) return 'D'; // 128+ bits
  return 'F';
};

const estimateHours = (timeframe) => {
  const timeframeMap = {
    'immediate': 1,
    '1-2 hours': 2,
    '2-4 hours': 3,
    '4-8 hours': 6,
    '1-2 days': 12,
    '2-5 days': 24,
    '1 week': 40,
    '2 weeks': 80
  };
  
  return timeframeMap[timeframe] || null;
};

const generateRecommendations = (metrics, repository) => {
  const recommendations = [];

  const codeQualityMetric = metrics.find(m => m.category === 'code_quality');
  if (codeQualityMetric && codeQualityMetric.value < 70) {
    recommendations.push({
      category: 'code_quality',
      title: 'Improve Code Quality',
      description: 'Consider adding more documentation, tests, and following coding best practices.',
      priority: 1,
      estimatedHours: 8
    });
  }

  const projectStructureMetric = metrics.find(m => m.category === 'project_structure');
  if (projectStructureMetric && projectStructureMetric.value < 70) {
    recommendations.push({
      category: 'project_structure',
      title: 'Enhance Project Structure',
      description: 'Organize code into logical modules and improve project architecture.',
      priority: 2,
      estimatedHours: 12
    });
  }

  const activityMetric = metrics.find(m => m.category === 'activity');
  if (activityMetric && activityMetric.value < 50) {
    recommendations.push({
      category: 'activity',
      title: 'Increase Project Activity',
      description: 'Make regular commits and updates to keep the project active.',
      priority: 3,
      estimatedHours: 4
    });
  }

  if (!repository.description) {
    recommendations.push({
      category: 'documentation',
      title: 'Add Project Description',
      description: 'Add a clear description to help others understand your project.',
      priority: 1,
      estimatedHours: 1
    });
  }

  return recommendations;
};

const getAnalysisStatus = async (userId, analysisId) => {
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
};

const getAnalysisResults = async (userId, analysisId) => {
  try {
    const analysis = await getAnalysisStatus(userId, analysisId);

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
};

const startComprehensiveAnalysis = async (userId, evaluationProjectIds, options = {}) => {
  return await enhancedAnalysisService.startComprehensiveAnalysis(userId, evaluationProjectIds, options);
};

const getComprehensiveAnalysisStatus = async (userId, analysisId) => {
  return await enhancedAnalysisService.getAnalysisStatus(userId, analysisId);
};

const getComprehensiveAnalysisResults = async (userId, analysisId) => {
  return await enhancedAnalysisService.getAnalysisResults(userId, analysisId);
};

// ===== 개선된 분석 함수들 =====

// 1. 문서화 분석 (0-20점)
const analyzeDocumentation = (repository, structure) => {
  let score = 0;

  // README 존재 및 품질
  if (repository.description) score += 3;
  const hasReadme = structure.some(path =>
    path.toLowerCase().includes('readme') &&
    (path.endsWith('.md') || path.endsWith('.txt'))
  );
  if (hasReadme) score += 7;

  // 문서 디렉토리
  const hasDocsDir = structure.some(path =>
    path.toLowerCase().includes('docs/') ||
    path.toLowerCase().includes('doc/')
  );
  if (hasDocsDir) score += 5;

  // API 문서, 라이선스 등
  const hasApiDocs = structure.some(path =>
    path.toLowerCase().includes('api') && path.endsWith('.md')
  );
  const hasLicense = structure.some(path =>
    path.toLowerCase().includes('license')
  );

  if (hasApiDocs) score += 3;
  if (hasLicense) score += 2;

  return Math.min(score, 20);
};

// 2. 코드 복잡도 분석 (0-15점)
const analyzeCodeComplexity = (structure, repository) => {
  let score = 0;

  // 프로젝트 크기별 점수
  const fileCount = structure.length;
  if (fileCount > 50) score += 5;
  else if (fileCount > 20) score += 3;
  else if (fileCount > 5) score += 1;

  // 디렉토리 구조 깊이
  const maxDepth = Math.max(...structure.map(path => path.split('/').length));
  if (maxDepth >= 4 && maxDepth <= 6) score += 4; // 적절한 깊이
  else if (maxDepth >= 3) score += 2;

  // 언어별 파일 분산도
  const extensions = structure.map(path => path.split('.').pop()).filter(Boolean);
  const uniqueExts = new Set(extensions).size;
  if (uniqueExts >= 3) score += 3;
  else if (uniqueExts >= 2) score += 2;

  // 프로젝트 크기 (KB)
  if (repository.size > 1000) score += 3;
  else if (repository.size > 100) score += 2;
  else if (repository.size > 10) score += 1;

  return Math.min(score, 15);
};

// 3. 테스트 존재 여부 분석 (0-10점)
const analyzeTestPresence = (structure) => {
  let score = 0;

  const testPatterns = [
    /test/i, /spec/i, /__tests__/i, /\.test\./i, /\.spec\./i
  ];

  const hasTestFiles = structure.some(path =>
    testPatterns.some(pattern => pattern.test(path))
  );

  if (hasTestFiles) {
    score += 6;

    // 테스트 디렉토리 구조
    const hasTestDir = structure.some(path =>
      path.toLowerCase().includes('test/') ||
      path.toLowerCase().includes('spec/') ||
      path.toLowerCase().includes('__tests__/')
    );
    if (hasTestDir) score += 2;

    // 다양한 테스트 타입
    const testTypes = structure.filter(path =>
      testPatterns.some(pattern => pattern.test(path))
    ).length;
    if (testTypes >= 5) score += 2;
  }

  return Math.min(score, 10);
};

// 4. 설정 파일 품질 분석 (0-8점)
const analyzeConfigQuality = (packageData, structure) => {
  let score = 0;

  // package.json 분석
  if (packageData) {
    score += 2;

    // scripts 존재
    if (packageData.scripts && Object.keys(packageData.scripts).length > 0) {
      score += 2;
    }

    // 의존성 개수 (적절한 수준)
    const depCount = Object.keys(packageData.dependencies || {}).length;
    if (depCount >= 5 && depCount <= 50) score += 1;
  }

  // 기타 설정 파일들
  const configFiles = ['.gitignore', '.eslintrc', '.prettierrc', 'tsconfig.json'];
  const existingConfigs = configFiles.filter(config =>
    structure.some(path => path.includes(config))
  );

  score += Math.min(existingConfigs.length, 3);

  return Math.min(score, 8);
};

// 5. 프로젝트 성숙도 분석 (0-12점)
const analyzeProjectMaturity = (repository, stats, languages) => {
  let score = 0;

  // Stars와 Forks
  if (repository.stars > 10) score += 3;
  else if (repository.stars > 0) score += 1;

  if (repository.forks > 5) score += 2;
  else if (repository.forks > 0) score += 1;

  // 커밋 수
  if (stats?.totalCommits > 50) score += 3;
  else if (stats?.totalCommits > 10) score += 2;
  else if (stats?.totalCommits > 0) score += 1;

  // 언어 사용
  if (languages?.length >= 2) score += 2;
  else if (languages?.length >= 1) score += 1;

  // 기여자 수
  if (stats?.contributorsCount > 3) score += 1;

  return Math.min(score, 12);
};

// ===== 프로젝트 구조 분석 함수들 =====

// 1. 프로젝트 규모 및 복잡도 (0-25점)
const analyzeProjectScale = (repository, structure) => {
  let score = 0;

  // 파일 수 기반 규모
  const fileCount = structure.length;
  if (fileCount > 100) score += 10;
  else if (fileCount > 50) score += 8;
  else if (fileCount > 20) score += 5;
  else if (fileCount > 10) score += 3;
  else if (fileCount > 5) score += 1;

  // 프로젝트 크기 (KB)
  if (repository.size > 5000) score += 8;
  else if (repository.size > 1000) score += 6;
  else if (repository.size > 500) score += 4;
  else if (repository.size > 100) score += 2;

  // 디렉토리 깊이 (적절한 구조화)
  const depths = structure.map(path => path.split('/').length - 1);
  const maxDepth = Math.max(...depths);
  const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;

  if (maxDepth >= 3 && maxDepth <= 8 && avgDepth >= 2) score += 7;
  else if (maxDepth >= 2) score += 4;

  return Math.min(score, 25);
};

// 2. 모듈화 수준 (0-20점)
const analyzeModularization = (structure, packageData) => {
  let score = 0;

  // 일반적인 프로젝트 구조 패턴
  const commonDirs = ['src', 'lib', 'components', 'utils', 'services', 'models'];
  const foundDirs = commonDirs.filter(dir =>
    structure.some(path => path.toLowerCase().includes(dir.toLowerCase()))
  );
  score += Math.min(foundDirs.length * 2, 10);

  // 분리된 설정 디렉토리
  const hasConfigDir = structure.some(path =>
    path.toLowerCase().includes('config') ||
    path.toLowerCase().includes('settings')
  );
  if (hasConfigDir) score += 3;

  // 모듈별 분리 (복수형 디렉토리)
  const modularPatterns = ['components/', 'modules/', 'features/', 'pages/'];
  const modularDirs = modularPatterns.filter(pattern =>
    structure.some(path => path.toLowerCase().includes(pattern))
  );
  score += Math.min(modularDirs.length * 2, 6);

  // package.json의 모듈 구조 (있다면)
  if (packageData?.type === 'module') score += 1;

  return Math.min(score, 20);
};

// 3. 아키텍처 패턴 (0-15점)
const analyzeArchitecturePattern = (structure, repository) => {
  let score = 0;

  // MVC 패턴
  const hasMVC = ['models', 'views', 'controllers'].every(dir =>
    structure.some(path => path.toLowerCase().includes(dir))
  );
  if (hasMVC) score += 6;

  // 레이어드 아키텍처
  const hasLayers = ['services', 'repositories', 'controllers'].filter(layer =>
    structure.some(path => path.toLowerCase().includes(layer))
  ).length;
  score += Math.min(hasLayers * 2, 6);

  // 관심사 분리
  const separationPatterns = ['api/', 'ui/', 'core/', 'shared/', 'common/'];
  const foundSeparations = separationPatterns.filter(pattern =>
    structure.some(path => path.toLowerCase().includes(pattern))
  );
  score += Math.min(foundSeparations.length, 3);

  return Math.min(score, 15);
};

// 4. 의존성 관리 (0-12점)
const analyzeDependencyManagement = (packageData) => {
  let score = 0;

  if (!packageData) return 0;

  // 의존성 존재 및 적절한 수준
  const deps = packageData.dependencies || {};
  const devDeps = packageData.devDependencies || {};
  const totalDeps = Object.keys(deps).length + Object.keys(devDeps).length;

  if (totalDeps >= 10 && totalDeps <= 100) score += 4;
  else if (totalDeps >= 5) score += 2;

  // devDependencies 분리
  if (Object.keys(devDeps).length > 0) score += 3;

  // 스크립트 존재
  const scripts = packageData.scripts || {};
  const scriptCount = Object.keys(scripts).length;
  if (scriptCount >= 5) score += 3;
  else if (scriptCount >= 3) score += 2;
  else if (scriptCount >= 1) score += 1;

  // 버전 명시 (semantic versioning)
  if (packageData.version) score += 1;
  if (packageData.engines) score += 1;

  return Math.min(score, 12);
};

// 5. CI/CD 및 개발 도구 (0-8점)
const analyzeDevToolsSetup = (structure) => {
  let score = 0;

  // GitHub Actions
  const hasGithubActions = structure.some(path =>
    path.includes('.github/workflows')
  );
  if (hasGithubActions) score += 3;

  // 다른 CI/CD 도구
  const ciPatterns = ['.gitlab-ci', '.travis', 'circle.yml', 'jenkins'];
  const hasCiCd = ciPatterns.some(pattern =>
    structure.some(path => path.includes(pattern))
  );
  if (hasCiCd && !hasGithubActions) score += 2;

  // 개발 도구 설정
  const devTools = ['.eslintrc', '.prettierrc', '.editorconfig', 'tsconfig.json'];
  const foundDevTools = devTools.filter(tool =>
    structure.some(path => path.includes(tool))
  );
  score += Math.min(foundDevTools.length, 3);

  // Docker
  const hasDocker = structure.some(path =>
    path.includes('Dockerfile') || path.includes('docker-compose')
  );
  if (hasDocker) score += 2;

  return Math.min(score, 8);
};

// ===== 활동성 분석 함수들 =====

// 1. 최근 활동성 (0-25점)
const analyzeRecentActivity = (repository, stats) => {
  let score = 0;

  const lastUpdate = new Date(repository.updatedAt || repository.pushedAt);
  const now = new Date();
  const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

  // 최근 업데이트
  if (daysSinceUpdate < 7) score += 15;
  else if (daysSinceUpdate < 30) score += 12;
  else if (daysSinceUpdate < 90) score += 8;
  else if (daysSinceUpdate < 180) score += 4;
  else if (daysSinceUpdate < 365) score += 1;

  // 푸시 활동
  if (repository.pushedAt) {
    const pushDate = new Date(repository.pushedAt);
    const daysSincePush = (now - pushDate) / (1000 * 60 * 60 * 24);

    if (daysSincePush < 7) score += 10;
    else if (daysSincePush < 30) score += 6;
    else if (daysSincePush < 90) score += 3;
  }

  return Math.min(score, 25);
};

// 2. 커밋 패턴 및 일관성 (0-20점)
const analyzeCommitPattern = (stats) => {
  let score = 0;

  const totalCommits = stats?.totalCommits || 0;

  // 커밋 수에 따른 점수
  if (totalCommits > 100) score += 10;
  else if (totalCommits > 50) score += 8;
  else if (totalCommits > 20) score += 6;
  else if (totalCommits > 10) score += 4;
  else if (totalCommits > 5) score += 2;
  else if (totalCommits > 0) score += 1;

  // 기여자당 커밋 비율 (협업 품질)
  const contributorsCount = stats?.contributorsCount || 1;
  const commitsPerContributor = totalCommits / contributorsCount;

  if (commitsPerContributor >= 10 && commitsPerContributor <= 50) score += 5;
  else if (commitsPerContributor >= 5) score += 3;

  // 프로젝트 지속 기간 대비 커밋 밀도 추정
  if (totalCommits > 0 && contributorsCount > 0) {
    score += Math.min(Math.floor(totalCommits / 10), 5);
  }

  return Math.min(score, 20);
};

// 3. 협업 지표 (0-15점)
const analyzeCollaborationMetrics = (repository, stats) => {
  let score = 0;

  // 기여자 수
  const contributors = stats?.contributorsCount || 0;
  if (contributors > 10) score += 8;
  else if (contributors > 5) score += 6;
  else if (contributors > 2) score += 4;
  else if (contributors > 1) score += 2;

  // Forks (프로젝트 관심도)
  if (repository.forks > 20) score += 4;
  else if (repository.forks > 10) score += 3;
  else if (repository.forks > 5) score += 2;
  else if (repository.forks > 0) score += 1;

  // Watchers
  if (repository.watchers > 10) score += 2;
  else if (repository.watchers > 0) score += 1;

  // Issues 및 PR 활동 추정 (간접 지표)
  if (contributors > 1 && repository.forks > 0) score += 1;

  return Math.min(score, 15);
};

// 4. 프로젝트 지속성 (0-15점)
const analyzeProjectSustainability = (repository, stats) => {
  let score = 0;

  // 프로젝트 연령
  const createdAt = new Date(repository.createdAt);
  const now = new Date();
  const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);

  if (ageInDays > 365) score += 5; // 1년 이상
  else if (ageInDays > 180) score += 3; // 6개월 이상
  else if (ageInDays > 90) score += 2; // 3개월 이상
  else if (ageInDays > 30) score += 1; // 1개월 이상

  // 지속적 개발 (커밋 수 vs 프로젝트 나이)
  const totalCommits = stats?.totalCommits || 0;
  const commitsPerMonth = totalCommits / (ageInDays / 30);

  if (commitsPerMonth >= 10) score += 5;
  else if (commitsPerMonth >= 5) score += 3;
  else if (commitsPerMonth >= 1) score += 2;

  // 활성 상태 vs 완성도 균형
  const lastUpdate = new Date(repository.updatedAt);
  const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);

  if (totalCommits > 20 && daysSinceUpdate < 180) score += 5; // 활발한 개발
  else if (totalCommits > 50 && daysSinceUpdate < 365) score += 3; // 성숙한 프로젝트

  return Math.min(score, 15);
};

// 5. 커뮤니티 반응 (0-10점)
const analyzeCommunityEngagement = (repository) => {
  let score = 0;

  // Stars (관심도)
  if (repository.stars > 100) score += 5;
  else if (repository.stars > 50) score += 4;
  else if (repository.stars > 20) score += 3;
  else if (repository.stars > 10) score += 2;
  else if (repository.stars > 0) score += 1;

  // Forks vs Stars 비율 (참여도)
  if (repository.stars > 0) {
    const forkRatio = repository.forks / repository.stars;
    if (forkRatio >= 0.1 && forkRatio <= 0.3) score += 3; // 건강한 비율
    else if (forkRatio > 0) score += 1;
  }

  // 전체적인 관심도
  const totalEngagement = repository.stars + repository.forks + (repository.watchers || 0);
  if (totalEngagement > 50) score += 2;
  else if (totalEngagement > 10) score += 1;

  return Math.min(score, 10);
};

// ===== 기술 역량 분석 함수들 =====

// 1. 언어 다양성 및 숙련도 (0-25점)
const analyzeLanguageProficiency = (languages) => {
  let score = 0;

  const langCount = languages.length;

  // 언어 다양성
  if (langCount >= 5) score += 15;
  else if (langCount >= 3) score += 12;
  else if (langCount >= 2) score += 8;
  else if (langCount >= 1) score += 4;

  // 언어 밸런스 (독점 vs 다양성)
  if (languages.length > 0) {
    const mainLangPercentage = parseFloat(languages[0].percentage);

    if (mainLangPercentage <= 70 && mainLangPercentage >= 40) score += 8; // 균형잡힌 사용
    else if (mainLangPercentage <= 80) score += 6;
    else if (mainLangPercentage <= 90) score += 4;
    else score += 2; // 단일 언어 집중
  }

  // 고급 언어 사용 (TypeScript, Rust, Go 등)
  const advancedLanguages = ['TypeScript', 'Rust', 'Go', 'Kotlin', 'Swift'];
  const usesAdvanced = languages.some(lang =>
    advancedLanguages.includes(lang.language)
  );
  if (usesAdvanced) score += 2;

  return Math.min(score, 25);
};

// 2. 기술 스택 현대성 (0-15점)
const analyzeTechStackModernity = (packageData, languages) => {
  let score = 0;

  // 현대적 언어 사용
  const modernLanguages = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Kotlin'];
  const usesModernLang = languages.some(lang =>
    modernLanguages.includes(lang.language)
  );
  if (usesModernLang) score += 5;

  // package.json의 현대적 의존성 (있다면)
  if (packageData?.dependencies) {
    const deps = Object.keys(packageData.dependencies);
    const modernFrameworks = ['react', 'vue', 'angular', 'next', 'nuxt', 'svelte'];
    const usesModernFramework = deps.some(dep =>
      modernFrameworks.some(framework => dep.includes(framework))
    );
    if (usesModernFramework) score += 5;

    // 현대적 개발 도구
    const devDeps = Object.keys(packageData.devDependencies || {});
    const modernDevTools = ['typescript', 'webpack', 'vite', 'rollup', 'esbuild'];
    const usesModernDevTools = devDeps.some(dep =>
      modernDevTools.some(tool => dep.includes(tool))
    );
    if (usesModernDevTools) score += 3;
  }

  // 최신 기술 트렌드
  const trendyTech = ['GraphQL', 'WebAssembly', 'Deno', 'Bun'];
  const usesTrendy = languages.some(lang =>
    trendyTech.includes(lang.language)
  );
  if (usesTrendy) score += 2;

  return Math.min(score, 15);
};

// 3. 고급 기술 사용 (0-12점)
const analyzeAdvancedTechUsage = (packageData, languages) => {
  let score = 0;

  // TypeScript 사용
  const usesTypeScript = languages.some(lang => lang.language === 'TypeScript');
  if (usesTypeScript) score += 4;

  // 테스팅 프레임워크 (package.json에서)
  if (packageData?.devDependencies) {
    const devDeps = Object.keys(packageData.devDependencies);
    const testFrameworks = ['jest', 'mocha', 'cypress', 'playwright', 'vitest'];
    const usesTestFramework = devDeps.some(dep =>
      testFrameworks.some(framework => dep.includes(framework))
    );
    if (usesTestFramework) score += 4;
  }

  // 빌드 도구 및 번들러
  if (packageData?.devDependencies) {
    const devDeps = Object.keys(packageData.devDependencies);
    const buildTools = ['webpack', 'rollup', 'vite', 'parcel', 'esbuild'];
    const usesBuildTool = devDeps.some(dep =>
      buildTools.some(tool => dep.includes(tool))
    );
    if (usesBuildTool) score += 2;
  }

  // 고성능 언어
  const performantLanguages = ['Rust', 'Go', 'C++', 'C'];
  const usesPerformantLang = languages.some(lang =>
    performantLanguages.includes(lang.language)
  );
  if (usesPerformantLang) score += 2;

  return Math.min(score, 12);
};

// 4. 프레임워크/라이브러리 활용 (0-10점)
const analyzeFrameworkUsage = (packageData) => {
  let score = 0;

  if (!packageData?.dependencies) return 0;

  const deps = Object.keys(packageData.dependencies);

  // 주요 프레임워크
  const majorFrameworks = ['react', 'vue', 'angular', 'express', 'fastify', 'django', 'flask'];
  const usesMajorFramework = deps.some(dep =>
    majorFrameworks.some(framework => dep.includes(framework))
  );
  if (usesMajorFramework) score += 5;

  // 상태 관리 라이브러리
  const stateManagement = ['redux', 'mobx', 'zustand', 'recoil', 'vuex'];
  const usesStateManagement = deps.some(dep =>
    stateManagement.some(lib => dep.includes(lib))
  );
  if (usesStateManagement) score += 2;

  // 유틸리티 라이브러리
  const utilities = ['lodash', 'ramda', 'moment', 'date-fns', 'axios'];
  const usesUtilities = deps.some(dep =>
    utilities.some(lib => dep.includes(lib))
  );
  if (usesUtilities) score += 2;

  // 의존성 개수 (적절한 수준)
  if (deps.length >= 10 && deps.length <= 50) score += 1;

  return Math.min(score, 10);
};

// 5. 코딩 실력 지표 (0-8점)
const analyzeCodingSkillIndicators = (stats, languages) => {
  let score = 0;

  // 커밋 수 (개발 경험)
  const commits = stats?.totalCommits || 0;
  if (commits > 100) score += 3;
  else if (commits > 50) score += 2;
  else if (commits > 10) score += 1;

  // 다양한 언어 경험
  const langCount = languages.length;
  if (langCount >= 4) score += 3;
  else if (langCount >= 2) score += 2;
  else if (langCount >= 1) score += 1;

  // 협업 경험 (기여자 수)
  const contributors = stats?.contributorsCount || 0;
  if (contributors > 3) score += 2;
  else if (contributors > 1) score += 1;

  return Math.min(score, 8);
};

module.exports = {
  startAnalysis,
  getAnalysisStatus,
  getAnalysisResults,
  startComprehensiveAnalysis,
  getComprehensiveAnalysisStatus,
  getComprehensiveAnalysisResults
};