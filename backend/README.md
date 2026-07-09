# Groupomania Backend Microservices

A production-ready microservices architecture for the Groupomania enterprise social network platform. Built with Node.js, TypeScript, Express, PostgreSQL, and Redis.

## Architecture Overview

```
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   (Port 3000)   │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Auth Service  │  │  User Service   │  │ Message Service │
│  (Port 3004)  │  │   (Port 3001)   │  │   (Port 3002)   │
└───────────────┘  └─────────────────┘  └─────────────────┘
                             │
                             ▼
                   ┌─────────────────┐
                   │  File Service   │
                   │   (Port 3003)   │
                   └─────────────────┘
```

## Microservices

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 3000 | Central entry point, routing, load balancing, rate limiting |
| **Auth Service** | 3004 | Authentication, JWT tokens, user registration |
| **User Service** | 3001 | User profiles, avatars, user management |
| **Message Service** | 3002 | Posts, channels, real-time messaging (WebSocket) |
| **File Service** | 3003 | File uploads, image processing, storage |

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** Express.js 5
- **Database:** PostgreSQL with Sequelize ORM
- **Cache:** Redis
- **Authentication:** JWT with refresh tokens
- **Real-time:** WebSocket (Socket.IO)
- **Validation:** Joi
- **Logging:** Winston
- **Testing:** Jest + Supertest
- **Code Quality:** ESLint + Prettier
- **CI/CD:** GitHub Actions
- **Containerization:** Docker + Docker Compose

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL >= 14
- Redis >= 6 (optional, for caching)
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/NathanHallouin/groupomania-backend-microservices.git
cd groupomania-backend-microservices

# Copy environment file
cp .env.example .env

# Install all dependencies
npm run install:all

# Start development servers
npm run dev
```

### Using Docker

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Available Scripts

```bash
# Development
npm run dev              # Start all microservices in dev mode
npm run dev:gateway      # Start API Gateway only
npm run dev:auth         # Start Auth Service only
npm run dev:user         # Start User Service only
npm run dev:message      # Start Message Service only
npm run dev:file         # Start File Service only

# Build
npm run build            # Build all microservices

# Testing
npm test                 # Run all tests
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier

# Docker
npm run docker:build     # Build Docker images
npm run docker:up        # Start with Docker Compose
npm run docker:down      # Stop Docker services
```

## API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register new user |
| POST | `/login` | User login |
| POST | `/logout` | User logout |
| POST | `/refresh` | Refresh access token |

### Users (`/api/v1/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all users (paginated) |
| GET | `/:id` | Get user by ID |
| PUT | `/:id` | Update user profile |
| DELETE | `/:id` | Delete user account |
| POST | `/:id/avatar` | Upload user avatar |

### Messages (`/api/v1/messages`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all messages (paginated) |
| POST | `/` | Create new message |
| GET | `/:id` | Get message by ID |
| PUT | `/:id` | Update message |
| DELETE | `/:id` | Delete message |
| POST | `/:id/reactions` | Add reaction |

### Health & Monitoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | System metrics |

## Project Structure

```
groupomania-backend-microservices/
├── microservices/
│   ├── api-gateway/       # API Gateway service
│   ├── auth-service/      # Authentication service
│   ├── user-service/      # User management service
│   ├── message-service/   # Messaging service
│   └── file-service/      # File handling service
├── shared/                # Shared utilities and middleware
│   ├── config/           # Configuration
│   ├── middleware/       # Common middleware
│   ├── services/         # Shared services
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── docker-compose.yml     # Docker orchestration
└── package.json           # Root package configuration
```

## Key Features

### Security
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting per endpoint and user role
- Input validation and sanitization
- Helmet.js security headers
- XSS and injection protection

### Performance
- Redis caching with intelligent invalidation
- Database connection pooling
- Request/response compression
- Circuit breaker pattern for resilience
- Load balancing across service instances

### Monitoring
- Structured logging with Winston
- Health check endpoints
- Metrics collection
- Request tracing

### Developer Experience
- Hot-reload in development
- TypeScript for type safety
- ESLint + Prettier for code consistency
- Husky pre-commit hooks
- Comprehensive error handling

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

Key variables:

```bash
# Server
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=groupomania_development
DB_USERNAME=groupomania
DB_PASSWORD=your-password

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
