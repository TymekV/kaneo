import { Search } from "lucide-react";
import useGlobalSearch from "@/hooks/queries/search/use-global-search";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { getPriorityIcon } from "@/lib/priority";
import { cn } from "@/lib/cn";
import { Link } from "@tanstack/react-router";

export type TaskSearchSidebarProps = {
  query: string;
  setQuery: (query: string) => void;
  taskId: string | undefined;
  projectId: string;
  workspaceId: string;
};

type SearchResultTask = {
  id: string;
  title: string;
  description?: string;
  content?: string;
  type: "task";
  projectId?: string;
  workspaceId?: string;
  taskNumber?: number;
  projectSlug?: string;
  priority?: string;
  status?: string;
};

export function TaskSearchSidebar({
  query,
  setQuery,
  taskId,
  projectId,
  workspaceId,
}: TaskSearchSidebarProps) {
  const searchEnabled = query.trim().length >= 3;

  const { data: searchResults } = useGlobalSearch({
    q: query,
    type: "tasks",
    workspaceId,
    projectId,
    limit: 20,
  });

  return (
    <div className="h-full w-full lg:w-72 xl:w-80 flex flex-col gap-2 p-2">
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search..."
          value={query}
          onValueChange={setQuery}
        />
      </InputGroup>
      <div className="flex flex-col gap-px">
        {searchResults?.results.map((r) => (
          <Link
            to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
            params={{
              workspaceId,
              projectId,
              taskId: r.id,
            }}
            search={{ query }}
            key={r.id}
          >
            <SearchResult
              task={r as SearchResultTask}
              isActive={taskId === r.id}
            />
          </Link>
        ))}
      </div>
      {/*<p className="text-xs text-muted-foreground">Search results</p>*/}
    </div>
  );
}

export type SearchResultProps = {
  task: SearchResultTask;
  isActive: boolean;
};

function SearchResult({ task, isActive }: SearchResultProps) {
  return (
    <div
      className={cn("py-2.5 px-3 flex gap-2.5 hover:bg-accent/80 rounded-md", {
        "bg-accent": isActive,
      })}
    >
      <div className="pt-1">
        {getPriorityIcon(task.priority ?? "", "w-4 h-4")}
      </div>
      <div>
        <p className="font-medium">{task.title}</p>
        <p className="text-sm text-muted-foreground">{task.title}</p>
      </div>
    </div>
  );
}
