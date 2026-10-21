import axios from "axios";
import { useEffect, useState } from "react";
import {
  createUser,
  getUsers,
  updateUserRole,
  deleteUser,
  type AdminUser,
} from "../../services/user.service";
import { ErrorState } from "../../components/ui/States";
import ProfileAvatar from "../../components/ui/ProfileAvatar";
import { useAuth } from "../../context/useAuth";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import {
  adminRaisedDanger,
  adminRaisedDark,
  adminRaisedLight,
  adminRaisedSage,
} from "../../components/ui/adminButtonStyles";

type User = AdminUser;

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminUser["role"]>("GUEST");
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<AdminUser["role"]>("GUEST");
  const [createError, setCreateError] = useState("");
  const { user: currentUser } = useAuth();
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const closeCreateForm = () => {
    setIsCreateOpen(false);
    setCreateFirstName("");
    setCreateLastName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("GUEST");
    setCreateError("");
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch {
        setError("Unable to load users.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCreating) {
        closeCreateForm();
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isCreateOpen, isCreating]);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createFirstName.trim() || !createLastName.trim()) {
      setCreateError("First name and last name are required.");
      return;
    }

    setIsCreating(true);
    setCreateError("");
    setActionError("");
    setSuccessMessage("");

    let createdUser: AdminUser;
    try {
      createdUser = await createUser({
        firstName: createFirstName.trim(),
        lastName: createLastName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | {
              message?: string;
              errors?: Record<string, string[] | undefined>;
            }
          | undefined;
        const validationError = Object.values(
          responseData?.errors ?? {},
        ).flat()[0];
        setCreateError(
          validationError ?? responseData?.message ?? "Unable to create user.",
        );
      } else {
        setCreateError("An unexpected error occurred.");
      }
      setIsCreating(false);
      return;
    }

    closeCreateForm();
    setSuccessMessage("User created successfully.");

    try {
      setUsers(await getUsers());
    } catch {
      setUsers((currentUsers) => [createdUser, ...currentUsers]);
      setActionError(
        "User was created, but the user list could not be refreshed.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async (id: string) => {
    setIsSaving(true);
    setActionError("");
    setSuccessMessage("");

    try {
      const updatedUser = await updateUserRole(id, selectedRole);

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === id ? { ...user, role: updatedUser.role } : user,
        ),
      );

      setEditingUserId(null);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setActionError(
          error.response?.data?.message ?? "Unable to update user role.",
        );
      } else {
        setActionError("An unexpected error occurred.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setActionError("");
    setSuccessMessage("");
    setDeletingUserId(userToDelete.id);

    try {
      await deleteUser(userToDelete.id);

      setUsers((currentUsers) =>
        currentUsers.filter((user) => user.id !== userToDelete.id),
      );
      setUserToDelete(null);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setActionError(
          error.response?.data?.message ?? "Unable to delete user.",
        );
      } else {
        setActionError("An unexpected error occurred.");
      }
    } finally {
      setDeletingUserId(null);
    }
  };

  if (isLoading) {
    return <p className="p-6 text-gray-500">Loading users...</p>;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage user accounts and roles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActionError("");
              setSuccessMessage("");
              setCreateError("");
              setIsCreateOpen(true);
            }}
            className={`rounded-full px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${adminRaisedDark}`}
          >
            Create User
          </button>
        </div>
      </div>

      {successMessage && (
        <p
          role="status"
          className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {successMessage}
        </p>
      )}

      {actionError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {actionError}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-6 py-4 font-medium">Image</th>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Joined</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <ProfileAvatar
                    profilePictureUrl={user.profilePictureUrl}
                    className="size-10"
                  />
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-6 py-4 text-gray-600">{user.email}</td>

                <td className="px-6 py-4">
                  {editingUserId === user.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedRole}
                        onChange={(event) =>
                          setSelectedRole(
                            event.target.value as AdminUser["role"],
                          )
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        disabled={isSaving}
                      >
                        <option value="GUEST">GUEST</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleUpdateRole(user.id)}
                        disabled={isSaving}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedSage}`}
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingUserId(null);
                          setActionError("");
                        }}
                        disabled={isSaving}
                        className={`rounded-lg px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {user.role}
                    </span>
                  )}
                </td>

                <td className="px-6 py-4 text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUserId(user.id);
                        setSelectedRole(user.role);
                        setActionError("");
                      }}
                      disabled={
                        currentUser?.id === user.id ||
                        deletingUserId === user.id ||
                        isSaving
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${adminRaisedSage}`}
                    >
                      {currentUser?.id === user.id
                        ? "Your Account"
                        : "Edit Role"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setUserToDelete(user)}
                      disabled={
                        currentUser?.id === user.id ||
                        deletingUserId !== null ||
                        isSaving
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${adminRaisedDanger}`}
                    >
                      {deletingUserId === user.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-y-auto bg-black/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isCreating) {
              closeCreateForm();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg cursor-default overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="create-user-title"
                  className="text-xl font-bold text-gray-900"
                >
                  Create User
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add a user account and assign its role.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close create user dialog"
                onClick={closeCreateForm}
                disabled={isCreating}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="create-user-first-name"
                    className="text-sm font-medium text-gray-800"
                  >
                    First name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="create-user-first-name"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={createFirstName}
                    onChange={(event) => setCreateFirstName(event.target.value)}
                    placeholder="Alex"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="create-user-last-name"
                    className="text-sm font-medium text-gray-800"
                  >
                    Last name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="create-user-last-name"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={createLastName}
                    onChange={(event) => setCreateLastName(event.target.value)}
                    placeholder="Morgan"
                    className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="create-user-email"
                  className="text-sm font-medium text-gray-800"
                >
                  Email address <span className="text-red-600">*</span>
                </label>
                <input
                  id="create-user-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={createEmail}
                  onChange={(event) => setCreateEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="create-user-password"
                  className="text-sm font-medium text-gray-800"
                >
                  Password <span className="text-red-600">*</span>
                </label>
                <input
                  id="create-user-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={createPassword}
                  onChange={(event) => setCreatePassword(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="create-user-role"
                  className="text-sm font-medium text-gray-800"
                >
                  Role <span className="text-red-600">*</span>
                </label>
                <select
                  id="create-user-role"
                  required
                  value={createRole}
                  onChange={(event) =>
                    setCreateRole(event.target.value as AdminUser["role"])
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                >
                  <option value="GUEST">GUEST</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {createError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={isCreating}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedDark}`}
                >
                  {isCreating ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={userToDelete !== null}
        itemName={
          userToDelete
            ? `${userToDelete.firstName} ${userToDelete.lastName}`
            : ""
        }
        isDeleting={deletingUserId !== null}
        onCancel={() => setUserToDelete(null)}
        onConfirm={() => void handleDeleteUser()}
      />
    </div>
  );
}
