# Momentum12

A comprehensive habit tracking and 12 Week Year planning mobile application built with React Native (Expo) and Node.js.

## Overview

Momentum12 helps you achieve more in 12 weeks than most people do in 12 months by combining:
- **Habit Tracking** with streaks, statistics, and reminders
- **12 Week Year Planning** with strategic and weekly goals
- **Daily Execution Tracking** with scorecards
- **Analytics Dashboard** with trends and insights

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Cache**: Redis
- **Authentication**: JWT with refresh token rotation
- **Validation**: Zod

### Mobile App
- **Framework**: React Native with Expo SDK 54+
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Redux Toolkit + RTK Query
- **Animations**: React Native Reanimated 3
- **Storage**: MMKV + Expo Secure Store
- **UI Components**: Custom design system

## Project Structure

```
Momentum12/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── config/         # Environment & database config
│   │   ├── controllers/    # REST controllers
│   │   ├── middleware/     # Auth, validation, error handling
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # API route definitions
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helpers, calculators
│   └── package.json
│
├── mobile/                  # Expo React Native App
│   ├── app/                # Expo Router screens
│   │   ├── (auth)/         # Auth screens
│   │   ├── (tabs)/         # Main tab screens
│   │   └── modals/         # Modal screens
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom hooks
│   ├── services/           # API client, sync, notifications
│   ├── store/              # Redux store & slices
│   ├── theme/              # Design tokens
│   └── package.json
│
└── spec.md                  # Full specification document
```

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, for caching)
- Expo CLI
- iOS Simulator / Android Emulator / Physical device

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/momentum12
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
```

4. Start the development server:
```bash
npm run dev
```

### Mobile App Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

4. Start the Expo development server:
```bash
npx expo start
```

5. Run on your device:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh tokens
- `POST /api/v1/auth/logout` - Logout

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PATCH /api/v1/users/profile` - Update profile
- `PATCH /api/v1/users/preferences` - Update preferences

### Plans
- `GET /api/v1/plans` - Get all plans
- `GET /api/v1/plans/active` - Get active plan
- `POST /api/v1/plans` - Create plan
- `POST /api/v1/plans/:id/activate` - Activate plan

### Habits
- `GET /api/v1/habits` - Get all habits
- `POST /api/v1/habits` - Create habit
- `PATCH /api/v1/habits/:id` - Update habit
- `DELETE /api/v1/habits/:id` - Delete habit

### Executions
- `GET /api/v1/executions/today` - Get today's execution
- `POST /api/v1/executions/:id/habits/:habitId/complete` - Complete habit

### Analytics
- `GET /api/v1/analytics/dashboard` - Get dashboard data
- `GET /api/v1/analytics/trends` - Get trends

## Key Features

### 12 Week Year Methodology
The app is built around the 12 Week Year methodology:
- **Vision Statement**: Define what success looks like
- **Strategic Goals**: 3-5 major goals for the 12 weeks
- **Weekly Goals**: Broken down actions for each week
- **Execution Score**: Track weekly execution (85%+ target)

### Habit Tracking
- Daily, weekly, or custom frequency
- Streak tracking with milestones
- Completion rate statistics
- Visual heatmap of activity

### Daily Execution
- Daily checklist of habits and actions
- Scorecard with weighted scoring (60% habits, 40% goals)
- Daily reflection with wins, challenges, and learnings

### Analytics
- Execution score trends
- Habit performance comparison
- Goal progress tracking
- Activity heatmap

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Coverage
```bash
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

ISC License

