# Research: Pet Supplies Assistant Mini Program

**Date**: 2026-05-11
**Feature**: Pet Supplies Assistant Mini Program
**Source**: Feature specification + design document (`pet-supplies-miniprogram-design.md`)

## Technical Decisions

### Frontend Framework: Taro 3.x + React

**Decision**: Use Taro 3.x with React for the mini program frontend.

**Rationale**:
- Design document specifies Taro 3.x + React for cross-platform support (WeChat mini program + future H5/APP)
- Existing web prototype uses React (Vite), making migration to Taro relatively straightforward
- Taro supports WeChat-specific APIs (login, share, payment) with unified abstraction
- NutUI-React provides e-commerce optimized components for the pet supplies domain

**Alternatives considered**:
- Native WeChat development (WXML/WXSS): Rejected due to limited cross-platform capability and steeper learning curve
- uni-app (Vue): Rejected because existing prototype and team are React-based

**Migration path from existing web prototype**:
1. Convert Vite project to Taro CLI project
2. Replace standard React components with Taro components (`@tarojs/components`)
3. Adapt routing from React Router to Taro routing
4. Replace `fetch`/`axios` with `Taro.request`
5. Add WeChat-specific functionality (login, sharing)

### Backend Framework: FastAPI + Python 3.11

**Decision**: Use FastAPI 0.110+ with Python 3.11+.

**Rationale**:
- Native async support essential for SSE streaming (AI chat)
- Automatic OpenAPI documentation generation
- Pydantic v2 integration for request/response validation
- LangChain Python ecosystem for AI agent implementation
- Existing backend already has FastAPI skeleton structure

**Key libraries**:
- `fastapi` - Web framework
- `sqlalchemy[asyncio]` - Async ORM
- `asyncpg` - Async PostgreSQL driver
- `pydantic` - Data validation
- `langchain` + `langchain-openai` - AI agent framework
- `redis` - Caching and sessions
- `loguru` - Structured logging

### Database: PostgreSQL 15 + PGVector

**Decision**: Use PostgreSQL 15 with pgvector extension.

**Rationale**:
- JSONB support for semi-structured product attributes and reviews
- Full-text search capabilities
- pgvector extension for vector storage (product embeddings for AI semantic search)
- Single database for both business data and vectors simplifies operations
- Design document already specifies this stack

**Schema approach**:
- Use SQLAlchemy 2.0 declarative models with async support
- Alembic for database migrations
- JSONB columns for flexible product attributes, ratings, and tags

### AI Agent Architecture: ReAct with LangChain

**Decision**: Implement ReAct (Reasoning + Acting) agent using LangChain.

**Rationale**:
- ReAct pattern allows the AI to reason about user queries and take actions (tool calls)
- Tool calling enables the AI to search products, get details, compare items dynamically
- SSE streaming provides real-time UX with typing indicators and progress updates
- Design document specifies this architecture

**Agent tools**:
1. `search_products` - Search products by criteria
2. `get_product_detail` - Get detailed product info
3. `get_reviews_summary` - Get review statistics
4. `compare_products` - Compare multiple products
5. `web_search` - Search internet for supplemental info

**LLM selection strategy**:
- Primary: GPT-4o or equivalent (strong reasoning for complex recommendations)
- Fallback: lighter models for simple queries (cost optimization)
- Review moderation: GPT-4o-mini (cost-effective for high-volume content review)

### Caching Strategy: Redis

**Decision**: Use Redis for caching, sessions, and rate limiting.

**Rationale**:
- Hot data caching (product lists, categories) to reduce DB load
- Session storage for JWT tokens
- Rate limiting for AI API calls (prevent abuse)
- Search suggestion caching

**Cache policies**:
- Product lists: 5 minutes TTL
- Categories: 1 hour TTL (rarely change)
- Search suggestions: 10 minutes TTL
- Product details: 10 minutes TTL
- AI responses: Not cached (personalized)

### State Management: Zustand

**Decision**: Use Zustand for frontend state management.

**Rationale**:
- Lightweight (~1KB) compared to Redux
- Simple API, minimal boilerplate
- Suitable for mini program bundle size constraints
- Works well with React and TypeScript

**State slices**:
- `authStore` - User authentication state
- `productStore` - Product browsing state (filters, sorting)
- `chatStore` - AI conversation state
- `compareStore` - Product comparison state
- `favoriteStore` - User favorites

