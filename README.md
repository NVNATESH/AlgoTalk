# AlgoTalk

## AI-Powered Collaborative Learning & Competitive Programming Platform

AlgoTalk is a full-stack web application that bridges the gap between fragmented learning resources, competitive programming practice, and collaborative problem-solving. It combines AI-driven roadmaps, real-time collaborative coding, group challenges, mock interviews, and cross-platform contest analysis into a unified platform.

---

## Problem Statement

Competitive programming learners face several critical challenges:

1. **Fragmented Learning**: Resources are scattered across YouTube, blogs, LeetCode, Codeforces, and documentation with no unified pathway. Learners waste time context-switching between platforms instead of progressing through structured content.
2. **Lack of Upsolving**: After contests, students rarely analyze their mistakes or track weak areas systematically. Contest results sit unused without actionable insights.
3. **Over-reliance on AI**: Students use AI to generate solutions without understanding — there's no guided learning structure that prevents copy-paste shortcuts.
4. **Communication Skill Gaps**: Technical interviews require articulating approaches, but practice environments don't evaluate verbal communication alongside code.
5. **No Collaborative Learning**: Group study for CP is difficult without real-time shared workspaces. Students lack tools to code together, discuss, and challenge each other.
6. **Platform Isolation**: Progress on LeetCode, Codeforces, CodeChef, etc. remains siloed with no cross-platform analytics or unified view.

### Solution

AlgoTalk addresses all six problems through integrated subsystems:

| Problem | Solution | Key Implementation |
|---------|----------|-------------------|
| Fragmented Learning | AI-Generated Roadmaps with cached concepts, multi-language code (C++, Java, Python, C), quizzes, and practice problems | `learningService.ts`, `gemini.ts`, `Goal` model |
| Lack of Upsolving | Contest Analysis & Upsolving with auto report generation after every contest | `contestService.ts`, `ContestReport` model, 4 platform extractors |
| Over-reliance on AI | Quiz-gated completion (≥70%) prevents skipping; AI reviews code but doesn't solve | `learningService.ts` quiz validation, `codeReviewService.ts` |
| Communication Gaps | Mock Interviews evaluating both code quality and verbal communication | `interviewService.ts`, `InterviewSession` model, `useSpeechRecognition` hook |
| No Collaboration | Real-Time Rooms using Yjs CRDT + WebRTC voice + screen sharing | `yjs/`, `voice/`, `Room` model, `useVoiceMesh` hook |
| Platform Isolation | Cross-Platform Integration syncing from 7 platforms with unified analytics | `extractors/` (7 files), `Integration` model, `syncScheduler.ts` |

---

## Architecture

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Next.js 14  │  │  Zustand     │  │  Monaco Editor      │ │
│  │  App Router  │  │  State Mgmt  │  │  + Yjs Binding      │ │
│  │  Tailwind    │  │  Stores      │  │  + WebRTC Voice     │ │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬───────────┘ │
└─────────┼─────────────────┼────────────────────┼─────────────┘
          │ REST API        │ WebSocket          │ WebSocket
          ▼                 ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│                       Server Layer                           │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Express.js + TypeScript                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │  │
│  │  │Controllers│ │Services  │ │Middleware│ │  Routes   │  │  │
│  │  │  (21)     │ │  (42)    │ │Auth/Rate │ │  (40+)   │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Yjs WS      │  │  Voice WS    │  │  Notify WS       │   │
│  │  /yjs/:roomId│  │  /voice/:id  │  │  /notify         │   │
│  │  CRDT Sync   │  │  WebRTC Mesh │  │  Push Events     │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
┌────────────────┐   ┌──────────────────┐
│   MongoDB      │   │  Google Gemini   │
│   (Mongoose)   │   │  (7-key rotate)  │
│   27 Models    │   │  AI Generation   │
└────────────────┘   └──────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | Server-side rendering, routing |
| **UI** | Tailwind CSS, Framer Motion | Responsive design, animations |
| **State** | Zustand | Client-side state management |
| **Editor** | Monaco Editor + Yjs | Collaborative code editing |
| **Voice** | WebRTC (mesh topology) | Real-time voice communication |
| **Backend** | Express.js + TypeScript | REST API server |
| **Database** | MongoDB + Mongoose | Document storage, 27 models |
| **AI** | Google Gemini 2.5 Flash/Pro | Roadmaps, quizzes, code reviews, interviews |
| **Auth** | JWT (access + refresh) | Authentication & authorization |
| **Real-time** | WebSocket (ws library) | Yjs sync, voice signaling, notifications |
| **Testing** | Vitest | 144 unit tests across 12 test files |
| **Deployment** | Docker Compose | Containerized development & production |

