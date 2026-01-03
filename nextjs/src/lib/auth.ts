import { NextAuthOptions, Session, User, Account } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // @ts-ignore PrismaAdapter types mismatch with PrismaClient v5
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/spreadsheets",
        }
      }
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }: { token: JWT; user?: User; account?: Account | null }) {
      if (user) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        token.is_super_admin = dbUser?.is_super_admin || false;
        
        const roles = await prisma.userRole.findMany({ 
          where: { userId: user.id },
          include: { 
            role: {
              include: {
                permissions: true
              }
            }
          }
        });
        token.roles = roles.map((r) => r.roleId);
        
        // Extract permissions
        const perms = new Set<string>();
        roles.forEach((r) => {
          r.role?.permissions?.forEach((p) => {
            perms.add(p.permissionId);
          });
        });
        token.permissions = Array.from(perms);
      }

      // Update tokens in DB when user signs in (NextAuth JWT strategy doesn't do this automatically)
      if (account && token.id) {
        const updateData: Record<string, unknown> = {
          access_token: account.access_token,
          expires_at: account.expires_at,
        };
        if (account.refresh_token) {
          updateData.refresh_token = account.refresh_token;
        }
        await prisma.account.updateMany({
          where: { userId: token.id as string, provider: "google" },
          data: updateData,
        });
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.roles = token.roles || [];
        session.user.permissions = token.permissions || [];
        session.user.is_super_admin = token.is_super_admin || false;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }: { user: User }) {
      await prisma.role.upsert({
        where: { id: "Guest" },
        update: {},
        create: { id: "Guest", description: "Người dùng mới chưa được phân quyền" }
      });
      
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: "Guest",
        }
      });
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  }
};
