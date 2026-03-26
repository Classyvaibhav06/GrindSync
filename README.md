
# 🚀 GrindSync
**Elevate Your Grind. Sync Your Progress.**

GrindSync is a "Proof of Progress" social platform designed for developers. It eliminates "tutorial hell" by automatically tracking your DSA performance (LeetCode) and project contributions (GitHub), allowing you to build in public and collaborate with like-minded developers.

---

## ✨ Key Features (Roadmap)

- **🔄 Automatic Progress Sync:** Real-time stats from LeetCode (Solved problems) and GitHub (Commits/Activity).
- **📈 Weighted Ranking:** Projects are ranked by a combination of community votes and actual coding activity.
- **🤝 Contribution Marketplace:** List your projects and find contributors based on their verified tech stack and skill level.
- **🛡️ Developer Identity:** A profile that acts as a living resume with verified "Proof of Work."

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19 (Compiler enabled), Tailwind CSS
- **Backend:** Node.js, Next.js Server Actions
- **Database:** MongoDB with Mongoose
- **Authentication:** NextAuth.js (GitHub Provider)
- **Real-time:** Socket.io (Planned for Phase 4)

---



## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- GitHub OAuth credentials (client ID & secret)

### Installation

1. **Clone the repository:**
   bash
   git clone https://github.com/Classyvaibhav06/GrindSync.git
   cd GrindSync
   

2. **Install dependencies:**
   bash
   npm install
   

3. **Configure environment variables:**
   Create a `.env.local` file at the project root and set the required variables, e.g.:

   env
   NEXTAUTH_SECRET=your-secret
   NEXTAUTH_URL=http://localhost:3000
   NODE_ENV=development   # set to "production" on Vercel or other hosts
   

4. **Run the development server:**
   bash
   npm run dev
   

> **Note:** In production, the middleware now enforces secure cookies (`secureCookie: true`). Ensure `NODE_ENV` is set to "production" and that your deployment uses HTTPS so authentication works correctly.

---