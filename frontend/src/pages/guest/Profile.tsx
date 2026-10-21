import { useState, type FormEvent } from "react";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import {
  adminRaisedDark,
  adminRaisedLight,
  adminRaisedSage,
} from "../../components/ui/adminButtonStyles";
import { useAuth } from "../../context/useAuth";
import {
  changeMyPassword,
  updateMyProfile,
} from "../../services/auth.services";

export default function Profile({ showLogout = true }: { showLogout?: boolean }) {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  function startEditing() {
    if (!user) {
      return;
    }

    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
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
        email: email.trim(),
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

  function closePasswordModal() {
    setIsPasswordModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");

    try {
      await changeMyPassword(currentPassword, newPassword);
      closePasswordModal();
      setSuccessMessage("Your password was updated successfully.");
    } catch (changeError: unknown) {
      if (axios.isAxiosError(changeError)) {
        const responseData = changeError.response?.data as
          | {
              message?: string;
              errors?: Record<string, string[] | undefined>;
            }
          | undefined;
        setPasswordError(
          Object.values(responseData?.errors ?? {}).flat()[0] ??
            responseData?.message ??
            "Unable to update your password.",
        );
      } else {
        setPasswordError(
          "An unexpected error occurred while updating your password.",
        );
      }
    } finally {
      setIsChangingPassword(false);
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
              <label className="block text-sm font-medium text-ink sm:col-span-2">
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
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
            <Button
              type="button"
              variant="secondary"
              className={`mt-6 ml-3 ${!showLogout ? adminRaisedSage : ""}`}
              onClick={() => {
                setPasswordError("");
                setSuccessMessage("");
                setIsPasswordModalOpen(true);
              }}
            >
              Update password
            </Button>
          </>
        )}
      </section>

      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isChangingPassword
            ) {
              closePasswordModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-7"
          >
            <h2
              id="change-password-title"
              className="font-display text-2xl"
            >
              Update password
            </h2>
            <p className="mt-2 text-sm text-muted">
              Enter your current password to verify your identity.
            </p>

            {passwordError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {passwordError}
              </p>
            )}

            <form className="mt-5 space-y-4" onSubmit={handlePasswordChange}>
              <label className="block text-sm font-medium text-ink">
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <span className="mt-1 block text-xs text-muted">
                  Must be at least 8 characters.
                </span>
              </label>
              <label className="block text-sm font-medium text-ink">
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  className="mt-2 w-full rounded-xl border border-black/15 px-4 py-3"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isChangingPassword}
                  onClick={closePasswordModal}
                  className={!showLogout ? adminRaisedLight : ""}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className={!showLogout ? adminRaisedDark : ""}
                >
                  {isChangingPassword ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}

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
