# AlgoTalk — Project Specification

Name: AlgoTalk
Description: A full-stack AI-powered collaborative learning and competitive programming platform that unifies personalized roadmaps, real-time collaborative coding, group challenges, mock interviews, cross-platform contest analysis, and AI code review into a single system.

Functional Requirements

- Authentication & Authorization
  - JWT access/refresh token pair with HttpOnly cookies for refresh token.
  - Role-based access control: user, moderator, admin.
  - Email verification via token link.
  - Two-factor authentication (TOTP) with recovery codes.
  - Password reset via email token.
  - Session management with device tracking and revocation.
- AI-Powered Learning Roadmaps
  - Generate personalized learning roadmaps based on topic, difficulty, and weekly commitment.
  - Each roadmap module contains: concepts (markdown), multi-language code examples (C++, Java, Python, C), mixed-format quizzes (MCQ + short answer), and practice problem links.
  - Quiz-gated module completion: users must score ≥70% before marking a module complete.
  - Two-tier roadmap caching: in-memory TTL cache (24h) + MongoDB lookup (7-day window) to prevent redundant AI calls.
  - Practice problems per module linked to real platform URLs (LeetCode, Codeforces, GFG).
- Analyzer Overview
  - Compute submission totals, acceptance rate, runtime stats, topic mastery, failure patterns, language mix, peak hours, and rating distribution.
- Progress Insights
  - Generate strengths, weaknesses, learning gaps, 3-4 week roadmap, daily goal, and difficulty progression using LLM.
- Code Analysis (per submission)
  - Accept code, language (python, javascript, java, cpp) and optional problem slug.
  - Pre-compute static analysis hints (data structures, nesting depth, function count, control flow).
  - LLM returns complexity, score, readability, bottlenecks, anti-patterns, missed edge cases, suggestions, optimized code, and line-specific issues.
- Code Reviews
  - Generate structured PR-style reviews with score, strengths, weaknesses, line comments, and learning resources.
  - Store one review per submission and allow regeneration on demand.
  - List reviews, fetch details, and batch review unreviewed submissions.
- Group Challenges & Collaboration
  - Create private/public groups with invite codes and member management.
  - Post coding challenges (internal problems or external platform URLs) with custom deadlines (1-168h).
  - External platform verification: auto-verify solves on LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, HackerEarth, GFG.
  - Points-based leaderboard with accuracy tracking.
  - Aptitude challenges with multiple-choice format.
- Real-Time Collaborative Rooms
  - Yjs CRDT-based collaborative editor with cursor presence and awareness.
  - RBAC: owner/asker (full control), writers (max 3, read+write), readonly participants.
  - Room snapshots persisted every 30 seconds to MongoDB.
  - WebRTC mesh voice chat (max 4 peers) with push-to-talk and speaker detection.
  - Screen sharing with one-at-a-time enforcement (writers only).
- Meeting Scheduling
  - Request pair-coding meetings from group challenges.
  - Acceptor sets a fixed scheduled time for the meeting.
  - Auto-creates collaborative room with initial content from the challenge.
- Contest Analysis & Upsolving
  - Track contests from Codeforces, LeetCode, CodeChef, AtCoder automatically.
  - AI-generated post-contest reports with performance insights.
  - Upsolving recommendations and next-problem guidance.
  - Downloadable PDF contest reports.
- Mock Interviews
  - AI-powered mock interviews with configurable difficulty, company, and role.
  - Evaluation of code quality AND verbal communication skills.
  - Detailed feedback with scores and improvement suggestions.
- Cross-Platform Integration
  - Connect 7 platforms: LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, HackerEarth, GeeksForGeeks.
  - Automatic submission syncing every 6 hours + manual sync.
  - Unified activity heatmap and cross-platform analytics.
  - Browser extension for real-time submission capture.
- Recommendations
  - Pick the next best problem from internal catalog based on skill gaps.
  - Cross-platform recommendations based on connected platform activity and rating zone.
- Mixed Topic Practice
  - Generate topic-combined practice sets with adaptive difficulty and modes (practice, timed, contest).
- Admin Control
  - Full CRUD for coding problems (title, description, difficulty, tags, test cases, starter code).
  - Create recommended goal templates (quests, company prep tracks).
  - Admin-only: no AI generation for company questions — manual upload only.
  - User audit logs for moderation.
- Notifications
  - Real-time WebSocket push notifications for: badge earned, challenge posted, meet request, sync complete, etc.
  - Per-type notification preferences (user can enable/disable each type).
- UI Integration
  - Monaco editor line decorations for review comments with severity glyphs and hover tips.
  - Review panel with score gauge, inline comments, and resource links.
  - Pomodoro timer with customizable durations and audio alerts.
  - Badge system with achievement tracking and XP progression.

