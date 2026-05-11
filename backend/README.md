# AlgoTalk Backend

Express.js + TypeScript REST API server with real-time WebSocket services.

## Architecture

```
src/
├── index.ts              # Entry point – HTTP server, WS upgrades
├── config/               # Database, environment, logger
├── controllers/          # 21 route handlers (thin, delegate to services)
├── services/             # 30+ business logic modules
├── models/               # 26 Mongoose schemas
├── middleware/            # Auth, rate limiting, validation, error handling
├── routes/               # Express route definitions
├── extractors/           # 7 platform scrapers (LeetCode, CF, CC, etc.)
├── prompts/              # AI prompt templates for Gemini
├── analysis/             # Static code analyzer
├── notify/               # WebSocket push notification server
├── voice/                # WebRTC signaling server (mesh topology)
├── yjs/                  # Yjs CRDT collaborative editing server
├── utils/                # Error classes, helpers
└── seed/                 # Database seeders (problems, users, contests)
```

## Key Design Decisions

- **Service Layer Pattern**: Controllers only parse requests and call services. All business logic lives in services.
- **Zod Validation**: Every endpoint validates input via Zod schemas in the `validate` middleware.
- **AI Key Rotation**: Up to 7 Gemini API keys rotated round-robin to maximize quota.
- **Roadmap Caching**: Two-tier cache (in-memory Map with 24h TTL + DB lookup for recent goals) prevents redundant AI generation.
- **WebSocket Multiplexing**: Three WS servers (Yjs, Voice, Notify) share one HTTP server via path-based routing.
- **RBAC for Rooms**: Per-user read/write roles enforced at the Yjs protocol level.

## Models (26)

| Model | Purpose |
|-------|---------|
| User | Accounts, roles, connected platforms |
| Session | JWT refresh token sessions |
| Problem | Coding problems with test cases |
| Submission | User solutions and execution results |
| Goal | Learning roadmaps with module hierarchy |
| LearningContent | Cached concepts, examples, quizzes per module |
| Group | Study groups with members and invite codes |
| GroupChallenge | Challenges posted within groups |
| MeetRequest | Pair-coding meeting requests |
| Room / RoomSnapshot | Collaborative coding rooms with Yjs snapshots |
| Contest / UserContest / ContestReport | Contest tracking and AI analysis |
| InterviewSession | Mock interview sessions |
| CodeReview | AI-generated code reviews |
| Badge | Achievement definitions and criteria |
| Notification | Push notification records |
| Integration | External platform connections |
| ExtractedSubmission | Synced external submissions |
| MentorConversation | AI mentor chat history |
| DailyFocus / DailyMission | Daily learning tasks |
| AuditLog | Admin action audit trail |
| Webhook / ExtensionToken | Browser extension integration |

## WebSocket Servers

### Yjs Server (`/yjs/:roomId`)

- Yjs v2 protocol over WebSocket
- RBAC: owner (read+write), writers (max 3, read+write), others (read-only)
- Snapshots persisted to MongoDB every 30 seconds
- Awareness protocol for cursor presence

### Voice Server (`/voice/:roomId`)

- WebRTC mesh signaling (max 4 peers)
- ICE candidate and SDP offer/answer relay
- Screen sharing: one-at-a-time enforcement

### Notification Server (`/notify`)
- JWT-authenticated WebSocket connections
- Real-time push for: challenge posts, meet requests, badge awards, etc.

## Running

```bash
npm install
cp .env.example .env   # Configure MongoDB URI, JWT secret, Gemini keys
npm run dev             # Development with hot reload (tsx watch)
npm run build           # Compile TypeScript
npm start               # Production
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run seed:problems` | Seed coding problems |
| `npm run seed:users` | Seed test users |
| `npm run seed:contests` | Seed contest data |
| `node scripts/promote-admin.mjs` | Promote a user to admin role |
