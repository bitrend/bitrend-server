const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // 테스트 사용자 데이터 추가
  const users = [
    {
      githubId: BigInt(12345678),
      username: "johndoe",
      name: "John Doe",
      email: "john@example.com",
      avatarUrl: "https://avatars.githubusercontent.com/u/12345678",
      bio: "Software Developer",
      followerCount: 1250,
      followingCount: 180,
      repositoryCount: 25,
    },
    {
      githubId: BigInt(87654321),
      username: "janedoe",
      name: "Jane Doe",
      email: "jane@example.com",
      avatarUrl: "https://avatars.githubusercontent.com/u/87654321",
      bio: "Frontend Developer",
      followerCount: 890,
      followingCount: 120,
      repositoryCount: 15,
    },
    {
      githubId: BigInt(11111111),
      username: "johnsmith",
      name: "John Smith",
      email: "johnsmith@example.com",
      avatarUrl: "https://avatars.githubusercontent.com/u/11111111",
      bio: "Backend Developer",
      followerCount: 2100,
      followingCount: 300,
      repositoryCount: 40,
    },
    {
      githubId: BigInt(22222222),
      username: "testuser",
      name: "Test User",
      email: "test@example.com",
      avatarUrl: "https://avatars.githubusercontent.com/u/22222222",
      bio: "QA Engineer",
      followerCount: 450,
      followingCount: 80,
      repositoryCount: 10,
    },
  ];

  for (const userData of users) {
    try {
      await prisma.user.upsert({
        where: { githubId: userData.githubId },
        update: userData,
        create: userData,
      });
      console.log(`Created/Updated user: ${userData.username}`);
    } catch (error) {
      console.error(`Error creating user ${userData.username}:`, error);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
