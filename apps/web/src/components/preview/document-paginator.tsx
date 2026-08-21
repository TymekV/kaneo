import { Dispatch, ReactNode, SetStateAction } from "react";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

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
    <div className="flex bg-card p-1 border rounded-xl items-center gap-1">
      <Button
        size="icon"
        variant="ghost"
        disabled={page <= 1}
        onClick={() => setPage((page) => page - 1)}
      >
        <ArrowLeft />
      </Button>

      <p className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </p>

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
