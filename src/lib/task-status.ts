import { TaskStatus } from "@prisma/client";

export type CanonicalTaskStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "MISSED";

export function toCanonicalTaskStatus(status: TaskStatus): CanonicalTaskStatus {
  if (status === TaskStatus.CHECKED_IN) {
    return "IN_PROGRESS";
  }

  if (status === TaskStatus.COMPLETED) {
    return "DONE";
  }

  if (status === TaskStatus.MISSED) {
    return "MISSED";
  }

  if (status === TaskStatus.DONE) {
    return "DONE";
  }

  if (status === TaskStatus.IN_PROGRESS) {
    return "IN_PROGRESS";
  }

  return "PENDING";
}

export function canonicalTaskStatusLabel(status: CanonicalTaskStatus) {
  switch (status) {
    case "IN_PROGRESS":
      return "In Progress";
    case "DONE":
      return "Done";
    case "MISSED":
      return "Missed";
    default:
      return "Pending";
  }
}

export function canonicalTaskStatusClasses(status: CanonicalTaskStatus) {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-800";
    case "DONE":
      return "bg-emerald-100 text-emerald-800";
    case "MISSED":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}
