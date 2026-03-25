# GrindSync - Product Requirements Document

## Overview
GrindSync is a developer gamification and social productivity platform that turns coding activity into a competitive, social experience. Users earn XP, climb leaderboards, complete coding challenges, track GitHub activity, and collaborate on projects — all in one platform.

## Core Features

### 1. Authentication
- Users can sign up and log in with email/password credentials
- Users can sign in with GitHub OAuth
- Users can sign in with Google OAuth
- Session management via NextAuth
- Protected routes redirect unauthenticated users to the sign-in page

### 2. User Profile
- Display user avatar, username, bio, and XP level
- Show linked GitHub username
- Show linked LeetCode username
- Show coding screen time (via CodeTime/WakaTime integration)
- Edit profile settings (bio, avatar, integrations)
- Badge showcase section

### 3. Leaderboard
- Global leaderboard ranked by XP
- Shows top users with their rank, avatar, XP, and streak
- Filterable by time period (weekly, monthly, all-time)
- Current user's rank is highlighted

### 4. GitHub Activity Dashboard
- Connect GitHub account via username
- Display 7-day commit activity bar graph
- Show hover tooltips with commit counts per day
- Fallback state for unlinked GitHub accounts

### 5. Daily DSA Challenges
- Display a daily LeetCode problem
- Clicking the problem redirects user to LeetCode
- Automatic detection of challenge completion via LeetCode username
- Award XP upon successful challenge completion

### 6. Coding Challenges
- List of active coding challenges with difficulty and rewards
- Users can join challenges
- Progress tracking via WakaTime / GitHub activity
- Completion awards XP

### 7. Real-time Chat
- Direct messaging between users
- Online/offline presence indicators
- Chat history persistence
- Notification badges for unread messages

### 8. Project War Room (Collaborative Projects)
- Users can create and showcase coding projects
- Other users can join as contributors
- GitHub commit activity automatically earns XP
- Project status (active, completed, looking for contributors)

### 9. VS Code Extension Integration
- Custom VS Code extension tracks coding time
- Time data syncs with GrindSync backend
- Screen time displayed on user profile

### 10. XP & Gamification System
- Actions award XP: commits, challenge completions, daily logins, messages
- XP levels with named tiers
- Streaks for daily check-ins and coding activity
- Badges for milestones

## User Flows

### Sign Up Flow
1. User visits homepage
2. Clicks "Sign Up"
3. Enters email and password or uses OAuth
4. Redirected to dashboard upon success

### Login Flow
1. User visits /signin
2. Enters credentials or uses OAuth button
3. Redirected to dashboard

### Daily Challenge Flow
1. User visits dashboard / challenges page
2. Sees today's LeetCode problem
3. Clicks to open on LeetCode
4. Solves the problem; system auto-detects completion
5. XP is awarded and shown in a toast notification

### Leaderboard Flow
1. User navigates to Leaderboard page
2. Sees ranked list of users
3. Can filter by time period
4. Clicks a user to view their profile

### Profile Settings Flow
1. User clicks profile icon
2. Navigates to settings
3. Updates GitHub username, LeetCode username, bio
4. Saves changes; toast confirms success

## Technical Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB with NextAuth MongoDB Adapter
- **Authentication**: NextAuth v4
- **UI**: Tailwind CSS v4, shadcn/ui components
- **Animations**: Framer Motion
- **Icons**: Lucide React, Tabler Icons

## Pages / Routes
- `/` - Dashboard / Home (authenticated)
- `/signin` - Sign in page
- `/signup` - Sign up page
- `/leaderboard` - Global leaderboard
- `/challenges` - Coding challenges list
- `/profile/[username]` - Public user profile
- `/settings` - User settings & integrations
- `/projects` - Project War Room
- `/chat` - Real-time chat
- `/api/auth/[...nextauth]` - Auth API
- `/api/user/*` - User data APIs
- `/api/github/*` - GitHub integration APIs
- `/api/leetcode/*` - LeetCode integration APIs
