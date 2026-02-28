"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";

type AssignableUser = {
  id: string;
  name: string;
  email: string;
};

type AssignmentView = {
  id: string;
  kodeToko: string;
  namaToko: string;
  territory: string | null;
  active: boolean;
};

type BulkAssignmentResult = {
  user: AssignableUser;
  requestedCount: number;
  assignedCount: number;
  missingOutletCodes: string[];
  message?: string;
};

type AssignmentListResponse = {
  assignments: AssignmentView[];
  message?: string;
};

export function AssignmentManager({
  users,
}: {
  users: AssignableUser[];
}) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id ?? "");
  const [textareaValue, setTextareaValue] = useState("");
  const [assignments, setAssignments] = useState<AssignmentView[]>([]);
  const [submitResult, setSubmitResult] = useState<BulkAssignmentResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadError(null);

      try {
        const response = await fetch(
          `/api/admin/assignments?userId=${encodeURIComponent(selectedUserId)}`,
        );
        const payload = (await response.json().catch(() => ({}))) as AssignmentListResponse;

        if (!response.ok) {
          if (!cancelled) {
            setAssignments([]);
            setLoadError(payload.message ?? "Unable to load assignments.");
          }
          return;
        }

        if (!cancelled) {
          setAssignments(payload.assignments ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setAssignments([]);
          setLoadError(
            error instanceof Error ? error.message : "Unable to load assignments.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitResult(null);
    setSubmitError(null);

    const user = users.find((candidate) => candidate.id === selectedUserId);

    if (!user) {
      setSubmitError("Select a user first.");
      return;
    }

    const outletCodes = textareaValue
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (outletCodes.length === 0) {
      setSubmitError("Enter at least one outlet code.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/admin/assignments/bulk", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userEmail: user.email,
              outletCodes,
            }),
          });
          const payload = (await response.json().catch(() => ({}))) as BulkAssignmentResult;

          if (!response.ok) {
            setSubmitError(payload.message ?? "Unable to save assignments.");
            return;
          }

          setSubmitResult(payload);
          setTextareaValue("");
          setLoadError(null);

          const assignmentResponse = await fetch(
            `/api/admin/assignments?userId=${encodeURIComponent(user.id)}`,
          );
          const assignmentPayload = (await assignmentResponse.json().catch(() => ({}))) as AssignmentListResponse;

          if (!assignmentResponse.ok) {
            setLoadError(
              assignmentPayload.message ?? "Assignments saved, but reload failed.",
            );
            return;
          }

          setAssignments(assignmentPayload.assignments ?? []);
        } catch (error) {
          setSubmitError(
            error instanceof Error ? error.message : "Unable to save assignments.",
          );
        }
      })();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Bulk Assignment
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Assign outlet codes to a user
        </h2>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>User</span>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => {
                setSelectedUserId(event.target.value);
                setAssignments([]);
                setLoadError(null);
                setSubmitResult(null);
              }}
              value={selectedUserId}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm font-medium text-slate-700">
            <span>Outlet Codes</span>
            <textarea
              className="min-h-52 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400"
              onChange={(event) => setTextareaValue(event.target.value)}
              placeholder={"TOKO-001\nTOKO-002\nTOKO-003"}
              value={textareaValue}
            />
          </label>

          <button
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending || users.length === 0}
            type="submit"
          >
            {isPending ? "Saving..." : "Assign Outlets"}
          </button>
        </form>

        {submitError ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </p>
        ) : null}

        {submitResult ? (
          <div className="mt-4 space-y-3 rounded-2xl bg-slate-100 px-4 py-4 text-sm text-slate-700">
            <p>
              Assigned {submitResult.assignedCount} of {submitResult.requestedCount} requested codes to{" "}
              {submitResult.user.name}.
            </p>
            {submitResult.missingOutletCodes.length > 0 ? (
              <p className="text-slate-600">
                Missing codes: {submitResult.missingOutletCodes.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg shadow-slate-900/5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
          Assignments
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">
          Current outlets for selected user
        </h2>

        {loadError ? (
          <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </p>
        ) : null}

        <div className="mt-5 space-y-3">
          {assignments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
              No assignments for this user.
            </p>
          ) : (
            assignments.map((assignment) => (
              <div
                className="rounded-2xl border border-slate-200 px-4 py-4"
                key={assignment.id}
              >
                <p className="font-semibold text-slate-900">{assignment.kodeToko}</p>
                <p className="text-sm text-slate-600">{assignment.namaToko}</p>
                <p className="text-sm text-slate-500">
                  {assignment.territory ?? "No territory"} •{" "}
                  {assignment.active ? "Active" : "Inactive"}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
