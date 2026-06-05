import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";

      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: user.name ?? "ActionCut User",
            email: user.email,
            onboarding_completed: false,
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("Profile sync failed:", text);
        }
      } catch (error) {
        console.error("Profile sync error:", error);
      }

      return true;
    },
  },
});
