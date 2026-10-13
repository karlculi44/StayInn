import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../context/useAuth";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
        Guest area
      </p>
      <h1 className="mt-2 font-display text-4xl">Your profile</h1>
      <p className="mt-3 text-muted">
        Personal details associated with your account.
      </p>

      <section
        aria-label="Profile information"
        className="mt-8 max-w-2xl rounded-2xl border border-black/10 bg-white p-6"
      >
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Full name</dt>
            <dd className="mt-1 font-semibold text-ink">
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Email address</dt>
            <dd className="mt-1 font-semibold text-ink">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Account type</dt>
            <dd className="mt-1 font-semibold text-ink">
              {user.role === "ADMIN" ? "Admin" : "Guest"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Member since</dt>
            <dd className="mt-1 font-semibold text-ink">{memberSince}</dd>
          </div>
        </dl>
      </section>

      <Button
        type="button"
        variant="secondary"
        className="mt-6"
        onClick={handleLogout}
      >
        Logout
      </Button>
    </div>
  );
}
