import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SimpleLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROUTES } from "@/config/routes";

export function LoginView() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmail(email, password);
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Google login error:", err);
      // Show the actual error message for debugging
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign in with Google";
      setError(errorMessage);
    }
  };

  return (
    <SimpleLayout className="flex flex-col justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">
          Next Dink
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          More play. Less Hassle.
        </p>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
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
        />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button type="submit" loading={loading} className="w-full">
          Sign In
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
          onClick={handleGoogleLogin}
          className="w-full"
        >
          Continue with Google
        </Button>
      </div>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don't have an account?{" "}
        <Link
          to={`${ROUTES.SIGNUP}${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`}
          className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
        >
          Sign up
        </Link>
      </p>
    </SimpleLayout>
  );
}
