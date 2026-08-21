import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useCallback, useState } from "react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        className="max-w-6xl border-0 bg-transparent p-0 shadow-none before:hidden"
        showCloseButton={false}
        bottomStickOnMobile={false}
      >
        {documentUrl && (
          <div className="flex flex-col gap-6 items-center justify-center p-4">
            {/*<img
              src={previewImage.src}
              alt={previewImage.alt}
              className="max-h-[85vh] max-w-[92vw] rounded-xl border border-white/12 bg-black/30 object-contain shadow-2xl"
            />*/}
            <Document
              file={documentUrl}
              options={pdfOptions}
              onLoadSuccess={onDocumentLoadSuccess}
            >
              <Page pageNumber={pageNumber} />
            </Document>
            <div className="flex justify-center">
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