### Frontend Architecture

```
frontend/src/
├── app/                    # Next.js App Router (19 routes)
│   ├── (auth)/             # Login, register, forgot password
│   ├── admin/              # Admin panel (problems, goals, interviews)
│   ├── dashboard/          # User dashboard with analytics
│   ├── goals/              # AI learning roadmaps
│   ├── groups/             # Group challenges & leaderboards
│   ├── interview/          # Mock interviews + question bank
│   ├── problems/           # Problem browser + solver
│   ├── profile/            # User profiles with follow system
│   ├── rooms/              # Collaborative coding rooms
│   ├── contests/           # Contest tracking & analysis
│   ├── reviews/            # Code review history
│   ├── quests/             # Quest-based goal catalog
│   └── ...                 # integrations, rewind, settings, etc.
├── components/             # Reusable UI (17 component modules)
│   ├── auth/               # Login/register forms
│   ├── dashboard/          # Dashboard widgets
│   ├── groups/             # Group UI components
│   ├── interview/          # Interview session UI
│   ├── learning/           # Roadmap & module viewers
│   ├── problem/            # Problem solver with Monaco
│   ├── profile/            # Profile cards, follow buttons
│   ├── room/               # Room editor, voice controls
│   └── ...                 # Modal, NotificationBell, etc.
├── stores/                 # Zustand state (7 stores)
│   ├── authStore.ts        # Authentication state
│   ├── goalStore.ts        # Learning goal state
│   ├── notificationStore.ts # Real-time notifications
│   └── ...                 # mentor, pomodoro, report, UI
├── hooks/                  # Custom React hooks (4 hooks)
│   ├── useVoiceMesh.ts     # WebRTC mesh voice chat
│   ├── useSpeechRecognition.ts # Browser speech-to-text
│   ├── useNotifySocket.ts  # WebSocket notification client
│   └── useReviewDecorations.ts # Monaco review annotations
├── lib/                    # API client, utilities
└── types/                  # TypeScript type definitions
```

### Backend Architecture

```
backend/src/
├── index.ts                # Express server entry + WebSocket setup
├── config/                 # Environment (Zod validated), DB, logger
├── controllers/            # 21 controllers with Zod input validation
├── services/               # 42 service files (business logic layer)
├── models/                 # 27 Mongoose models
├── middleware/              # Auth, rate limiting, AI usage limits, validation
├── routes/                 # Express route definitions
├── extractors/             # 7 platform scrapers + topic mapper
├── prompts/                # AI prompt templates for Gemini
├── analysis/               # Static code analyzer (4 languages)
├── notify/                 # WebSocket notification server
├── voice/                  # WebRTC signaling server
├── yjs/                    # Yjs CRDT sync server with RBAC
└── utils/                  # ApiError, helpers, password utils
```

---

## Features

### 1. AI-Powered Learning Roadmaps

- Generate personalized learning roadmaps based on topic, difficulty, and time commitment
- Each module includes concepts (markdown), multi-language code examples (C++, Java, Python, C), and mixed-format quizzes
- **Quiz-gated completion**: Modules can only be marked complete after passing the quiz (≥70%)
- **Problem links**: Each module includes relevant practice problems from LeetCode, Codeforces, GFG
- **Roadmap caching**: Generated roadmaps are cached (in-memory + DB) to avoid redundant AI calls

### 2. Group Challenges & Leaderboards

- Create private/public groups with invite codes
- Post coding (internal or external platform) and aptitude challenges
- **Custom deadlines** (1–168 hours, default 24h)
- **Chat-style UI**: Challenges aligned left/right based on creator
- **External verification**: Auto-verifies submissions on LeetCode, Codeforces, CodeChef, etc.
- **Leaderboard**: Points-based ranking with accuracy tracking

