'use client'

import { useState, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PDFViewerProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl?: string
}

export function PDFViewer({ isOpen, onClose, pdfUrl = '/FlowLink_Transaction_Receipt.pdf' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.2)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(false)
  }, [])

  const onDocumentLoadError = useCallback(() => {
    setLoading(false)
    setError(true)
  }, [])

  const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1))
  const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages))
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5))

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="relative w-full max-w-4xl rounded-lg overflow-hidden bg-white shadow-2xl flex flex-col"
        style={{ height: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Transaction Receipt</h2>
          <div className="flex items-center gap-1">
            <a
              href={pdfUrl}
              download
              className="inline-flex items-center justify-center rounded-md hover:bg-gray-200 p-2 transition-colors"
              aria-label="Download PDF"
            >
              <Download className="h-5 w-5 text-gray-600" />
            </a>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md hover:bg-gray-200 p-2 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Controls */}
        {numPages > 0 && (
          <div className="flex items-center justify-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4 text-gray-700" />
              </button>
              <span className="text-sm text-gray-600 min-w-[80px] text-center">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4 text-gray-700" />
              </button>
            </div>
            <div className="h-4 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                disabled={scale <= 0.5}
                className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4 text-gray-700" />
              </button>
              <span className="text-sm text-gray-600 min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={scale >= 3}
                className="inline-flex items-center justify-center rounded-md p-1.5 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          </div>
        )}

        {/* PDF Content */}
        <div className="flex-1 min-h-0 overflow-auto bg-gray-200 flex justify-center py-4">
          {loading && !error && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-700" />
                <p className="text-sm text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <p className="text-gray-800 font-medium">Unable to display PDF</p>
                <p className="text-sm text-gray-600">
                  The PDF could not be rendered in the browser.
                </p>
                <a
                  href={pdfUrl}
                  download
                  className="mt-2 inline-flex items-center gap-2 rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              </div>
            </div>
          )}

          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading=""
          >
            {!error && (
              <Page
                pageNumber={pageNumber}
                scale={scale}
                loading=""
                renderAnnotationLayer={true}
                renderTextLayer={true}
              />
            )}
          </Document>
        </div>
      </div>
    </div>
  )
}
