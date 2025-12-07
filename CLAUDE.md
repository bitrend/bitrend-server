# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Server Management
```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start
```

### Database Management
```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d

# Generate Prisma Client (run after schema changes)
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Pull current database schema to Prisma
npx prisma db pull
```

### Docker
```bash
# Start all services (backend + PostgreSQL)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

## Architecture

This is an Express.js backend server using a layered architecture pattern:

**Request Flow**: Route → Controller → Service → Repository → Database

### Layered Structure
- **Controllers** (`src/controllers/`): Handle HTTP requests/responses, delegate to services
- **Services** (`src/services/`): Business logic, coordinate between repositories
- **Repositories** (`src/repositories/`): Data access layer using Prisma ORM
- **Routes** (`src/routes/`): Define API endpoints and middleware
- **Middlewares** (`src/middlewares/`): Custom Express middleware (auth, error handling)

### Key Files
- `src/index.js`: Server entry point
- `src/app.js`: Express app configuration, CORS, routes, error handling
- `src/config/prisma.js`: Prisma client configuration
- `prisma/schema.prisma`: Database schema definition

### Database
- **ORM**: Prisma with PostgreSQL
- **Schema**: Single `User` model with GitHub integration fields
- **Migrations**: Manual SQL migrations in `migrations/` directory (not Prisma migrations)

## Adding New Features

Follow the layered architecture when adding new features:

1. **Repository**: Create data access methods using Prisma
2. **Service**: Implement business logic, call repositories
3. **Controller**: Handle HTTP layer, call services
4. **Route**: Define endpoints, add to `src/app.js`

Example structure:
```
src/
├── repositories/feature.repository.js
├── services/feature.service.js
├── controllers/feature.controller.js
└── routes/feature.routes.js
```

## Environment Setup

Required environment variables (see `.env.example`):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bitrend
PORT=3000
NODE_ENV=development
```

## API Documentation

- Swagger UI available at `/api-docs` when server is running
- API specification in `swagger.json`
- Frontend configured for CORS from `http://localhost:5173`

## Authentication

- JWT-based authentication implemented
- GitHub OAuth integration for users
- Auth middleware in `src/middlewares/auth.js`
- Auth routes: `/api/auth/*`

## Error Handling

- Centralized error handling in `src/middlewares/errorHandler.js`
- Controllers should call `next(error)` to pass errors to handler
- Consistent error response format

## Testing

Currently no test framework configured - check with user for preferred testing approach before implementing tests.