### 3. Real-Time Collaborative Rooms
- **Yjs CRDT**: Conflict-free collaborative editing with cursor presence
- **RBAC**: Asker (owner), writers (max 3), readonly participants
- **WebRTC voice**: Push-to-talk or always-on, speaker detection, per-peer volume
- **Screen sharing**: One-at-a-time enforcement
- **Persistence**: Room snapshots saved every 30s, rehydrated on reconnect

### 4. Meeting Scheduling
- Request pair-coding meets from any challenge
- **Scheduled meetings**: Acceptor sets a fixed meeting time
- Auto-creates collaborative workspace with initial content from the challenge
- Only requester and explainer join initially; third-user access controlled dynamically

### 5. Contest Analysis & Upsolving

- Automatic contest tracking for Codeforces, LeetCode, CodeChef, AtCoder
- AI-generated post-contest reports with performance insights
- Upsolving guidance and next-problem recommendations
- Downloadable PDF reports

### 6. Mock Interviews

- AI-powered mock interviews with configurable difficulty and role
- Evaluation of both code quality and verbal communication
- Detailed feedback with scores and improvement suggestions

### 7. Cross-Platform Integration

- Connect 7 platforms: LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, HackerEarth, GeeksForGeeks
- Automatic submission syncing (every 6h + manual)
- Unified activity heatmap and cross-platform analytics
- Browser extension for real-time submission capture

### 8. Admin Control
- **Problem management**: Full CRUD for coding problems with test cases and starter code
- **Recommended goals**: Admin creates quest and company prep templates
- **No AI generation** for company questions and quests — admin-only upload
- Users have read + solve access only

### 9. Additional Features

- **Pomodoro timer** with customizable work/break durations and 5-second alert sounds
- **Code analyzer** with static analysis + AI-powered review
- **Badge system** with achievement tracking
- **Daily missions** for consistent practice
- **Notification system** with real-time WebSocket push
- **Data export** (GDPR-compliant JSON download)
- **User profiles** with follow/unfollow for collaborative learning networks

---

## System Workflow

### User Journey

```
Register/Login → Dashboard → Choose Path:
│
├─ Learning Path:
│  └─ Create Goal → AI generates roadmap → Study modules
│     → Read concepts → View multi-lang examples → Take quiz
│     → Solve practice problems → Complete module → Earn XP
│
├─ Competitive Path:
│  └─ Browse contests → Participate → Auto-analysis
│     → View report → Upsolve weak problems → Track progress
│
├─ Collaborative Path:
│  └─ Join/Create group → Post challenges → Solve within deadline
│     → Request meet → Schedule time → Join collaborative room
│     → Voice chat + code together → Leaderboard ranking
│
├─ Interview Prep:
│  └─ Start mock interview → Solve + explain approach
│     → AI evaluates code + communication → Review feedback
│
└─ Analytics Path:
   └─ Connect platforms → Sync submissions → View unified stats
      → AI analyzer identifies weak areas → Personalized recommendations
```

### Data Flow

```
User Action → API Request (JWT auth) → Controller (Zod validation)
→ Service Layer (business logic) → MongoDB / Gemini AI
→ Response → Zustand Store Update → UI Re-render

Real-time: WebSocket connections for Yjs sync, voice signaling, notifications
```

---

## Project Structure

