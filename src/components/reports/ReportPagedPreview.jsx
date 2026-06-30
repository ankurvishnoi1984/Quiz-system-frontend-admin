import { useEffect, useState } from 'react'
import {
  PDF_PAGE_CONTENT_HEIGHT_PX,
} from '../../constants/reportPdf'

function useReportPageCount(measureRef, deps) {
  const [pageCount, setPageCount] = useState(1)

  useEffect(() => {
    const element = measureRef.current
    if (!element) return undefined

    const update = () => {
      const height = element.scrollHeight
      setPageCount(Math.max(1, Math.ceil(height / PDF_PAGE_CONTENT_HEIGHT_PX)))
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(element)

    return () => observer.disconnect()
  }, [measureRef, deps])

  return pageCount
}

/**
 * Paginated A4 preview — one frame per PDF page, matching export slice height.
 */
export function ReportPagedPreview({ measureRef, children }) {
  const pageCount = useReportPageCount(measureRef, children)

  return (
    <div className="report-preview-pages">
      {Array.from({ length: pageCount }, (_, pageIndex) => (
        <div key={pageIndex} className="report-preview-page">
          <p className="report-preview-page-label">
            Page {pageIndex + 1} of {pageCount}
          </p>
          <div className="report-preview-page-clip">
            <div
              className="report-preview-page-offset"
              style={{ marginTop: -pageIndex * PDF_PAGE_CONTENT_HEIGHT_PX }}
            >
              <div className="report-document report-document--preview-page">{children}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
