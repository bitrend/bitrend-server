const prisma = require("../config/prisma");

const searchUsers = async (query, limit) => {
  // 검색 우선순위에 따른 정렬
  // 1. 정확한 일치 (username)
  // 2. 시작 일치 (username)
  // 3. 부분 일치 (username)
  // 4. 이름 일치 (name)

  const users = await prisma.user.findMany({
    where: {
      OR: [
        {
          username: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatarUrl: true,
      followerCount: true,
    },
    take: limit,
    orderBy: [
      // 정확한 일치를 우선으로 하는 복잡한 정렬은 애플리케이션 레벨에서 처리
      { username: "asc" },
    ],
  });

  // 검색 우선순위에 따른 정렬 (애플리케이션 레벨)
  return users.sort((a, b) => {
    const aUsername = a.username.toLowerCase();
    const bUsername = b.username.toLowerCase();
    const queryLower = query.toLowerCase();

    // 1. 정확한 일치
    if (aUsername === queryLower && bUsername !== queryLower) return -1;
    if (bUsername === queryLower && aUsername !== queryLower) return 1;

    // 2. 시작 일치
    const aStartsWith = aUsername.startsWith(queryLower);
    const bStartsWith = bUsername.startsWith(queryLower);
    if (aStartsWith && !bStartsWith) return -1;
    if (bStartsWith && !aStartsWith) return 1;

    // 3. 부분 일치는 이미 쿼리에서 처리됨
    // 4. 팔로워 수로 정렬 (이미 DB에서 정렬됨)
    return 0;
  });
};

const countSearchResults = async (query) => {
  return await prisma.user.count({
    where: {
      OR: [
        {
          username: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    },
  });
};

const findByUsername = async (username) => {
  return await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      githubId: true,
      username: true,
      name: true,
      email: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      followerCount: true,
    },
  });
};

const getSuggestions = async (query, maxSuggestions) => {
  // 입력된 검색어와 유사한 username과 name을 찾아서 추천어 생성
  const suggestions = await prisma.user.findMany({
    where: {
      OR: [
        {
          username: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      username: true,
      name: true,
    },
    orderBy: {
      username: "asc",
    },
    take: maxSuggestions * 2, // 중복 제거를 위해 더 많이 가져옴
  });

  // 중복 제거 및 추천어 생성
  const uniqueSuggestions = new Set();
  const result = [];

  suggestions.forEach((user) => {
    if (user.username && uniqueSuggestions.size < maxSuggestions) {
      if (!uniqueSuggestions.has(user.username.toLowerCase())) {
        uniqueSuggestions.add(user.username.toLowerCase());
        result.push({ value: user.username });
      }
    }

    if (user.name && uniqueSuggestions.size < maxSuggestions) {
      const nameParts = user.name.split(" ");
      nameParts.forEach((part) => {
        if (
          part.toLowerCase().includes(query.toLowerCase()) &&
          !uniqueSuggestions.has(part.toLowerCase()) &&
          uniqueSuggestions.size < maxSuggestions
        ) {
          uniqueSuggestions.add(part.toLowerCase());
          result.push({ value: part });
        }
      });
    }
  });

  return result.slice(0, maxSuggestions);
};

module.exports = {
  searchUsers,
  countSearchResults,
  findByUsername,
  getSuggestions,
};
