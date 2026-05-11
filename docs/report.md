# AlgoTalk — AI-Powered Collaborative Learning & Competitive Programming Platform

**GitHub URL:** https://github.com/sai2327/AlgoTalk

---

## Description

In the current competitive programming and technical interview landscape, students invest significant time practicing on platforms like LeetCode, Codeforces, CodeChef, GeeksForGeeks, HackerRank, HackerEarth, and AtCoder, yet struggle to achieve structured improvement in problem-solving and communication skills. The primary issue lies in the absence of a unified intelligent system that can guide learners based on their performance and learning patterns.

Most students participate in coding contests but fail to effectively analyze their mistakes or upsolve unsolved problems. This results in repetitive practice without understanding core concepts, patterns, or problem-solving strategies. Consequently, learning remains unstructured, inconsistent, and inefficient.

Additionally, the rapid adoption of AI tools has introduced a new challenge. Many learners rely on AI-generated solutions without fully understanding the reasoning behind them. This reduces independent thinking and leads to shallow conceptual knowledge rather than deep mastery.

Another major problem is the fragmentation of learning across multiple platforms. Since each platform focuses on different skill sets, students find it difficult to track overall progress, identify weak areas, and determine the next steps in their preparation.

Furthermore, many students lack the ability to clearly communicate their problem-solving approach during interviews. Even with strong technical knowledge, poor explanation skills lead to reduced confidence and performance.

These challenges highlight the need for an intelligent, integrated platform that enables structured learning, performance analysis, reduced AI dependency, and improved communication skills.

---

## Problem Statement

In today's competitive programming and technical interview ecosystem, students struggle to develop strong problem-solving and communication skills despite actively practicing on coding platforms. Existing platforms provide large collections of problems and contests but lack a unified intelligent system to guide structured learning, identify weaknesses, and improve overall performance.

A major challenge is the inability to analyze and improve weak areas in Data Structures and Algorithms (DSA). Although students participate in contests, nearly 90–95% fail to upsolve unsolved problems. This results in repetitive practice without understanding underlying concepts, leading to inconsistent and unstructured learning.

Another critical issue is the growing dependence on AI tools. Many students directly view AI-generated solutions instead of developing their own problem-solving approach. While AI provides quick answers, it often bypasses the reasoning process, resulting in shallow understanding and weak analytical skills.

Additionally, students practice across multiple platforms, each focusing on different skills such as algorithms, implementation, and logical reasoning. This fragmented learning makes it difficult to track overall progress, assess skill levels, and determine the next learning path.

Furthermore, many students lack communication and explanation skills required for interviews. Even with good technical knowledge, they struggle to clearly explain their approach, logic, and optimizations, reducing their interview performance.

These challenges highlight the need for an intelligent, unified system that enables structured learning, tracks progress, reduces AI dependency, and improves both problem-solving and communication skills.

---

## Proposed Solution

To address the identified challenges, we propose AlgoTalk — an AI-powered unified learning platform that enhances problem-solving, structured learning, and communication skills.

**1. Intelligent Contest Analysis**
The system analyzes user contest performance, including wrong submissions, time taken, and problem-solving patterns. It generates a detailed AI report with:
- Weak area identification across topics
- Required algorithms and concepts to review
- Step-by-step upsolving guidance
- Clear explanation of problem-solving approaches

**2. Structured Collaborative Learning**
The platform enables focused peer collaboration through:
- Group-based coding challenges (no distraction chat)
- Request-based live problem-solving sessions
- Real-time collaborative code editor (powered by Yjs CRDT)
- Voice interaction for explanation and discussion (WebRTC)
- Leaderboard with time-based scoring within groups

**3. Personalized AI Roadmap Generation**
By tracking user activity across platforms, the AI builds a complete profile of the learner and provides:
- Personalized learning roadmap with sequentially unlocked modules
- Topic-wise focus recommendations based on weak areas
- Adaptive difficulty progression (Beginner → Intermediate → Advanced → Master)
- Progress tracking with goal streaks and completion metrics

**4. AI-Based Mock Interview Evaluation**
The system conducts AI mock interviews where users explain their problem-solving approach. The AI evaluates:
- Clarity of explanation and logical thinking
- Code quality and approach correctness
- Mistakes and gaps in understanding
- Actionable feedback and improvement suggestions

---

## Requirements

### Functional Requirements

**User Authentication & Profile Management**
- Secure signup and login with JWT-based authentication
- Email/username login with role-based access (user, moderator, admin)
- Two-factor authentication support
- Track user XP, level, streaks, badges, and skill profile
- Profile pages with platform integration stats

**Contest Analysis System**
- Import and track contests from LeetCode, Codeforces, CodeChef, GeeksForGeeks, HackerRank, HackerEarth, and AtCoder
- Analyze submissions (wrong attempts, time taken, accepted patterns)
- Identify weak topics and problem areas from performance data
- Generate detailed AI-powered performance reports using Gemini
- Provide upsolving guidance with concepts and algorithms via AI
- Year-in-review (Rewind) feature showing annual progress stats

