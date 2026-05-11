# AlgoTalk Frontend

Next.js 14 (App Router) with Tailwind CSS, Zustand, and Monaco Editor.

## Architecture

```
src/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout with AppShell
│   ├── login/            # Auth pages
│   ├── dashboard/        # Main dashboard
│   ├── solve/[slug]/     # Problem solving with Monaco editor
│   ├── goals/            # Learning roadmaps
│   ├── groups/[id]/      # Group detail with challenges, meets
│   ├── rooms/[id]/       # Collaborative coding room
│   ├── contests/         # Contest tracking
│   ├── interviews/       # Mock interview sessions
│   ├── admin/            # Admin panel (problems, recommended goals)
│   └── settings/         # User settings, integrations
├── components/           # Reusable UI components
│   ├── AppShell.tsx      # Navigation shell with sidebar
│   ├── groups/           # Group-specific components
│   ├── interview/        # Interview UI components
│   └── ui/               # Base UI primitives
├── hooks/                # Custom React hooks
│   ├── useYjs.ts         # Yjs collaborative editing
│   ├── useVoiceMesh.ts   # WebRTC voice chat
│   └── ...
├── lib/                  # API client, utilities
│   └── api.ts            # Axios instance with JWT interceptors
├── stores/               # Zustand state stores
│   ├── authStore.ts      # Authentication state
│   └── ...
└── types/                # TypeScript type definitions
```

## Key Features

### Collaborative Editor

- **Monaco Editor** with Yjs binding for real-time multi-cursor editing
- Language selector, theme switching, code execution
- Room-level RBAC (owner, writer, readonly)

### Voice Chat
- WebRTC mesh topology (max 4 peers)
- Push-to-talk and always-on modes
- Per-peer volume control and speaker detection
- Screen sharing (one-at-a-time)

### Learning Modules

- Multi-language code examples with language switcher (C++, Java, Python, C)
- Interactive quizzes with immediate feedback
- Problem links tab with external platform references
- Quiz-gated module completion (≥70% required)

### Group Challenges
- Chat-style challenge cards (left/right aligned by creator)
- Custom deadlines with countdown timers
- External platform verification (LeetCode, Codeforces, etc.)
- Leaderboard with points and accuracy

### Pomodoro Timer
- Customizable work/break durations
- Audio alert 5 seconds before timer ends
- Integrated into the collaborative room

## State Management

Zustand stores with persistence:

- `authStore` — JWT tokens, user profile, login/logout
- Additional stores for goals, groups, notifications

## Running

```bash
npm install
cp .env.example .env.local   # Set NEXT_PUBLIC_API_URL
npm run dev                   # Development on port 3000
npm run build                 # Production build
npm start                     # Production server
```

## Browser Extension

Located in `extensions/learnhub-capture/`. Captures competitive programming submissions in real-time from supported platforms and syncs them to AlgoTalk.

### Supported Platforms

- LeetCode, Codeforces, CodeChef, AtCoder, HackerRank, HackerEarth, GeeksForGeeks
