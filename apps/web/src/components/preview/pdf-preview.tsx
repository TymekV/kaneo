import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { memo, useCallback, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Dialog, DialogPopup } from "../ui/dialog";
import { DialogRootChangeEventDetails } from "@base-ui/react";
import { DocumentPaginator } from "./document-paginator";
import { Button } from "../ui/button";
import { Download } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const pdfOptions = {
  withCredentials: true,
};

export type PdfPreviewProps = {
  open: boolean;
  onOpenChange: (
    open: boolean,
    eventDetails: DialogRootChangeEventDetails,
  ) => void;
  documentUrl: string | null;
};

export function PdfPreview({
  open,
  onOpenChange,
  documentUrl,
}: PdfPreviewProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }): void => {
      setNumPages(numPages);
    },
    [setNumPages],
  );

  const pageIndices = useMemo(
    () => (numPages ? Array.from({ length: numPages }, (_, i) => i) : []),
    [numPages],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        className="max-w-6xl border-0 bg-transparent p-0 shadow-none before:hidden"
        showCloseButton={false}
        bottomStickOnMobile={false}
        viewportClassName="p-0"
      >
        {documentUrl && (
          <div className="flex flex-col items-center px-4 py-6 overflow-scroll">
            <PdfPages
              documentUrl={documentUrl}
              options={pdfOptions}
              pageIndices={pageIndices}
              onLoadSuccess={onDocumentLoadSuccess}
            />
            <div className="flex justify-center fixed left-0 right-0 bottom-4">
              <DocumentPaginator
                page={pageNumber}
                setPage={setPageNumber}
                totalPages={numPages || 0}
              >
                <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost">
                    <Download />
                  </Button>
                </a>
              </DocumentPaginator>
            </div>
          </div>
        )}
      </DialogPopup>
    </Dialog>
  );
}

const PdfPages = memo(function PdfPages({
  documentUrl,
  options,
  pageIndices,
  onLoadSuccess,
}: {
  documentUrl: string;
  options: any;
  pageIndices: number[];
  onLoadSuccess: (p: { numPages: number }) => void;
}) {
  return (
    <Document
      file={documentUrl}
      options={options}
      onLoadSuccess={onLoadSuccess}
      className="flex flex-col gap-2"
    >
      {pageIndices.map((i) => (
        <Page key={i} pageNumber={i + 1} />
      ))}
    </Document>
  );
});
