import { client } from "@kaneo/libs";

async function updateTaskReminder(
  taskId: string,
  leadTimeMinutes: number | null,
) {
  const response = await client.task.reminder[":id"].$put({
    param: { id: taskId },
    json: { leadTimeMinutes },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default updateTaskReminder;