### Authentication: WeChat Mini Program Login

**Decision**: Use WeChat mini program login with JWT tokens.

**Rationale**:
- Native WeChat integration for seamless UX
- No separate account registration needed
- openid provided by WeChat platform
- JWT for stateless API authentication

**Flow**:
1. Frontend calls `wx.login()` to get `code`
2. Sends `code` to backend `/auth/wechat-login`
3. Backend exchanges `code` for `openid` via WeChat API
4. Backend creates/updates user and issues JWT
5. Frontend stores JWT and uses in subsequent requests

### Admin Backend: React SPA (H5)

**Decision**: Build admin backend as a separate React SPA using the same API.

**Rationale**:
- Can reuse backend API and authentication
- Different build target from mini program (H5 vs WeChat)
- Simpler than integrating into mini program
- Can use standard React with standard components (no Taro restrictions)

**Scope**:
- Product CRUD (with image upload)
- Category management
- Review moderation queue
- Data source configuration
- Dashboard with basic metrics

## Performance Considerations

### Mini Program Bundle Size

**Target**: Main bundle < 2MB

**Strategies**:
- Code splitting by pages
- Lazy loading for non-critical components
- Tree shaking unused code
- Compress images (WebP format)
- Use CDN for static assets

### API Response Times

**Targets**:
- Product list: < 200ms p95
- Product detail: < 300ms p95
- Search: < 500ms p95
- AI first response: < 2s (TTFB for SSE)

**Strategies**:
- Database query optimization (indexes, pagination)
- Redis caching for hot data
- Async processing for AI requests
- Connection pooling for PostgreSQL

### AI Streaming Performance

**Considerations**:
- SSE connection management (keep-alive, reconnection)
- Token usage monitoring and cost control
- Graceful degradation when AI service is unavailable
- Request timeout handling (30s default)

## Security Considerations

### API Security
- JWT token with 7-day expiration
- Rate limiting: 100 req/min for general APIs, 20 req/min for AI chat
- Input validation via Pydantic models
- SQL injection prevention via SQLAlchemy ORM
- CORS configuration for mini program domain

### Data Privacy
- No storage of WeChat user sensitive data beyond openid/nickname/avatar
- Review content moderated before public display
- Conversation logs retained for 30 days (configurable)
- HTTPS for all API communications

### AI Safety
- Content filtering for AI outputs
- Medical disclaimer for health-related questions
- Tool calling restricted to read-only operations
- No personal data exposed to LLM APIs

## Open Questions Resolved

1. **Frontend migration from web to mini program**: Confirmed Taro 3.x is the target. Existing web prototype serves as UX reference but requires significant refactoring.

2. **AI model provider**: Design document suggests multiple options (ERNIE, Tongyi, GPT-4o). Decision: Start with GPT-4o for development (best tool calling support), with abstraction layer to switch providers.

3. **Search implementation**: Design document mentions Meilisearch as optional. Decision: Start with PostgreSQL full-text search (good enough for MVP), add Meilisearch later if needed.

4. **Image storage**: Use cloud object storage (OSS/COS) with CDN. Images uploaded via backend presigned URLs.

5. **Data collection for MVP**: Start with manual product entry + JD API integration. Expand to other platforms post-MVP.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| WeChat API rate limits | Medium | High | Implement caching, batch requests, fallback strategies |
| LLM API costs | High | Medium | Token usage monitoring, rate limiting, caching where possible |
| Data collection compliance | Medium | High | Use official APIs only for MVP, legal review before crawlers |
| Mini program bundle size | Medium | Medium | Code splitting, lazy loading, image optimization |
| AI response quality | Medium | High | Prompt engineering, tool calling validation, user feedback loop |

## Development Environment

**Required services**:
- PostgreSQL 15 (with pgvector)
- Redis 7
- Python 3.11+
- Node.js 18+ (for frontend)
- WeChat Developer Tools (for mini program testing)

**Docker Compose setup**:
All services can be run locally via Docker Compose for development.

## Next Steps

1. Set up development environment (Docker Compose)
2. Implement database schema and migrations
3. Build backend API foundation (auth, products, categories)
4. Migrate frontend from web to Taro mini program
5. Implement AI agent with tool calling
6. Build admin backend
7. Integration testing and performance optimization