```
project_space/
├── docker-compose.yml          # Container orchestration
├── README.md                   # This file
├── docs/
│   └── PROJECT.md             # AI Code Analyst specification
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts        # Test configuration
│   ├── src/
│   │   ├── index.ts           # Server entry point
│   │   ├── analysis/          # Static code analyzer
│   │   ├── config/            # DB, env (Zod validated), logger
│   │   ├── controllers/       # 21 route handlers
│   │   ├── extractors/        # 7 platform extractors
│   │   ├── middleware/        # Auth, rate limiting, validation
│   │   ├── models/            # 27 Mongoose models
│   │   ├── notify/            # WebSocket notification server
│   │   ├── prompts/           # AI prompt templates
│   │   ├── routes/            # Express route definitions
│   │   ├── services/          # 42 business logic services
│   │   │   └── gemini.ts      # AI client (imports @google/generative-ai)
│   │   ├── utils/             # Helpers, error classes
│   │   ├── voice/             # WebRTC signaling server
│   │   └── yjs/               # Yjs CRDT sync server
│   ├── tests/                 # 12 test files, 144 unit tests
│   │   ├── apiError.test.ts
│   │   ├── authMiddleware.test.ts
│   │   ├── authValidation.test.ts
│   │   ├── errorMiddleware.test.ts
│   │   ├── goalValidation.test.ts
│   │   ├── interviewValidation.test.ts
│   │   ├── password.test.ts
│   │   ├── profileUtils.test.ts
│   │   ├── staticAnalyzer.test.ts
│   │   ├── tokens.test.ts
│   │   ├── ttlCache.test.ts
│   │   └── urlParser.test.ts
│   └── scripts/               # Admin & smoke test scripts
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── src/
    │   ├── app/               # Next.js App Router (19 routes)
    │   ├── components/        # Reusable UI components (17 modules)
    │   ├── hooks/             # Custom React hooks (4 hooks)
    │   ├── lib/               # API client, utilities
    │   ├── stores/            # Zustand state stores (7 stores)
    │   └── types/             # TypeScript type definitions
    └── extensions/
        └── learnhub-capture/  # Browser extension (Manifest V3)
```

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- MongoDB 6+
- Google Gemini API key(s)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd project_space

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and Gemini API keys
npm install
npm run dev

# Frontend setup (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Docker

```bash
docker-compose up -d
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `GEMINI_API_KEYS` | Comma-separated Gemini API keys (up to 7) |
| `PORT` | Backend port (default: 5000) |
| `CORS_ORIGIN` | Frontend URL (default: `http://localhost:3000`) |

---

## API Overview

### Authentication

- `POST /api/auth/register` — User registration
- `POST /api/auth/login` — Login (returns JWT pair)
- `POST /api/auth/refresh` — Refresh access token
- `GET /api/auth/me` — Current user profile

### Goals & Learning

- `POST /api/goals` — Create AI-generated roadmap
- `GET /api/goals` — List user goals
- `PATCH /api/goals/:id/modules/:moduleId` — Update module status
- `GET /api/goals/:id/modules/:moduleId/content` — Get/generate learning content
- `POST /api/goals/:id/modules/:moduleId/quiz/submit` — Submit quiz

### Groups & Challenges

- `POST /api/groups` — Create group
- `POST /api/groups/:id/challenges` — Post challenge
- `POST /api/groups/:id/challenges/:cid/verify` — Verify external solve
- `POST /api/groups/:id/meets` — Request meeting
- `POST /api/groups/:id/meets/:mid/accept` — Accept with scheduled time

### Problems

- `GET /api/problems` — List problems
- `POST /api/problems/:slug/submit` — Submit solution
- `POST /api/problems/:slug/submissions/:sid/review` — AI code review

### Admin

- `POST /api/admin/problems` — Create problem (admin only)
- `POST /api/admin/recommended-goals` — Create goal template (admin only)

### Profiles & Social Learning

- `GET /api/profile/:username` — Get user profile
- `POST /api/profile/:username/follow` — Follow user (authenticated)
- `DELETE /api/profile/:username/follow` — Unfollow user (authenticated)
- `GET /api/profile/:username/followers` — List followers
- `GET /api/profile/:username/following` — List following

### Interviews

- `POST /api/interviews/start` — Start mock interview session
- `POST /api/interviews/:id/code` — Save code for interview
- `POST /api/interviews/:id/approach` — Submit approach explanation
- `POST /api/interviews/:id/submit` — Submit interview for AI evaluation
- `GET /api/interviews` — List interview sessions
- `GET /api/interviews/questions` — Browse question bank

### Notifications

- `GET /api/notifications` — List user notifications
- `PATCH /api/notifications/:id/read` — Mark notification as read
- `WS /notify` — Real-time push notifications

---

## Testing

The backend includes a comprehensive test suite using **Vitest** with **144 unit tests** across 12 files and **29 E2E tests** across 8 files.

### Unit Test Coverage

