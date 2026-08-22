import { Dispatch, ReactNode, SetStateAction } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "../ui/input";

export type DocumentPaginatorProps = {
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  children?: ReactNode;
};

export function DocumentPaginator({
  page,
  setPage,
  totalPages,
  children,
}: DocumentPaginatorProps) {
  return (
    <div className="flex bg-card p-1 border rounded-xl items-center gap-1 shadow">
      <Button
        size="icon"
        variant="ghost"
        disabled={page <= 1}
        onClick={() => setPage((page) => page - 1)}
      >
        <ArrowLeft />
      </Button>

      <div className="flex items-center gap-1">
        <Input size="sm" className="w-12" />
        <p className="text-sm text-muted-foreground">/</p>
        <p className="text-sm text-muted-foreground">{totalPages}</p>
      </div>

      <Button
        size="icon"
        variant="ghost"
        disabled={page >= totalPages}
        onClick={() => setPage((page) => page + 1)}
      >
        <ArrowRight />
      </Button>

      {children && (
        <>
          <div className="h-full border-l my-2"></div>
          {children}
        </>
      )}
    </div>
  );
}