**AI-Powered Goal & Learning Roadmap System**
- Generate personalized learning roadmaps via Gemini AI based on user's weak areas
- Sequential module unlocking (next module unlocks only after previous is completed)
- Each module contains AI-generated concepts, code examples, and quiz questions
- Quiz-gated completion (must pass with ≥70% score)
- Problem-solving gated completion (must solve all assigned problems)
- Admin-curated quest templates (no AI, only problem-solving paths)
- Company-specific preparation paths (Google, Amazon, Microsoft, Meta, etc.)
- Focus mode, Pomodoro timer, and burnout risk detection
- Goal export as Markdown

**Collaborative Learning Module**
- Create and join groups with role-based management
- Post group coding challenges with time limits and scoring
- Request and accept live problem-solving sessions (peer-to-peer)
- Real-time collaborative code editor with cursor tracking (Yjs + WebSockets)
- Voice interaction during coding sessions (WebRTC)
- Group leaderboard with time-based scoring
- Room snapshots for session history

**AI-Based Mock Interview System**
- Start AI mock interview sessions by topic, difficulty, category, and company
- Multiple interview modes: DSA, System Design, SQL, Frontend, Backend, Behavioral, CS Fundamentals
- Real-time code editor within interview session
- Submit solution code for AI evaluation
- AI explains approach and provides detailed feedback
- Admin-curated interview question bank (DSA, System Design, Behavioral, SQL, OS, Networking, HR)
- Add interview questions directly to personal learning path

**Progress Tracking & Analytics**
- Unified analytics dashboard across all connected platforms
- Topic mastery breakdown with improvement trends
- Failure pattern analysis (TLE, WA, RE patterns)
- Visual progress charts (accuracy, speed, topic coverage)
- XP system with levels, streaks, and badge achievements
- Daily missions and focus tracking
- Burnout risk detection based on activity patterns

**Platform Integration**
- API-based submission sync from LeetCode, Codeforces, CodeChef, GeeksForGeeks, HackerRank, HackerEarth, and AtCoder
- Automatic extraction of problem tags, difficulty, and topic mapping
- Background sync scheduler with configurable intervals
- Unified cross-platform progress tracking

**Notification System**
- Real-time in-app notifications via WebSocket
- Email notifications for key events
- Notification preferences management (per event type)
- Push notification support via service workers

**Admin Control Panel**
- Manage all users, roles, and permissions
- Create and publish recommended goal templates, quests, and company prep paths
- Manage interview question bank (CRUD + bulk import)
- Seed and manage problem database
- Audit logs for all admin actions
- Platform-wide content moderation

### Technical Requirements

**Frontend**
- Next.js 14 with App Router and TypeScript
- Responsive design supporting both mobile and desktop
- Real-time UI updates via WebSocket connections
- Zustand for global state management
- Tailwind CSS for styling

**Backend**
- Node.js with Express.js and TypeScript
- RESTful APIs for all platform communication
- Modular, scalable architecture with service/controller separation
- Vitest for unit testing (144 tests across 12 test files)

**Database**
- MongoDB (NoSQL) with Mongoose ODM
- Efficient schema design for tracking submissions, progress, and history
- TTL-based caching layer for high-frequency queries

**AI Integration**
- Google Gemini 2.5 Flash and Gemini 2.5 Pro APIs
- Multi-key rotation for rate limit management
- AI-generated concepts, examples, and quiz questions per learning module
- AI-powered contest analysis and upsolving reports
- AI mock interview evaluation and feedback

**Real-Time Features**
- Yjs CRDT over WebSockets for real-time collaborative code editing
- WebRTC for peer-to-peer voice communication in sessions
- Socket-based notification delivery
- Real-time signaling server for voice session management

**Security & Performance**
- JWT-based authentication with access/refresh token rotation
- bcrypt password hashing
- Helmet.js for HTTP security headers
- CORS, rate limiting, and input validation (Zod)
- API-level role-based access control

---

## Technologies Used

| Layer | Technologies |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB, Mongoose |
| AI | Google Gemini 2.5 Flash, Google Gemini 2.5 Pro |
| Real-Time | Yjs (CRDT), WebSockets, WebRTC |
| Auth & Security | JWT, bcrypt, Helmet.js, Zod, CORS, Rate Limiting |
| Integration | LeetCode API, Codeforces API, CodeChef API, GFG API, HackerRank API, HackerEarth API, AtCoder API |
| DevOps | Docker, Docker Compose, GitHub Actions (CI/CD) |
| Version Control | Git, GitHub |
| Testing | Vitest |

---

## System Architecture

The system follows a scalable, modular full-stack architecture integrating AI and real-time communication components.

**1. Frontend Layer (Client Side)**
Built using Next.js 14 with TypeScript and App Router. Provides user interface for Dashboard, Goals/Learning, Groups, Contests, Interviews, and Analytics. Communicates with the backend via REST APIs and handles real-time updates using WebSocket connections.

**2. Backend Layer (Application Server)**
Built using Node.js and Express.js with TypeScript. Core responsibilities:
- REST API handling (auth, goals, contests, groups, analytics, interviews)
- Business logic processing and service orchestration
- Integration with Google Gemini AI services
- Modular controller/service/model architecture

