import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: "TRAINEE" as const,
        }
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          include: { profile: true },
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isValid) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.profile?.firstName
            ? `${user.profile.firstName} ${user.profile.lastName}`
            : user.email,
          image: user.profile?.avatarUrl ?? null,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      if (trigger === "update" && session) {
        token.name = session.name
        token.picture = session.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as import("@prisma/client").Role
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.id) {
        const existingProfile = await prisma.userProfile.findUnique({
          where: { userId: user.id },
        })

        if (!existingProfile && profile) {
          await prisma.userProfile.create({
            data: {
              userId: user.id,
              firstName: (profile.given_name as string) || "",
              lastName: (profile.family_name as string) || "",
              avatarUrl: profile.picture as string | undefined,
            },
          })
        }
      }
      return true
    },
  },
})