Non-Functional Requirements

- Rate limit AI endpoints (15 requests per minute per IP) to protect the LLM budget.
- Cache expensive analytics (problem catalog 5 minutes, overview 45 seconds) for responsiveness.
- Enforce per-user access checks on submissions and reviews.
- Sanitize and clamp AI output (scores 0-100, line numbers within file, max 8 comments).
- Retry Gemini calls with backoff and downgrade from pro to flash on quota errors.
- Require JSON outputs from the LLM and tolerate fenced responses.
- Input validation via Zod schemas on every API endpoint.
- Security headers via Helmet middleware.
- CORS restricted to configured frontend origin.
- Bcrypt password hashing with configurable rounds.
- Graceful error handling with structured error responses (ApiError class).
- Docker Compose for containerized deployment.
- Environment-based configuration via .env files with Zod validation.
- Logging via Pino with structured JSON output.

Problem Statement
Students preparing for DSA and contests struggle to identify weak areas, rarely upsolve contest problems, and cannot track progress across multiple platforms. Many lean on AI for direct solutions and miss the approach, while others fail interviews because they cannot clearly explain their reasoning.

Proposed Solution
A full-stack AI code analyst that combines lightweight static signals with Gemini-based analysis to produce actionable code reviews, track skill progression, and recommend next problems. The system unifies internal and external submissions into a single analytics layer and surfaces feedback directly inside the coding workspace.

Four Core Parts

1) Personalized Roadmaps from Multi-Platform Weakness Analysis

   - Problem: Generic roadmaps do not adapt to a learner's weak areas, and progress is scattered across LeetCode, GeeksForGeeks, CodeChef, and Codeforces.
   - Solution: Integrate data from connected platforms to detect weak topics and generate personalized weekly roadmaps.

2) Post-Contest Upsolving and Debugging Reviews

   - Problem: 90-95% of students do not upsolve. After 10 contests, many upsolve only one, and debugging skills are weak.
   - Solution: Provide a post-contest review that explains mistakes, suggests easier approaches, and lists unsolved problems to upsolve.

3) Guided Problem Solving Without Solution Leakage

   - Problem: When students struggle, they often jump to AI or official solutions, missing the approach and the right thinking patterns.
   - Solution: Offer stepwise hints and structured guidance that preserve the learning path without giving full solutions immediately.

4) Interview Communication Practice

   - Problem: Students may know the logic but cannot explain it clearly to a recruiter due to lack of practice.
   - Solution: Provide structured explanation prompts and feedback to build clear, interview-ready communication.

Technologies Used

- Frontend: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Monaco Editor, framer-motion, Zustand, Zod, react-hook-form, y-monaco, y-websocket.
- Backend: Node.js, Express, TypeScript, MongoDB (Mongoose 27 models), Google Gemini API, WebSocket (ws), Yjs, bcryptjs, jsonwebtoken, Zod.
- AI: Gemini 2.5 Flash and Gemini 2.5 Pro via @google/generative-ai with 7-key rotation for quota management (see backend/src/services/gemini.ts).
- Real-time: Yjs CRDT for collaborative editing, WebRTC mesh for voice (max 4 peers), WebSocket for push notifications.
- Testing: Vitest with 144 unit tests across 12 files + 29 E2E tests across 8 files covering auth flows, profile/follow, groups, goals, problems, interviews, and notifications.
- CI/CD: GitHub Actions pipeline with 4 stages — unit tests, E2E (Docker Compose), Docker image build, deploy gate.
- Deployment: Docker Compose with separate frontend/backend containers; docker-compose.ci.yml for CI E2E testing.
- Browser Extension: Manifest V3 Chrome extension for real-time submission capture.

Test Suite

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| apiError.test.ts | 8 | ApiError factory methods and serialization |
| authMiddleware.test.ts | 12 | JWT extraction, role guards, token refresh |
| authValidation.test.ts | 14 | Zod schemas for register, login, password reset |
| errorMiddleware.test.ts | 9 | Error handler for ZodError, ApiError, unknown errors |
| goalValidation.test.ts | 23 | Goal creation, module status, pause, time logging schemas |
| interviewValidation.test.ts | 21 | Interview start, code save, approach, submission schemas |
| password.test.ts | 6 | bcrypt hashing and comparison |
| profileUtils.test.ts | 11 | Language detection and normalization utilities |
| staticAnalyzer.test.ts | 15 | C++, Python, JavaScript, Java code analysis |
| tokens.test.ts | 9 | JWT access/refresh token generation and verification |
| ttlCache.test.ts | 8 | TTL-based cache expiration and eviction |
| urlParser.test.ts | 8 | URL extraction from 7 supported platforms |