**3. AI Processing Layer**
Powered by Google Gemini 2.5 Flash and Pro APIs. Handles:
- Contest performance analysis and weak area detection
- Personalized learning roadmap generation
- Module concept and quiz generation
- Mock interview evaluation and feedback generation
- Code quality analysis and improvement suggestions

**4. Database Layer**
MongoDB with Mongoose ODM. Stores:
- User profiles, authentication data, and XP/badges
- Contest registrations, submissions, and performance history
- Goals, modules, learning content, and quiz attempts
- Group challenges, rooms, and session snapshots
- Analytics, reports, and audit logs

**5. Real-Time Communication Layer**
- Yjs CRDT over WebSockets for live collaborative code editing
- WebRTC with signaling server for voice/session communication
- WebSocket-based notification delivery to connected clients

**6. Platform Integration Layer**
Connects with external coding platforms via REST APIs. Fetches user performance data (submissions, ratings, contest history) from 7 platforms and enables unified progress tracking.

**7. Security Layer**
- JWT authentication for secure API access
- bcrypt for password hashing
- Zod schema validation for all incoming requests
- Role-based access control (user, moderator, admin)
- Helmet.js for HTTP security headers and CORS policy enforcement

**Data Flow:**
User → Next.js Frontend → Express.js REST API → Service Layer → Gemini AI / MongoDB → Response → Frontend (Real-time updates via WebSockets)

---

## In Scope

The proposed system focuses on improving problem-solving, structured learning, and communication skills for students preparing for competitive programming and technical interviews. The scope includes:

**AI-Based Performance Analysis**
Analyzing user contest data (submissions, time, errors) from 7 integrated platforms to identify weak areas and provide actionable AI-generated insights and upsolving reports.

**Personalized Learning System**
Generating adaptive roadmaps with sequential module unlocking, AI-generated concepts and quizzes, topic-wise recommendations, and guided learning paths based on user's actual weak areas.

**Upsolving & Concept Enhancement**
Providing AI-generated structured explanations, required algorithms, and step-by-step guidance per contest problem to improve conceptual understanding.

**Collaborative Learning Environment**
Enabling group-based challenges, peer interaction through live coding sessions with real-time collaborative editor, and voice-based discussion without distraction.

**Communication Skill Development**
Allowing users to conduct AI mock interviews, explain their problem-solving approach, and receive AI-based feedback to improve clarity and interview readiness.

**Unified Progress Tracking**
Monitoring user activity across 7 platforms to provide a centralized view of growth, performance, and skill level through the analytics dashboard.

**Real-Time Interaction Features**
Supporting live collaboration through a Yjs-powered code editor and WebRTC-based voice sessions.

**Admin-Curated Content**
Admin-controlled interview question bank, quest templates, and company-specific preparation paths that are published to all users.

---

## Out of Scope

The project focuses on guided learning and analysis, and the following aspects are not included:

**Full Replacement of Coding Platforms**
The system does not aim to replace platforms like LeetCode or Codeforces, but rather enhances learning using their data.

**Hosting Large-Scale Competitive Contests**
The platform does not support large-scale global contests with complex ranking systems.

**Custom AI Model Training**
The project uses existing Google Gemini AI APIs and does not involve training custom large-scale machine learning models from scratch.

**Non-Technical Domain Learning**
The system is limited to Data Structures, Algorithms, and coding-related skills, and does not cover other academic subjects.

**General Social Networking Features**
Open chat systems, social feeds, and unrelated interactions are excluded to maintain focused learning.

**Offline Functionality**
The platform requires internet connectivity and does not support full offline usage.

---

## Future Enhancements

- Mobile application (iOS and Android) with offline problem-solving support
- Integration with additional coding platforms (Topcoder, SPOJ, InterviewBit)
- AI-powered code plagiarism detection in group challenges
- Automated contest upsolving with video editorial generation
- Peer mentorship matching system based on skill profiles
- Language support beyond English for regional learner accessibility
- Browser extension for passive submission tracking without manual sync
- Leaderboard expansion to global community rankings

---

## Conclusion

AlgoTalk presents an AI-powered unified platform designed to address critical challenges in competitive programming and technical interview preparation. By integrating intelligent performance analysis, personalized sequential learning roadmaps, structured upsolving, and collaborative learning, the platform transforms unstructured practice into a guided and efficient learning process.

The system not only enhances problem-solving skills but also focuses on improving communication and explanation abilities through AI mock interviews, which are essential for interview success. By requiring users to pass quizzes and solve problems before advancing to the next module, it promotes deep conceptual understanding and reduces dependency on AI-provided solutions.

With its scalable Next.js and Express.js architecture, real-time collaboration via Yjs and WebRTC, Gemini AI integration, and unified tracking across 7 coding platforms, AlgoTalk provides a comprehensive ecosystem for continuous improvement and skill development.

In conclusion, this platform bridges the gap between practice and mastery, enabling students to learn effectively, track progress, and confidently perform in real-world technical interviews.
