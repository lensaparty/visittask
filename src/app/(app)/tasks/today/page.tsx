import { TasksTodayPageContent } from "@/components/tasks-today-page";

export default async function TasksTodayPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <TasksTodayPageContent searchParams={searchParams} />;
}
