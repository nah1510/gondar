import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roles: string[]
      permissions: string[]
      is_super_admin: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    roles: string[]
    permissions: string[]
    is_super_admin: boolean
  }
}