Run tests: `cd backend && npm test` (unit) or `npm run test:e2e` (E2E with Docker) or `npm run test:all` (both)

E2E Test Suite (requires Docker Compose CI services)

| Test File | Tests | Validated Flows |
|-----------|-------|----------------|
| health.e2e.test.ts | 1 | Backend health endpoint |
| auth.e2e.test.ts | 7 | Register, login, /me, duplicate rejection, invalid creds |
| profile.e2e.test.ts | 4 | View profile, follow, unfollow, auth guard |
| problems.e2e.test.ts | 3 | List problems, auth guard, 404 handling |
| groups.e2e.test.ts | 4 | Create group, list groups, auth guard, 404 |
| goals.e2e.test.ts | 4 | List goals, recommended, quests, auth guard |
| interviews.e2e.test.ts | 3 | List sessions, question bank, auth guard |
| notifications.e2e.test.ts | 3 | Notifications list, auth guard, badges list |

CI/CD Pipeline (GitHub Actions)

- Triggers on push to main/develop and all pull requests
- Stage 1: Backend unit tests + Frontend typecheck/build (parallel)
- Stage 2: E2E tests via docker-compose.ci.yml (MongoDB + Backend)
- Stage 3: Docker image builds with BuildKit + GHA cache
- Stage 4: Deploy gate (main branch push only)
- Coverage reports uploaded as artifacts (14-day retention)
- Auto-cancels stale pipeline runs on same branch

AI Integration Details

The platform imports and uses Google Gemini AI through `backend/src/services/gemini.ts`:

- Import: `import { GoogleGenerativeAI } from '@google/generative-ai'`
- Models: gemini-2.5-flash (default, cost-effective) and gemini-2.5-pro (high quality)
- Key rotation: Up to 7 API keys with automatic failover on 429 quota errors
- JSON parsing: Handles fenced code blocks and raw JSON responses
- Used by 11 service files: learningService, goalService, codeReviewService, interviewService, contestService, problemAiService, analyzerAiService, rewindAiService, ratingEstimatorService, mixedPracticeService, mentorService

System Architecture

- Client: Next.js 14 App Router with 19 route directories, Monaco editor, Yjs collaborative binding, WebRTC voice mesh, Zustand state management (7 stores), and 4 custom hooks.
- API: Express server with 21 controllers, 42 services, JWT auth middleware, Zod validation, rate limiting, and CORS.
- Data: MongoDB with 27 Mongoose models for users, problems, submissions, goals, groups, rooms, contests, reviews, badges, notifications, interviews, and more.
- AI: Google Gemini 2.5 Flash/Pro via @google/generative-ai (backend/src/services/gemini.ts) for roadmap generation, code review, contest analysis, interview evaluation, and progress insights. Static analyzer provides pre-computed hints to reduce token usage.
- Real-time Layer: Three WebSocket servers — Yjs (collaborative editing with RBAC), Voice (WebRTC signaling with mesh topology), Notify (push notifications).
- Integrations: External platform extractors for Codeforces, LeetCode, CodeChef, AtCoder, HackerRank, HackerEarth, GeeksForGeeks with automatic sync scheduling.
- Browser Extension: Manifest V3 extension capturing submissions in real-time from supported platforms via DOM observation.
- Testing: Vitest test suite (backend/tests/) with 12 unit test files (144 tests) + 8 E2E test files (29 tests) covering auth flows, profile/follow, groups, goals, problems, interviews, notifications.
- CI/CD: GitHub Actions 4-stage pipeline — unit tests, E2E (Docker Compose), Docker image build, deploy gate.

Key API Endpoints

