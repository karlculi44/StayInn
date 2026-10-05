import { useState } from "react";
import { Link } from "react-router-dom";
import Input from "../../components/Input";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/States";

export default function Auth({ register = false }: { register?: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    window.setTimeout(() => setIsLoading(false), 600);
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Welcome to StayInn
      </p>
      <h1 className="mt-3 font-display text-4xl">
        {register ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {register
          ? "Create an account to manage every StayInn reservation."
          : "Sign in to manage your StayInn reservations."}
      </p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {register && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="first-name" label="First name" placeholder="Alex" required />
            <Input id="last-name" label="Last name" placeholder="Morgan" required />
          </div>
        )}
        <Input id="email" label="Email address" type="email" placeholder="you@example.com" required />
        <Input id="password" label="Password" type="password" placeholder="••••••••" minLength={8} required />
        {register && (
          <Input id="confirm-password" label="Confirm password" type="password" placeholder="••••••••" minLength={8} required />
        )}
        {error && <ErrorState message={error} />}
        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? "Please wait..." : register ? "Create account" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {register ? "Already have an account? " : "New to StayInn? "}
        <Link to={register ? "/login" : "/register"} className="font-semibold text-sage">
          {register ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
