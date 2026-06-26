import { APP_LOGO_ALT, APP_LOGO_SRC, APP_PORTAL_LABEL } from '../../constants/reportBranding'

/**
 * Single branded header for PDF / print reports (logo appears once on page 1).
 */
export function ReportPrintHeader({ reportLabel, title, children }) {
  return (
    <header className="report-print-header">
      <div className="report-print-header-top">
        <img src={APP_LOGO_SRC} alt={APP_LOGO_ALT} className="report-print-logo" />
        <div className="report-print-header-meta">
          <p className="report-print-portal">{APP_PORTAL_LABEL}</p>
          {reportLabel ? <p className="report-print-label">{reportLabel}</p> : null}
        </div>
      </div>

      {title ? <h1 className="report-print-title">{title}</h1> : null}

      {children ? <div className="report-print-subtitle">{children}</div> : null}
    </header>
  )
}
