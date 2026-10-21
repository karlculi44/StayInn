import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  createUser,
  getUsers,
  updateUserRole,
  deleteUser,
  type AdminUser,
} from "../../services/user.service";
import { ErrorState, Loading } from "../../components/ui/States";
import DataTable from "../../components/ui/DataTable";
import ProfileAvatar from "../../components/ui/ProfileAvatar";
import { useAuth } from "../../context/useAuth";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import {
  adminRaisedDanger,
  adminRaisedDark,
  adminRaisedLight,
  adminRaisedSage,
} from "../../components/ui/adminButtonStyles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | AdminUser["role"]>(
    "ALL",
  );

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

  const handleUpdateRole = useCallback(async (id: string) => {
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
  }, [selectedRole]);

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
      setSuccessMessage("User deleted successfully.");

      try {
        setUsers(await getUsers());
      } catch {
        setActionError(
          "User was deleted, but the user list could not be refreshed.",
        );
      }
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

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesSearch =
        !query ||
        `${user.firstName} ${user.lastName} ${user.email}`
          .toLowerCase()
          .includes(query);
      return matchesRole && matchesSearch;
    });
  }, [roleFilter, searchTerm, users]);

  const userColumns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        id: "avatar",
        header: "Image",
        cell: ({ row }) => (
          <ProfileAvatar
            profilePictureUrl={row.original.profilePictureUrl}
            initials={`${row.original.firstName.trim().charAt(0)}${row.original.lastName.trim().charAt(0)}`}
            className="size-10"
          />
        ),
        enableSorting: false,
      },
      {
        id: "name",
        accessorFn: (user) => `${user.firstName} ${user.lastName}`,
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium text-ink">
            {row.original.firstName} {row.original.lastName}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        meta: { className: "text-muted" },
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) =>
          editingUserId === row.original.id ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as AdminUser["role"])
                }
                disabled={isSaving}
              >
                <SelectTrigger
                  className="h-10 w-32 rounded-lg px-3 py-2"
                  aria-label={`Role for ${row.original.firstName} ${row.original.lastName}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GUEST">GUEST</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => void handleUpdateRole(row.original.id)}
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
                className={`rounded-lg px-3 py-1.5 text-sm text-muted disabled:cursor-not-allowed disabled:opacity-50 ${adminRaisedLight}`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {row.original.role}
            </span>
          ),
        enableSorting: true,
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString(),
        meta: { className: "whitespace-nowrap text-muted" },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex flex-wrap items-center gap-2">
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
                {currentUser?.id === user.id ? "Your Account" : "Edit Role"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError("");
                  setSuccessMessage("");
                  setUserToDelete(user);
                }}
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
          );
        },
        enableSorting: false,
      },
    ],
    [
      currentUser?.id,
      deletingUserId,
      editingUserId,
      handleUpdateRole,
      isSaving,
      selectedRole,
    ],
  );

  if (isLoading) {
    return <Loading label="Loading users..." />;
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

      <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="users-search" className="text-sm font-medium">
            Search users
          </label>
          <input
            id="users-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name or email"
            className="mt-2 w-full rounded-xl border px-4 py-3"
          />
        </div>
        <div>
          <label
            htmlFor="users-role-filter"
            className="block text-sm font-medium"
          >
            Role
          </label>
          <Select
            value={roleFilter}
            onValueChange={(value) =>
              setRoleFilter(value as "ALL" | AdminUser["role"])
            }
          >
            <SelectTrigger id="users-role-filter" className="mt-2 sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="GUEST">Guest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DataTable
        columns={userColumns}
        data={filteredUsers}
        emptyMessage="No users match the selected search and filters."
        tableClassName="min-w-[52rem]"
      />
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
            className="animate-ui-enter my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg cursor-default overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-7"
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
                <Select
                  required
                  value={createRole}
                  onValueChange={(value) =>
                    setCreateRole(value as AdminUser["role"])
                  }
                >
                  <SelectTrigger id="create-user-role" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GUEST">GUEST</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
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
        title="Permanently delete user"
        itemName={
          userToDelete
            ? `${userToDelete.firstName} ${userToDelete.lastName}`
            : ""
        }
        details="This permanently removes the user's account and personal details. Completed and cancelled reservation records will be retained without a link to this user."
        errorMessage={userToDelete ? actionError : undefined}
        isDeleting={deletingUserId !== null}
        onCancel={() => setUserToDelete(null)}
        onConfirm={() => void handleDeleteUser()}
      />
    </div>
  );
}