| Test File | Tests | Description |
|-----------|-------|-------------|
| `apiError.test.ts` | 8 | ApiError factory methods and serialization |
| `authMiddleware.test.ts` | 12 | JWT extraction, role guards, token refresh |
| `authValidation.test.ts` | 14 | Zod schemas for register, login, password reset |
| `errorMiddleware.test.ts` | 9 | Error handler for ZodError, ApiError, unknown errors |
| `goalValidation.test.ts` | 23 | Goal creation, module status, pause, time logging schemas |
| `interviewValidation.test.ts` | 21 | Interview start, code save, approach, submission schemas |
| `password.test.ts` | 6 | bcrypt hashing and comparison |
| `profileUtils.test.ts` | 11 | Language detection and normalization utilities |
| `staticAnalyzer.test.ts` | 15 | C++, Python, JavaScript, Java code analysis |
| `tokens.test.ts` | 9 | JWT access/refresh token generation and verification |
| `ttlCache.test.ts` | 8 | TTL-based cache expiration and eviction |
| `urlParser.test.ts` | 8 | URL extraction from 7 supported platforms |

### Running Tests

```bash
cd backend
npm test              # Run all tests once
npm run test:watch    # Run in watch mode
npm run test:coverage # Run with coverage report
npm run test:e2e      # Run E2E tests (requires Docker services)
npm run test:all      # Run unit + E2E tests
```

### E2E Test Coverage

| Test File | Tests | Validated Flows |
|-----------|-------|-----------------|
| `health.e2e.test.ts` | 1 | Backend health endpoint |
| `auth.e2e.test.ts` | 7 | Register, login, /me, duplicate rejection, invalid creds |
| `profile.e2e.test.ts` | 4 | View profile, follow, unfollow, auth guard |
| `problems.e2e.test.ts` | 3 | List problems, auth guard, 404 handling |
| `groups.e2e.test.ts` | 4 | Create group, list groups, auth guard, 404 |
| `goals.e2e.test.ts` | 4 | List goals, recommended, quests, auth guard |
| `interviews.e2e.test.ts` | 3 | List sessions, question bank, auth guard |
| `notifications.e2e.test.ts` | 3 | Notifications list, auth guard, badges list |

---

## AI Integration

The platform uses **Google Gemini AI** (models: `gemini-2.5-flash` and `gemini-2.5-pro`) for intelligent features:

| Feature | AI Service File | Description |
|---------|----------------|-------------|
| Learning Roadmaps | `services/gemini.ts` + `services/learningService.ts` | AI generates module concepts, code examples, quizzes |
| Goal Generation | `services/goalService.ts` | AI creates personalized learning roadmap structures |
| Code Review | `services/codeReviewService.ts` | Line-level feedback with severity ratings |
| Mock Interviews | `services/interviewService.ts` | Evaluates code quality + verbal communication |
| Contest Analysis | `services/contestService.ts` | Post-contest insights and upsolving guidance |
| Problem Hints | `services/problemAiService.ts` | Contextual hints and approach suggestions |
| Code Analyzer | `services/analyzerAiService.ts` | AI-powered static analysis feedback |
| Rewind | `services/rewindAiService.ts` | AI-generated progress summaries |
| Rating Estimation | `services/ratingEstimatorService.ts` | Rating prediction from performance data |
| Mixed Practice | `services/mixedPracticeService.ts` | AI-generated topic-combined practice sets |
| AI Mentor | `services/mentorService.ts` | Streaming chat with AI mentor via Gemini |

### AI Architecture

```
User Request → Controller → Service Layer → gemini.ts
                                              ├── Multi-key rotation (up to 7 keys)
                                              ├── Model selection (flash/pro)
                                              ├── Retry with key rotation on 429
                                              ├── JSON parsing with fallback
                                              └── Prompt templates (src/prompts/)
```

**Key implementation**: `backend/src/services/gemini.ts` imports `GoogleGenerativeAI` from `@google/generative-ai` and implements a production-ready AI client with automatic key rotation, quota management, and response parsing.

---

## Security

