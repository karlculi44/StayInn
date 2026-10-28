import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import {
  adminRaisedDark,
  adminRaisedLight,
  adminRaisedSage,
} from "../../components/ui/adminButtonStyles";
import { useAuth } from "../../context/useAuth";
import ProfileAvatar from "../../components/ui/ProfileAvatar";
import PasswordInput from "../../components/PasswordInput";
import { validateProfileImageMaxSizeMb } from "../../config/env";
import {
  changeMyPassword,
  uploadMyProfilePicture,
  updateMyProfile,
} from "../../services/auth.services";

const acceptedProfilePictureTypes = ["image/jpeg", "image/png", "image/webp"];
const maxProfilePictureBytes =
  validateProfileImageMaxSizeMb(
    import.meta.env.VITE_PROFILE_IMAGE_MAX_SIZE_MB,
  ) *
  1024 *
  1024;

export default function Profile({
  showLogout = true,
}: {
  showLogout?: boolean;
}) {
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
  const [selectedPicture, setSelectedPicture] = useState<File | null>(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState("");
  const [pictureSuccess, setPictureSuccess] = useState("");
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const picturePreviewUrl = useMemo(
    () => (selectedPicture ? URL.createObjectURL(selectedPicture) : null),
    [selectedPicture],
  );

  useEffect(
    () => () => {
      if (picturePreviewUrl) {
        URL.revokeObjectURL(picturePreviewUrl);
      }
    },
    [picturePreviewUrl],
  );

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

  function handlePictureSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    setPictureError("");
    setPictureSuccess("");

    if (!acceptedProfilePictureTypes.includes(file.type)) {
      setSelectedPicture(null);
      setPictureError("Choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > maxProfilePictureBytes) {
      setSelectedPicture(null);
      setPictureError(
        `Choose an image no larger than ${maxProfilePictureBytes / (1024 * 1024)} MB.`,
      );
      return;
    }

    setSelectedPicture(file);
  }

  async function handlePictureUpload() {
    if (!selectedPicture || !user) {
      return;
    }

    setIsUploadingPicture(true);
    setPictureError("");
    setPictureSuccess("");

    try {
      const result = await uploadMyProfilePicture(selectedPicture);
      setUser({ ...user, profilePictureUrl: result.profilePictureUrl });
      setSelectedPicture(null);
      setPictureSuccess("Your profile picture was updated.");
    } catch (uploadError: unknown) {
      setSelectedPicture(null);
      if (axios.isAxiosError(uploadError)) {
        const responseData = uploadError.response?.data as
          | { message?: string }
          | undefined;
        setPictureError(
          responseData?.message ?? "Unable to upload your profile picture.",
        );
      } else {
        setPictureError(
          "An unexpected error occurred while uploading your profile picture.",
        );
      }
    } finally {
      setIsUploadingPicture(false);
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

      <div className="mt-8 grid max-w-5xl gap-6 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.5fr)]">
        <section
          aria-label="Profile picture"
          className="h-fit rounded-2xl border border-black/10 bg-white p-6"
        >
          <h2 className="font-display text-2xl">Profile picture</h2>
          <div className="mt-6 flex flex-col items-center text-center">
            <ProfileAvatar
              profilePictureUrl={
                picturePreviewUrl ?? user.profilePictureUrl
              }
              className="size-36 border-4 border-cream shadow-sm"
            />
            <p className="mt-4 max-w-full break-all text-sm font-semibold text-ink">
              {selectedPicture
                ? `Selected: ${selectedPicture.name}`
                : `${user.firstName} ${user.lastName}`}
            </p>
            <p className="mt-1 text-sm text-muted">
              JPEG, PNG, or WebP · up to{" "}
              {maxProfilePictureBytes / (1024 * 1024)} MB
            </p>
          </div>

          <input
            ref={pictureInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Choose a profile picture"
            onChange={handlePictureSelection}
          />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={isUploadingPicture}
              className={!showLogout ? adminRaisedLight : ""}
              onClick={() => pictureInputRef.current?.click()}
            >
              {user.profilePictureUrl || selectedPicture
                ? "Choose picture"
                : "Select picture"}
            </Button>
            {selectedPicture && (
              <Button
                type="button"
                disabled={isUploadingPicture}
                className={!showLogout ? adminRaisedDark : ""}
                onClick={() => void handlePictureUpload()}
              >
                {isUploadingPicture ? "Uploading..." : "Upload picture"}
              </Button>
            )}
          </div>
          {pictureError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {pictureError}
            </p>
          )}
          {pictureSuccess && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-dark"
            >
              {pictureSuccess}
            </p>
          )}
        </section>

        <section
          aria-label="Profile information"
          className="rounded-2xl border border-black/10 bg-white p-6"
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
                <p className="text-sm text-muted">Role</p>
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
                <dt className="text-sm text-muted">Role</dt>
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
      </div>

      {isPasswordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isChangingPassword) {
              closePasswordModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            className="animate-ui-enter my-auto w-full max-w-lg cursor-default rounded-2xl bg-white p-6 shadow-xl sm:p-7"
          >
            <h2 id="change-password-title" className="font-display text-2xl">
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
              <PasswordInput
                label="Current password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <PasswordInput
                label="New password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <p className="mt-1 block text-xs text-muted">
                Must be at least 8 characters.
              </p>
              <PasswordInput
                label="Confirm new password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
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