- POST /api/auth/register — User registration with email verification
- POST /api/auth/login — Login (returns JWT access + refresh token)
- POST /api/auth/refresh — Refresh access token from HttpOnly cookie
- GET /api/auth/me — Current user profile
- POST /api/goals — Create AI-generated learning roadmap
- GET /api/goals — List user goals
- PATCH /api/goals/:id/modules/:moduleId — Update module status (quiz-gated)
- GET /api/goals/:id/modules/:moduleId/content — Get/generate learning content
- POST /api/goals/:id/modules/:moduleId/quiz/submit — Submit quiz answers
- POST /api/groups — Create study group
- POST /api/groups/:id/challenges — Post challenge to group
- POST /api/groups/:id/challenges/:cid/verify — Verify external platform solve
- GET /api/groups/:id/leaderboard — Group leaderboard
- POST /api/groups/:id/meets — Request pair-coding meeting
- POST /api/groups/:id/meets/:mid/accept — Accept meet with scheduled time
- POST /api/rooms — Create collaborative room
- GET /api/rooms/:id — Room details with participants
- GET /api/analyzer/overview — Submission analytics overview
- POST /api/analyzer/progress — AI-generated progress insights
- POST /api/analyzer/code — AI code analysis
- POST /api/analyzer/recommend — Next problem recommendation
- POST /api/analyzer/recommend/cross-platform — Cross-platform recommendations
- GET /api/code-reviews — List code reviews
- GET /api/code-reviews/unreviewed — Unreviewed submissions
- GET /api/code-reviews/:id — Review details
- GET /api/problems — List problems (with search, filter, pagination)
- POST /api/problems/:slug/submit — Submit solution
- POST /api/problems/:slug/submissions/:sid/review — Request AI code review
- POST /api/contests/analyze — Analyze contest performance
- GET /api/contests/reports — List contest reports
- POST /api/interviews/start — Start mock interview session
- POST /api/interviews/:id/evaluate — Evaluate interview response
- GET /api/integrations — List connected platforms
- POST /api/integrations/connect — Connect external platform
- POST /api/integrations/sync — Trigger manual submission sync
- POST /api/admin/problems — Create problem (admin only)
- PUT /api/admin/problems/:id — Update problem (admin only)
- DELETE /api/admin/problems/:id — Delete problem (admin only)
- POST /api/admin/recommended-goals — Create goal template (admin only)
- GET /api/notifications — List user notifications
- PATCH /api/notifications/:id/read — Mark notification read
- WS /yjs/:roomId — Yjs collaborative editing (RBAC enforced)
- WS /voice/:roomId — WebRTC voice signaling
- WS /notify — Real-time push notifications

In Scope

- AI code review and line-level feedback
- Static analysis hints for supported languages
- Progress insights and topic mastery analytics
- Cross-platform recommendation engine
- Mixed-topic practice generation
- Review history and resource recommendations
- Editor annotations and review UI
- Real-time collaborative coding with Yjs CRDT and cursor awareness
- WebRTC voice chat with mesh topology (max 4 peers)
- Screen sharing with one-at-a-time enforcement
- Group challenges with external platform verification
- Meeting scheduling with acceptor-defined time
- AI-generated learning roadmaps with quiz-gated completion
- Multi-language code examples (C++, Java, Python, C)
- Contest analysis and upsolving guidance
- Mock interview evaluation (code + communication)
- Browser extension for real-time submission capture
- Badge and XP gamification system
- Daily missions for consistent practice
- Admin problem and goal template management
- User profiles with follow/unfollow for collaborative learning networks

Out of Scope

- Languages beyond Python, JavaScript, Java, and C++ for static analysis
- Enterprise SSO or organization-level billing
- CI pipeline or repository-level static analysis
- Mobile native application (planned as future scope)
- Video recording of interviews
- General-purpose social media features (feeds, stories, likes) — note: follow/unfollow IS in scope as a collaborative learning network feature

Future Enhancements

- Add AST-based analysis for deeper correctness and performance signals — current static analyzer (backend/src/analysis/staticAnalyzer.ts) provides regex-based analysis as foundation.
- Expand language coverage and problem context awareness — extractor architecture in backend/src/extractors/ supports pluggable new platforms.
- Improve resource recommendations with deduping across reviews — learningResourceService.ts provides the recommendation pipeline.
- Mobile application (React Native) for on-the-go practice — REST API with JWT auth is mobile-ready.
- Team contests hosted within groups — GroupChallenge model supports extensible contest types.
- Video explanations: AI-generated walkthroughs for solutions — Gemini multimodal API integrable via existing gemini.ts service.
- Peer review system: community-driven code review and mentoring — CodeReview model and review workflow already exist.
- ML-based performance prediction and personalized difficulty scaling — ratingEstimatorService.ts provides the data pipeline.
- Additional platform integrations: TopCoder, SPOJ, USACO — extractor pattern in extractors/ allows easy addition.
- CI/CD pipeline enhancements — add production deployment targets (Vercel, AWS, or Railway) to the existing GitHub Actions pipeline.
- Add team dashboards and aggregated coaching insights — group analytics service can be extended from existing groupService.ts.

Conclusion

AlgoTalk delivers end-to-end code feedback and progress guidance by pairing lightweight static analysis with Gemini-driven reviews and recommendations. The platform comprises 21 controllers, 42 services, 27 models, 7 platform extractors, 3 WebSocket servers (Yjs, Voice, Notify), and a comprehensive test suite of 144 unit tests. The AI integration uses Google Gemini 2.5 Flash/Pro with multi-key rotation, imported via `@google/generative-ai` in `backend/src/services/gemini.ts`. The architecture is modular and scalable, with clear paths to richer analysis, broader language support, and mobile deployment.
