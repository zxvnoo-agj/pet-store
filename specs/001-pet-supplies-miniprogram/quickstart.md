# Quickstart Guide

**Project**: Pet Supplies Assistant Mini Program
**Date**: 2026-05-11

## Prerequisites

- **Docker** & **Docker Compose** (for local services)
- **Python** 3.11+ (for backend)
- **Node.js** 18+ (for frontend)
- **WeChat Developer Tools** (for mini program testing)
- **Git**

## Project Structure

```
pet-store/
├── frontend/              # Taro mini program (WeChat)
│   ├── src/
│   │   ├── pages/         # Mini program pages
│   │   ├── components/    # Reusable components
│   │   ├── services/      # API client
│   │   ├── stores/        # Zustand state management
│   │   └── utils/         # Utilities
│   └── package.json
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Config, database
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   ├── agents/        # AI agent implementation
│   │   └── utils/         # Utilities
│   ├── tests/
│   └── requirements.txt
├── admin/                 # H5 admin backend (React)
│   ├── src/
│   └── package.json
├── docker-compose.yml     # Local services
└── specs/                 # Feature specifications
    └── 001-pet-supplies-miniprogram/
```

## Environment Setup

### 1. Clone and Setup

```bash
git clone <repo-url>
cd pet-store
git checkout feature/001-pet-supplies-miniprogram
```

### 2. Start Local Services (Docker)

```bash
# Start PostgreSQL, Redis, and other services
docker-compose up -d

# Verify services are running
docker-compose ps
```

**Services**:
- PostgreSQL 15: `localhost:5432`
- Redis 7: `localhost:6379`
- Meilisearch (optional): `localhost:7700`

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

**Backend API Documentation**:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 4. Frontend Setup (Mini Program)

```bash
cd frontend

# Install dependencies
npm install

# Configure API endpoint
# Edit src/config/index.ts:
#   API_BASE_URL = 'http://localhost:8000/v1'

# Start development (H5 mode for web testing)
npm run dev:h5

# OR start WeChat mini program mode
npm run dev:weapp
```

**WeChat Developer Tools**:
1. Open WeChat Developer Tools
2. Import project from `frontend/dist/weapp`
3. Set app ID (or use test account)
4. Enable "Do not verify valid domain names..." in settings

### 5. Admin Backend Setup

```bash
cd admin

# Install dependencies
npm install

# Start development server
npm run dev
```

Admin panel will be available at `http://localhost:5173`

## Configuration

### Backend Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/petshop

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_DAYS=7

# WeChat Mini Program
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-app-secret

# AI/LLM
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o

# Optional: Other LLM providers
# ERNIE_API_KEY=...
# QIANWEN_API_KEY=...

# Meilisearch (optional)
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=your-key
```

### Frontend Configuration

Edit `frontend/src/config/index.ts`:

```typescript
export const config = {
  // API base URL
  API_BASE_URL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8000/v1'
    : 'https://api.your-domain.com/v1',
  
  // WeChat App ID
  APP_ID: 'your-app-id',
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  
  // Feature flags
  ENABLE_AI_CHAT: true,
  ENABLE_PRODUCT_COMPARE: true,
}
```

## Development Workflow

### 1. Database Migrations

```bash
cd backend

# Create new migration
alembic revision --autogenerate -m "add new table"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### 2. Running Tests

**Backend**:
```bash
cd backend
pytest

# With coverage
pytest --cov=app --cov-report=html
```

**Frontend**:
```bash
cd frontend
npm test
```

### 3. Code Quality

**Backend**:
```bash
# Linting
ruff check .
ruff check . --fix

# Type checking
pyright

# Formatting
ruff format .
```

**Frontend**:
```bash
# Linting
npm run lint

# Type checking
npm run type-check
```

### 4. API Testing

Use the Swagger UI at http://localhost:8000/docs for interactive API testing.

Example: Login
```bash
curl -X POST http://localhost:8000/v1/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{"code": "test-code"}'
```

## Seeding Data

### Initial Categories

```bash
cd backend
python scripts/seed_categories.py
```

### Sample Products

```bash
python scripts/seed_products.py --count 50
```

## Common Tasks

### Reset Database

```bash
# Stop services
docker-compose down

# Remove volumes
docker-compose down -v

# Restart and migrate
docker-compose up -d
alembic upgrade head
```

### View Logs

```bash
# Backend logs
uvicorn app.main:app --reload --port 8000 --log-level debug

# Docker services logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

### WeChat Mini Program Testing

1. **Login testing**: Use WeChat Developer Tools'模拟登录 feature
2. **API testing**: Ensure backend is running and accessible from Developer Tools
3. **Network debugging**: Use Network panel in Developer Tools

## Troubleshooting

### Issue: Cannot connect to backend from mini program

**Solution**: 
- Enable "Do not verify valid domain names..." in Developer Tools
- Use `10.0.2.2` instead of `localhost` in Android simulator
- Ensure backend CORS allows WeChat domain

### Issue: Database connection refused

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Ensure database exists
docker-compose exec postgres psql -U user -c "CREATE DATABASE petshop;"
```

### Issue: Redis connection error

**Solution**:
```bash
# Check Redis
docker-compose exec redis redis-cli ping

# Should return PONG
```

### Issue: AI chat not working

**Solution**:
- Check OPENAI_API_KEY in .env
- Verify API key has sufficient quota
- Check backend logs for LLM API errors

## Deployment

### Backend Deployment

```bash
# Build Docker image
docker build -t petshop-backend .

# Run with docker-compose (production)
docker-compose -f docker-compose.prod.yml up -d
```

### Mini Program Deployment

1. Build production bundle:
   ```bash
   cd frontend
   npm run build:weapp
   ```

2. Upload in WeChat Developer Tools
3. Submit for review in WeChat MP Admin Console

### Admin Deployment

```bash
cd admin
npm run build

# Deploy dist/ to static hosting or CDN
```

## Resources

- **API Documentation**: http://localhost:8000/docs
- **Database Schema**: See `specs/001-pet-supplies-miniprogram/data-model.md`
- **API Contracts**: See `specs/001-pet-supplies-miniprogram/contracts/`
- **Design Document**: See `pet-supplies-miniprogram-design.md`

## Support

For issues or questions:
1. Check this quickstart guide
2. Review API documentation at `/docs`
3. Check logs for error messages
4. Refer to the design document for architecture details
