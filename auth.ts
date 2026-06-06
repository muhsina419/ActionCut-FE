import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

type BackendAuthUser = {
  id: string;
  name: string;
  email: string;
  onboarding_required: boolean;
  access_token: string;
};

type SessionWithBackend = {
  backendAccessToken?: string;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    onboardingRequired?: boolean;
  };
};

const apiBaseUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
        challengeId: {},
        otpCode: {},
        accessToken: {},
      },
      async authorize(credentials) {
        const accessToken = valueAsString(credentials?.accessToken);
        if (accessToken) {
          const user = await fetchBackendUser(accessToken);
          if (!user) {
            return null;
          }
          return toNextAuthUser(user);
        }

        const email = valueAsString(credentials?.email);
        const password = valueAsString(credentials?.password);
        const challengeId = valueAsString(credentials?.challengeId);
        const otpCode = valueAsString(credentials?.otpCode);

        if (!email || !password || !challengeId || !otpCode) {
          return null;
        }

        const response = await fetch(`${apiBaseUrl}/api/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            challenge_id: challengeId,
            otp_code: otpCode,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const user = (await response.json()) as BackendAuthUser;
        return toNextAuthUser(user);
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        return Boolean(user.email);
      }

      return true;
    },
    async jwt({ token, user, account }) {
      const mutableToken = token as Record<string, unknown>;

      if (account?.provider === "credentials" && user) {
        const backendUser = user as typeof user & {
          backendAccessToken?: string;
          onboardingRequired?: boolean;
        };
        mutableToken.backendUserId = backendUser.id;
        mutableToken.backendAccessToken = backendUser.backendAccessToken;
        mutableToken.onboardingRequired = backendUser.onboardingRequired;
      }

      if (account?.provider === "google" && token.email) {
        const synced = await syncGoogleProfile({
          email: token.email,
          name: token.name ?? "ActionCut User",
        });
        if (synced) {
          mutableToken.backendUserId = synced.id;
          mutableToken.backendAccessToken = synced.access_token;
          mutableToken.onboardingRequired = !synced.onboarding_completed;
          mutableToken.name = synced.name;
          mutableToken.email = synced.email;
        }
      }

      return token;
    },
    async session({ session, token }) {
      const mutableSession = session as typeof session & SessionWithBackend;
      const mutableToken = token as Record<string, unknown>;

      mutableSession.backendAccessToken =
        typeof mutableToken.backendAccessToken === "string" ? mutableToken.backendAccessToken : undefined;

      if (mutableSession.user) {
        if (typeof mutableToken.backendUserId === "string") {
          mutableSession.user.id = mutableToken.backendUserId;
        }
        mutableSession.user.onboardingRequired =
          typeof mutableToken.onboardingRequired === "boolean"
            ? mutableToken.onboardingRequired
            : undefined;
      }

      return session;
    },
  },
});

function valueAsString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNextAuthUser(user: BackendAuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    backendAccessToken: user.access_token,
    onboardingRequired: user.onboarding_required,
  };
}

async function fetchBackendUser(accessToken: string): Promise<BackendAuthUser | null> {
  const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as BackendAuthUser;
}

async function syncGoogleProfile({
  email,
  name,
}: {
  email: string;
  name: string;
}): Promise<
  | {
      id: string;
      name: string;
      email: string;
      onboarding_completed: boolean;
      access_token: string;
    }
  | null
> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        onboarding_completed: false,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Profile sync failed:", text);
      return null;
    }

    return (await response.json()) as {
      id: string;
      name: string;
      email: string;
      onboarding_completed: boolean;
      access_token: string;
    };
  } catch (error) {
    console.error("Profile sync error:", error);
    return null;
  }
}
