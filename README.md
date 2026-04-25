# Quiz System - Frontend

A React-based frontend for live polling and quiz sessions. Built with React 19, Vite, and Tailwind CSS.

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **React Router 7** - Client-side routing
- **TanStack React Query** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS 4** - Styling
- **Recharts** - Charts/visualizations
- **@dnd-kit** - Drag and drop
- **Lucide React** - Icons
- **QRCode** - QR code generation
- **WebSocket** - Real-time communication

## Project Structure

```
frontend/src/
├── App.jsx                    # Main app with routing
├── main.jsx                   # Entry point
├── index.css                  # Global styles
├── store/
│   └── authStore.js          # Zustand store for auth state
├── context/
│   ├── SessionsContext.jsx    # Sessions state management
│   └── ShellContext.jsx      # Shell/layout state
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx        # Top navigation
│   │   └── Sidebar.jsx        # Side navigation
│   ├── dashboard/
│   │   ├── SessionCard.jsx    # Session card component
│   │   ├── StatCard.jsx      # Stats card component
│   │   └── Tabs.jsx          # Tab component
│   └── ui/
│       ├── Modal.jsx          # Modal component
│       ├── KebabMenu.jsx     # Kebab menu
│       └── Sparkline.jsx     # Sparkline chart
├── layouts/
│   └── HostLayout.jsx        # Host dashboard layout
├── pages/
│   ├── LoginPage.jsx        # Login page
│   ├── DashboardPage.jsx    # Sessions dashboard
│   ├── BuilderPage.jsx      # Quiz question builder
│   ├── LivePage.jsx          # Live polling page
│   ├── AnalyticsPage.jsx   # Analytics dashboard
│   ├── ReportsPage.jsx       # Reports page
│   └── ParticipantSessionPage.jsx  # Participant join page
├── services/
│   ├── authApi.js            # Auth API client
│   ├── dashboardApi.js      # Dashboard API client
│   ├── builderApi.js         # Builder API client
│   └── realtimeClient.js     # Real-time WebSocket client
└── hooks/
    └── useDebouncedValue.js  # Debounce hook
```

## Pages

### LoginPage
- Email/password login form
- JWT token storage with refresh mechanism

### DashboardPage
- Session list with filtering (All/Draft/Live/Completed)
- Search and date range filters
- Department filter
- Create new session modal
- Share session modal with QR code
- Session actions: edit, duplicate, launch, archive, delete, share

### BuilderPage
- Session selector dropdown
- Question type palette (MCQ, Word Cloud, Rating, Text, True/False, Ranking)
- Drag-and-drop question reordering
- Question editor with:
  - Text input
  - Media upload (images, videos, audio)
  - Options editor (for MCQ)
  - Time limit settings
  - Quiz mode with points
- Session settings panel:
  - Join requirements (anonymous, name, name+email)
  - Anonymous mode toggle
  - Leaderboard toggle
  - Max participants
  - Session password
- Live preview modal

### LivePage
- Real-time participant view
- Current question display
- Results/chart display
- Q&A panel with upvoting
- Live WebSocket connection for real-time updates

### AnalyticsPage
- Session analytics
- Response rate charts
- Question-level breakdown
- Export functionality

### ReportsPage
- Report generation
- Data export (CSV/Excel)

### ParticipantSessionPage
- Public join page (`/join/:sessionId`)
- Name/email entry (based on session settings)
- Real-time response interface
- Leaderboard view
- Q&A submission

## API Integration

The frontend communicates with the backend at `VITE_API_BASE_URL` (default: `http://localhost:5000/api/v1`).

### Authentication Flow
1. User submits credentials via `loginApi`
2. Backend returns user + access/refresh tokens
3. Tokens stored in Zustand with localStorage persistence
4. On app load, `bootstrapAuth` attempts to refresh token or validate existing token

### Session Management
- Sessions fetched via React Query
- Optimistic updates for create/update/delete operations
- Real-time updates via WebSocket

## WebSocket Integration

The frontend uses WebSocket for real-time updates during live sessions.

### Connection URL
- `VITE_WS_BASE_URL` - WebSocket server URL (default: `ws://localhost:5000/ws`)

### Creating a Client

```javascript
import { createRealtimeClient, RealtimeEvent } from './services/realtimeClient'

const client = createRealtimeClient("/", {
  session: "ABC123",      // Session code
  token: "jwt_token",     // Optional auth token
  role: "host"           // "host" or "participant"
})

client.on(RealtimeEvent.CONNECTED, (data) => {
  console.log("Connected to session")
})

client.on(RealtimeEvent.RESPONSE_RECEIVED, (data) => {
  console.log("New response:", data.results)
})

client.connect()
```

### Event Types

| Event | Description |
|-------|-------------|
| `connected` | WebSocket connection established |
| `response_received` | New participant response submitted |
| `session_updated` | Session status changed |
| `question_changed` | Current question changed |
| `leaderboard_update` | Leaderboard rankings updated |
| `participant_joined` | New participant joined |
| `participant_left` | Participant left the session |

### RealtimeClient API

```javascript
const client = createRealtimeClient(path, options)

// Connect to WebSocket server
client.connect()

// Disconnect
client.disconnect()

// Send message to server
client.send({ type: "ping" })

// Subscribe to events
const unsubscribe = client.on(event, handler)

// Unsubscribe
client.off(event, handler)

// Check connection status
client.isConnected  // boolean
client.readyState    // WebSocket state
```

## State Management

### Auth Store (Zustand)
- `user` - Current user object
- `accessToken` - JWT access token
- `refreshToken` - JWT refresh token
- `isBootstrapping` - Initial load state
- `login()` - Login action
- `logout()` - Logout action
- `bootstrapAuth()` - Validate/restore session

### Sessions Context
- Sessions stored in localStorage
- CRUD operations: create, update, delete, duplicate
- Auto-persistence

## Routing

Protected routes (require auth):
- `/dashboard` - DashboardPage
- `/builder` - BuilderPage
- `/live` - LivePage
- `/analytics` - AnalyticsPage
- `/reports` - ReportsPage

Public routes:
- `/join/:sessionId` - ParticipantSessionPage
- `/login` - LoginPage

## Environment Variables

- `VITE_API_BASE_URL` - Backend API URL (default: `http://localhost:5000/api/v1`)
- `VITE_WS_BASE_URL` - WebSocket server URL (default: `ws://localhost:5000/ws`)

## Commands

```bash
npm install    # Install dependencies
npm run dev   # Start development server
npm run build # Build for production
npm run lint  # Run ESLint
```