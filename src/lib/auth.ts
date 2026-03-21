import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "./mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

export const authOptions: AuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email / Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) return null;

        const client = await clientPromise;
        const db = client.db();

        const user = await db.collection("users").findOne({
          $or: [
            { email: credentials.identifier },
            { username: credentials.identifier },
          ],
        });

        if (!user || (!user.password && user.email)) {
          throw new Error("Invalid login credentials or use Google Login");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isPasswordValid) {
          throw new Error("Invalid login credentials");
        }

        // ⚠️  Do NOT include `image` here.
        // Base64 profile photos stored in the JWT cookie cause HTTP 431
        // (Request Header Fields Too Large). Avatar is fetched live client-side
        // via /api/users/[id]/avatar instead.
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          username: user.username,
        } as any;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
      }

      // ⚠️ CRITICAL: NextAuth auto-copies user.image → token.picture.
      // For Google OAuth, the adapter returns the full DB user which may
      // contain a huge base64 avatar → blows up the JWT cookie → HTTP 431.
      // We MUST delete it on every invocation, not just on sign-in.
      delete token.picture;

      if (trigger === "update") {
        if (session?.username) {
          token.username = session.username;
        } else {
          // Re-fetch only lightweight fields (no image)
          try {
            const client = await clientPromise;
            const db = client.db();
            const dbUser = await db.collection("users").findOne(
              { _id: new ObjectId(token.id as string) },
              { projection: { username: 1 } }
            );
            if (dbUser) token.username = dbUser.username;
          } catch (e) {
            console.error("JWT update user fetch error", e);
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        // image is NOT set from token — UI fetches it live via /api/users/[id]/avatar
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
