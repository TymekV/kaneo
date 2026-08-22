import {
  ReactNode,
  useCallback,
  KeyboardEvent,
  Dispatch,
  SetStateAction,
} from "react";
import { Button } from "../ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "../ui/input";

export type DocumentPaginatorProps = {
  actualPage: number;
  goToPage: (page: number) => void;
  displayedPageNumber: number;
  setDisplayedPageNumber: Dispatch<SetStateAction<number>>;
  totalPages: number;
  children?: ReactNode;
};

export function DocumentPaginator({
  actualPage: page,
  goToPage,
  totalPages,
  children,
  displayedPageNumber,
  setDisplayedPageNumber,
}: DocumentPaginatorProps) {
  const handlePageJump = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        try {
          const targetPage = parseInt(e.currentTarget.value);
          goToPage(targetPage);
        } catch {}
      }
    },
    [goToPage],
  );

  return (
    <div className="flex bg-card p-1 border rounded-xl items-center gap-1 shadow">
      <Button
        size="icon"
        variant="ghost"
        disabled={page <= 1}
        onClick={() => goToPage(page - 1)}
      >
        <ArrowLeft />
      </Button>

      <div className="flex items-center gap-1">
        <Input
          size="sm"
          className="w-12"
          inputClassName="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          type="number"
          min={1}
          max={totalPages}
          onKeyDown={handlePageJump}
          value={displayedPageNumber}
          onValueChange={(value) => {
            const pageNumber = parseInt(value);
            if (isNaN(pageNumber) && value !== "") return;
            setDisplayedPageNumber(pageNumber);
          }}
        />
        <p className="text-sm text-muted-foreground">/</p>
        <p className="text-sm text-muted-foreground">{totalPages}</p>
      </div>

      <Button
        size="icon"
        variant="ghost"
        disabled={page >= totalPages}
        onClick={() => goToPage(page + 1)}
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
