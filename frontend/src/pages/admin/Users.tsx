import axios from "axios";
import { useEffect, useState } from "react";
import {
  getUsers,
  updateUserRole,
  deleteUser,
} from "../../services/user.service";
import { ErrorState } from "../../components/ui/States";
import { useAuth } from "../../context/useAuth";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("USER");
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const { user: currentUser } = useAuth();
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

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

  const handleUpdateRole = async (id: string) => {
    setIsSaving(true);
    setActionError("");

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

  const handleDeleteUser = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${name}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setActionError("");
    setDeletingUserId(id);

    try {
      await deleteUser(id);

      setUsers((currentUsers) => currentUsers.filter((user) => user.id !== id));
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
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage user accounts and roles.
        </p>
      </div>

      {actionError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {actionError}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
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
                          setSelectedRole(event.target.value)
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
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
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
                        className="text-sm text-gray-500 hover:text-gray-700"
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
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {currentUser?.id === user.id
                        ? "Your Account"
                        : "Edit Role"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteUser(
                          user.id,
                          `${user.firstName} ${user.lastName}`,
                        )
                      }
                      disabled={
                        currentUser?.id === user.id ||
                        deletingUserId !== null ||
                        isSaving
                      }
                      className="text-sm font-medium text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deletingUserId === user.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
