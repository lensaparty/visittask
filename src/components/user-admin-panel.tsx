"use client";

import { UserRole } from "@prisma/client";
import { useDeferredValue, useState, useTransition } from "react";

type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  territory: string | null;
  territoryGroup: string | null;
};

type DraftByUserId = Record<
  string,
  {
    name: string;
    email: string;
    role: UserRole;
    phone: string;
    territory: string;
    territoryGroup: string;
  }
>;

type PasswordDraftByUserId = Record<string, string>;
type CreateUserDraft = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  phone: string;
  territory: string;
  territoryGroup: string;
};

function buildDraft(user: EditableUser) {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? "",
    territory: user.territory ?? "",
    territoryGroup: user.territoryGroup ?? "",
  };
}

export function UserAdminPanel({
  users: initialUsers,
}: {
  users: EditableUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [drafts, setDrafts] = useState<DraftByUserId>(() =>
    Object.fromEntries(initialUsers.map((user) => [user.id, buildDraft(user)])),
  );
  const [passwordDrafts, setPasswordDrafts] = useState<PasswordDraftByUserId>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL");
  const [createDraft, setCreateDraft] = useState<CreateUserDraft>({
    name: "",
    email: "",
    role: UserRole.FIELD_FORCE,
    password: "",
    phone: "",
    territory: "",
    territoryGroup: "",
  });
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredUsers = users.filter((user) => {
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    const search = deferredSearchQuery.trim().toLowerCase();

    if (!search) {
      return matchesRole;
    }

    const haystack = [
      user.name,
      user.email,
      user.phone ?? "",
      user.territory ?? "",
      user.territoryGroup ?? "",
      user.role,
    ]
      .join(" ")
      .toLowerCase();

    return matchesRole && haystack.includes(search);
  });

  function updateDraft(
    userId: string,
    field: keyof DraftByUserId[string],
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {
          name: "",
          email: "",
          role: UserRole.FIELD_FORCE,
          phone: "",
          territory: "",
          territoryGroup: "",
        }),
        [field]: value,
      },
    }));
  }

  function setRowFeedback(userId: string, message: string) {
    setFeedback((current) => ({
      ...current,
      [userId]: message,
    }));
  }

  function updatePasswordDraft(userId: string, value: string) {
    setPasswordDrafts((current) => ({
      ...current,
      [userId]: value,
    }));
  }

  function updateCreateDraft(
    field: keyof CreateUserDraft,
    value: string,
  ) {
    setCreateDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSave(userId: string) {
    const draft = drafts[userId];

    if (!draft) {
      return;
    }

    setRowFeedback(userId, "");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(draft),
          });
          const payload = (await response.json().catch(() => ({}))) as {
            message?: string;
            user?: EditableUser;
          };

          if (!response.ok || !payload.user) {
            setRowFeedback(userId, payload.message ?? "Failed to save user.");
            return;
          }

          setUsers((current) =>
            current.map((user) => (user.id === userId ? payload.user! : user)),
          );
          setDrafts((current) => ({
            ...current,
            [userId]: buildDraft(payload.user!),
          }));
          setRowFeedback(userId, "Saved.");
        } catch (error) {
          setRowFeedback(
            userId,
            error instanceof Error ? error.message : "Failed to save user.",
          );
        }
      })();
    });
  }

  function handleDelete(userId: string) {
    const user = users.find((entry) => entry.id === userId);

    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.name} (${user.email})? This removes assignments, tasks, visits, and tracking logs for that user.`,
    );

    if (!confirmed) {
      return;
    }

    setRowFeedback(userId, "");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
          });
          const payload = (await response.json().catch(() => ({}))) as {
            message?: string;
          };

          if (!response.ok) {
            setRowFeedback(userId, payload.message ?? "Failed to delete user.");
            return;
          }

          setUsers((current) => current.filter((entry) => entry.id !== userId));
          setDrafts((current) => {
            const next = { ...current };
            delete next[userId];
            return next;
          });
          setFeedback((current) => {
            const next = { ...current };
            delete next[userId];
            return next;
          });
        } catch (error) {
          setRowFeedback(
            userId,
            error instanceof Error ? error.message : "Failed to delete user.",
          );
        }
      })();
    });
  }

  function handleResetPassword(userId: string) {
    setRowFeedback(userId, "");

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              password: passwordDrafts[userId] ?? "",
            }),
          });
          const payload = (await response.json().catch(() => ({}))) as {
            message?: string;
            usedDefaultPassword?: boolean;
          };

          if (!response.ok) {
            setRowFeedback(
              userId,
              payload.message ?? "Failed to reset password.",
            );
            return;
          }

          setPasswordDrafts((current) => ({
            ...current,
            [userId]: "",
          }));
          setRowFeedback(
            userId,
            payload.usedDefaultPassword
              ? "Password reset to default imported password."
              : "Password updated.",
          );
        } catch (error) {
          setRowFeedback(
            userId,
            error instanceof Error ? error.message : "Failed to reset password.",
          );
        }
      })();
    });
  }

  function handleCreateUser() {
    setCreateFeedback(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/admin/users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(createDraft),
          });
          const payload = (await response.json().catch(() => ({}))) as {
            message?: string;
            user?: EditableUser;
            usedDefaultPassword?: boolean;
          };

          if (!response.ok || !payload.user) {
            setCreateFeedback(payload.message ?? "Failed to create user.");
            return;
          }

          setUsers((current) =>
            [...current, payload.user!].sort((left, right) =>
              `${left.role}-${left.name}`.localeCompare(`${right.role}-${right.name}`),
            ),
          );
          setDrafts((current) => ({
            ...current,
            [payload.user!.id]: buildDraft(payload.user!),
          }));
          setCreateDraft({
            name: "",
            email: "",
            role: UserRole.FIELD_FORCE,
            password: "",
            phone: "",
            territory: "",
            territoryGroup: "",
          });
          setCreateFeedback(
            payload.usedDefaultPassword
              ? "User created with default imported password."
              : "User created.",
          );
        } catch (error) {
          setCreateFeedback(
            error instanceof Error ? error.message : "Failed to create user.",
          );
        }
      })();
    });
  }

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-slate-900/5 sm:p-6">
      <div className="mb-5 flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          User Directory
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">
          Edit or delete users
        </h2>
        <p className="text-sm leading-6 text-slate-600">
          Update profile data directly, or remove users permanently if they are
          no longer needed.
        </p>
      </div>

      <div className="mb-5 rounded-2xl bg-slate-50 p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Create User
          </p>
          <p className="mt-1 text-sm text-slate-600">
            User tidak dibuat otomatis saat import outlet. Tambahkan manual dari sini.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Name</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateCreateDraft("name", event.target.value)}
              value={createDraft.name}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Email</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateCreateDraft("email", event.target.value)}
              value={createDraft.email}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Role</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateCreateDraft("role", event.target.value)}
              value={createDraft.role}
            >
              <option value={UserRole.FIELD_FORCE}>FIELD_FORCE</option>
              <option value={UserRole.SUPERVISOR}>SUPERVISOR</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Password</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateCreateDraft("password", event.target.value)}
              placeholder="Kosongkan untuk pakai default"
              type="password"
              value={createDraft.password}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Phone</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => updateCreateDraft("phone", event.target.value)}
              value={createDraft.phone}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Territory</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) =>
                updateCreateDraft("territory", event.target.value)
              }
              value={createDraft.territory}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2 xl:col-span-1">
            <span>Territory Group</span>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) =>
                updateCreateDraft("territoryGroup", event.target.value)
              }
              value={createDraft.territoryGroup}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {createFeedback ||
              "Create user manually, lalu assignment outlet dilakukan terpisah."}
          </p>
          <button
            className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            onClick={handleCreateUser}
            type="button"
          >
            Create User
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Search</span>
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search name, email, territory..."
            value={searchQuery}
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Role Filter</span>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
            onChange={(event) =>
              setRoleFilter(event.target.value as "ALL" | UserRole)
            }
            value={roleFilter}
          >
            <option value="ALL">ALL</option>
            <option value={UserRole.FIELD_FORCE}>FIELD_FORCE</option>
            <option value={UserRole.SUPERVISOR}>SUPERVISOR</option>
          </select>
        </label>
      </div>

      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No users match the current filter.
          </div>
        ) : (
          filteredUsers.map((user) => {
            const draft = drafts[user.id] ?? buildDraft(user);

            return (
              <div
                className="rounded-2xl border border-slate-200 p-4"
                key={user.id}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>Name</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                      onChange={(event) =>
                        updateDraft(user.id, "name", event.target.value)
                      }
                      value={draft.name}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>Email</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                      onChange={(event) =>
                        updateDraft(user.id, "email", event.target.value)
                      }
                      value={draft.email}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>Role</span>
                    <select
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                      onChange={(event) =>
                        updateDraft(user.id, "role", event.target.value)
                      }
                      value={draft.role}
                    >
                      <option value={UserRole.FIELD_FORCE}>FIELD_FORCE</option>
                      <option value={UserRole.SUPERVISOR}>SUPERVISOR</option>
                    </select>
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>Phone</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                      onChange={(event) =>
                        updateDraft(user.id, "phone", event.target.value)
                      }
                      value={draft.phone}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>Territory</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                      onChange={(event) =>
                        updateDraft(user.id, "territory", event.target.value)
                      }
                      value={draft.territory}
                    />
                  </label>

                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>Territory Group</span>
                    <input
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                      onChange={(event) =>
                        updateDraft(user.id, "territoryGroup", event.target.value)
                      }
                      value={draft.territoryGroup}
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    {feedback[user.id] ||
                      "Changes are saved immediately when you press Save."}
                  </p>
                  <div className="flex gap-3">
                    <button
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isPending}
                      onClick={() => handleSave(user.id)}
                      type="button"
                    >
                      Save
                    </button>
                    <button
                      className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isPending}
                      onClick={() => handleDelete(user.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                    <label className="flex-1 space-y-2 text-sm font-medium text-slate-700">
                      <span>Reset Password</span>
                      <input
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
                        onChange={(event) =>
                          updatePasswordDraft(user.id, event.target.value)
                        }
                        placeholder="Leave blank to use default imported password"
                        type="password"
                        value={passwordDrafts[user.id] ?? ""}
                      />
                    </label>
                    <button
                      className="rounded-full bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={isPending}
                      onClick={() => handleResetPassword(user.id)}
                      type="button"
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
