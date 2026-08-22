import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [displayedPageNumber, setDisplayedPageNumber] = useState<number>(1);
  const [zoom, setZoom] = useState(150);

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

  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const setPageRef = useCallback(
    (pageNum: number, el: HTMLDivElement | null) => {
      const prev = pageRefs.current.get(pageNum);
      if (prev && observerRef.current) observerRef.current.unobserve(prev);

      if (el) {
        pageRefs.current.set(pageNum, el);
        observerRef.current?.observe(el);
      } else {
        pageRefs.current.delete(pageNum);
      }
    },
    [],
  );

  const goToPage = useCallback((page: number) => {
    const el = pageRefs.current.get(page);
    el?.scrollIntoView({ behavior: "instant", block: "start" });
    setPageNumber(page);
  }, []);

  useEffect(() => {
    setDisplayedPageNumber(pageNumber);
  }, [pageNumber]);

  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!open) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const pageNum = Number(visible.target.getAttribute("data-page"));
          setPageNumber(pageNum);
        }
      },
      { threshold: [0.5] },
    );
    observerRef.current = observer;

    // catch any refs that mounted before this effect ran
    pageRefs.current.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        className="max-w-6xl border-0 bg-transparent p-0 shadow-none before:hidden"
        showCloseButton={false}
        bottomStickOnMobile={false}
        viewportClassName="p-0"
      >
        {documentUrl && (
          <>
            <div className="flex flex-col items-center px-4 pt-6 pb-18 overflow-scroll scroll-pt-2">
              <PdfPages
                documentUrl={documentUrl}
                options={pdfOptions}
                pageIndices={pageIndices}
                onLoadSuccess={onDocumentLoadSuccess}
                setPageRef={setPageRef}
                zoom={zoom}
              />
            </div>
            <div className="flex justify-center fixed left-0 right-0 bottom-4">
              <DocumentPaginator
                actualPage={pageNumber}
                goToPage={goToPage}
                totalPages={numPages || 0}
                displayedPageNumber={displayedPageNumber}
                setDisplayedPageNumber={setDisplayedPageNumber}
                zoom={zoom}
                setZoom={setZoom}
              >
                <a
                  href={documentUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="icon" variant="ghost">
                    <Download />
                  </Button>
                </a>
              </DocumentPaginator>
            </div>
          </>
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
  setPageRef,
  zoom,
}: {
  documentUrl: string;
  options: any;
  pageIndices: number[];
  onLoadSuccess: (p: { numPages: number }) => void;
  setPageRef: (pageNum: number, el: HTMLDivElement | null) => void;
  zoom: number;
}) {
  return (
    <Document
      file={documentUrl}
      options={options}
      onLoadSuccess={onLoadSuccess}
      className="flex flex-col gap-2"
    >
      {pageIndices.map((i) => (
        <div key={i} ref={(ref) => setPageRef(i + 1, ref)} data-page={i + 1}>
          <Page pageNumber={i + 1} scale={zoom / 100} />
        </div>
      ))}
    </Document>
  );
});
