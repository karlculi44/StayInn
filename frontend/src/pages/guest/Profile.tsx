import { useState, type FormEvent } from "react";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import {
  adminRaisedDark,
  adminRaisedLight,
} from "../../components/ui/adminButtonStyles";
import { useAuth } from "../../context/useAuth";
import { updateMyProfile } from "../../services/auth.services";

export default function Profile({ showLogout = true }: { showLogout?: boolean }) {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  function startEditing() {
    if (!user) {
      return;
    }

    setFirstName(user.firstName);
    setLastName(user.lastName);
    setError("");
    setSuccessMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setError("");
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const updatedUser = await updateMyProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setUser(updatedUser);
      setIsEditing(false);
      setSuccessMessage("Your profile was updated successfully.");
    } catch (saveError: unknown) {
      if (axios.isAxiosError(saveError)) {
        const responseData = saveError.response?.data as
          | {
              message?: string;
              errors?: Record<string, string[] | undefined>;
            }
          | undefined;
        setError(
          Object.values(responseData?.errors ?? {}).flat()[0] ??
            responseData?.message ??
            "Unable to update your profile.",
        );
      } else {
        setError("An unexpected error occurred while updating your profile.");
      }
    } finally {
      setIsSaving(false);
    }
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
      <h1 className="mt-2 font-display text-4xl">Your profile</h1>
      <p className="mt-3 text-muted">
        Personal details associated with your account.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {successMessage && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-dark"
        >
          {successMessage}
        </p>
      )}

      <section
        aria-label="Profile information"
        className="mt-8 max-w-2xl rounded-2xl border border-black/10 bg-white p-6"
      >
        {isEditing ? (
          <form className="space-y-5" onSubmit={handleSave}>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink">
                First name
                <input
                  autoComplete="given-name"
                  className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3"
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Last name
                <input
                  autoComplete="family-name"
                  className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3"
                  required
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted">Email address</p>
                <p className="mt-1 font-semibold text-ink">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Account type</p>
                <p className="mt-1 font-semibold text-ink">
                  {user.role === "ADMIN" ? "Admin" : "Guest"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted">Member since</p>
                <p className="mt-1 font-semibold text-ink">{memberSince}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={isSaving}
                className={!showLogout ? adminRaisedDark : ""}
              >
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSaving}
                onClick={cancelEditing}
                className={!showLogout ? adminRaisedLight : ""}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
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
            <Button
              type="button"
              variant="secondary"
              className={`mt-6 ${!showLogout ? adminRaisedLight : ""}`}
              onClick={startEditing}
            >
              Edit profile
            </Button>
          </>
        )}
      </section>

      {showLogout && (
        <Button
          type="button"
          variant="secondary"
          className="mt-6"
          onClick={handleLogout}
        >
          Logout
        </Button>
      )}
    </div>
  );
}
