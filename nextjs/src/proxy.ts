import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login");
    const isPendingPage = req.nextUrl.pathname.startsWith("/pending");

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return null;
    }

    if (!isAuth) {
      let from = req.nextUrl.pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }

    // Bỏ qua tất cả các chặn quyền nếu là super admin
    const isSuperAdmin = token?.is_super_admin === true;
    if (isSuperAdmin) {
      if (isPendingPage) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return null;
    }

    // Checking roles and permissions
    const roles = (token?.roles as string[]) || [];
    const permissions = (token?.permissions as string[]) || [];
    const isGuest = roles.length === 0 || roles.includes("Guest");

    // Nếu cố truy cập trang timo-sync mà không có quyền timo_sync
    const isTimoSyncPage = req.nextUrl.pathname.startsWith("/dashboard/timo-sync");
    if (isTimoSyncPage && !permissions.includes("timo_sync")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Nếu chỉ là guest (chờ cấp quyền) và đang cố vào trang khác ngoài /pending
    if (isGuest && !isPendingPage) {
      return NextResponse.redirect(new URL("/pending", req.url));
    }

    // Nếu đã có quyền (không phải guest) nhưng đang ở trang /pending thì chuyển hướng
    if (!isGuest && isPendingPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      async authorized() {
        // Luôn trả về true để hàm middleware() xử lý logic điều hướng
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/pending",
    "/login",
    // "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
