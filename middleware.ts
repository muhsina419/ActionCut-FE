import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isAuthRoute = nextUrl.pathname === "/signin" || nextUrl.pathname === "/signup";

  if (isLoggedIn && isAuthRoute) {
    return Response.redirect(new URL("/dashboard", nextUrl));
  }
});

export const config = {
  matcher: ["/signin", "/signup"],
};
