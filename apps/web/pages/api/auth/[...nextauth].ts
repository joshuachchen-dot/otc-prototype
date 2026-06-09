import NextAuth, { type NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';

const providers: NextAuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId:     process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? 'archon-dev-secret-do-not-use-in-production',
  pages: {
    signIn:  '/login',
    error:   '/login',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        // Social sign-ins receive 'investor' role by default.
        // To assign manager/auditor, look up the email in an allowlist here.
        token.role  = 'investor';
        token.name  = (profile as any)?.name ?? token.name ?? 'Investor';
        token.email = token.email;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).role = token.role ?? 'investor';
      return session;
    },
  },
};

export default NextAuth(authOptions);
