import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SimpleLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROUTES } from "@/config/routes";

export function SignUpView() {
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUpWithEmail(email, password, displayName);
    } catch {
      setError("Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch {
      setError("Failed to sign up with Google");
    }
  };

  return (
    <SimpleLayout className="flex flex-col justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
          Join Next Dink
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Create your account to start organizing games
        </p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4 mb-6">
        <Input
          label="Display Name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
        />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Create Account
        </Button>
      </form>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-50 dark:bg-slate-950 text-slate-500">
            Or continue with
          </span>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <Button
          type="button"
          variant="secondary"
          onClick={handleGoogleSignUp}
          className="w-full"
        >
          Continue with Google
        </Button>
      </div>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <Link
          to={`${ROUTES.LOGIN}${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`}
          className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </SimpleLayout>
  );
}
