import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTaskReminder from "@/fetchers/task/update-task-reminder";

type UpdateTaskReminderVariables = {
  leadTimeMinutes: number | null;
  projectId: string;
  taskId: string;
};

export function useUpdateTaskReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, leadTimeMinutes }: UpdateTaskReminderVariables) =>
      updateTaskReminder(taskId, leadTimeMinutes),
    onSuccess: (task, variables) => {
      queryClient.setQueryData(["task", variables.taskId], task);
      queryClient.invalidateQueries({
        queryKey: ["tasks", variables.projectId],
      });
    },
  });
}