- **Authentication**: JWT access/refresh token pair with HttpOnly cookies
- **Authorization**: Role-based (user, moderator, admin) with per-route guards
- **Input Validation**: Zod schemas on every endpoint
- **Rate Limiting**: Per-IP and per-user rate limits on sensitive endpoints
- **CORS**: Strict origin checking
- **Helmet**: Security headers
- **RBAC for Rooms**: Per-user read/write permissions with real-time role updates
- **API Key Security**: All API keys stored in environment variables, never committed to source

---

## Scope Boundaries

### In Scope

- AI-generated learning roadmaps with quiz-gated completion
- Real-time collaborative coding (Yjs CRDT + WebRTC voice)
- Cross-platform competitive programming analytics (7 platforms)
- Group challenges with external verification and leaderboards
- Mock interviews with AI evaluation of code and communication
- Contest analysis with AI-generated reports
- User profiles with follow/unfollow for collaborative learning networks
- Admin management of problems and goal templates
- Badge and XP gamification tied to learning milestones
- Daily missions for consistent practice
- Browser extension for submission capture

### Out of Scope

- Languages beyond Python, JavaScript, Java, and C++ for static analysis
- Enterprise SSO or organization-level billing
- CI pipeline or repository-level static analysis
- Mobile native application (planned as future scope)
- Video recording of interviews

> **Note**: User follow/unfollow is an in-scope collaborative learning feature (not general social networking). It enables learners to track peers' progress and discover study partners — directly supporting the platform's educational mission.

---

## CI/CD Pipeline

The project includes a fully automated GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`):

### Pipeline Stages

```
Push/PR to main or develop
  │
  ├─ Stage 1: Backend Unit Tests (parallel with Frontend)
  │   ├── npm ci (cached)
  │   ├── TypeScript typecheck
  │   ├── Vitest unit tests (144 tests)
  │   └── Coverage report → artifact
  │
  ├─ Stage 1: Frontend Build (parallel with Backend)
  │   ├── npm ci (cached)
  │   ├── TypeScript typecheck
  │   └── Next.js production build
  │
  ├─ Stage 2: E2E Tests (after Stage 1 passes)
  │   ├── Docker Compose up (MongoDB + Backend)
  │   ├── Health check wait loop
  │   ├── Vitest E2E suite (29 tests across 8 files)
  │   ├── Auth, Profile, Groups, Goals, Problems, Interviews, Notifications
  │   └── Coverage report → artifact
  │
  ├─ Stage 3: Docker Images (after E2E passes)
  │   ├── Build backend image (BuildKit + GHA cache)
  │   └── Build frontend image (BuildKit + GHA cache)
  │
  └─ Stage 4: Deploy Gate (main branch push only)
      └── All stages passed → ready to deploy
```

### Key Features

- **Triggers**: Push to `main`/`develop`, all pull requests
- **Concurrency**: Auto-cancels stale runs on the same branch
- **Caching**: npm dependencies + Docker layer caching via GitHub Actions cache
- **Failure handling**: Pipeline fails immediately on any test failure; Docker logs collected on failure
- **Coverage reports**: Uploaded as GitHub Actions artifacts (14-day retention)
- **E2E environment**: `docker-compose.ci.yml` spins up MongoDB + Backend with test secrets

### Running Locally

```bash
# Unit tests only
cd backend && npm test

# E2E tests (requires Docker)
docker compose -f docker-compose.ci.yml up -d --build --wait
cd backend && npm run test:e2e
docker compose -f docker-compose.ci.yml down -v

# All tests
cd backend && npm run test:all
```

---

## Future Scope

1. **More Platform Integrations**: TopCoder, SPOJ, USACO — foundation exists in `extractors/` with pluggable platform modules
2. **Advanced Analytics**: ML-based performance prediction — current `ratingEstimatorService.ts` provides the data pipeline
3. **Mobile Application**: React Native companion app — REST API is mobile-ready with JWT auth
4. **Team Contests**: Hosted contests within groups — `GroupChallenge` model supports extensible contest types
5. **Video Explanations**: AI-generated walkthroughs — Gemini multimodal API can be integrated into existing `gemini.ts`
6. **Peer Review System**: Community code review — `CodeReview` model and review workflow already exist

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit changes (`git commit -m 'Add my feature'`)
4. Push to branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

This project is developed as an academic/educational platform.

---

*Built with the AlgoTalk team*