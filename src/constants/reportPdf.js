/** A4 page width in points (jsPDF default unit). */
export const PDF_PAGE_WIDTH_PT = 595.28

/** A4 page height in points. */
export const PDF_PAGE_HEIGHT_PT = 841.89

/** Uniform margin on all sides when exporting to PDF. */
export const PDF_PAGE_MARGIN_PT = 36

/** Printable content width on an A4 page. */
export const PDF_CONTENT_WIDTH_PT = PDF_PAGE_WIDTH_PT - PDF_PAGE_MARGIN_PT * 2

/** Printable content height on an A4 page. */
export const PDF_PAGE_CONTENT_HEIGHT_PT = PDF_PAGE_HEIGHT_PT - PDF_PAGE_MARGIN_PT * 2

const PX_PER_PT = 96 / 72

/**
 * CSS pixel width that maps 1:1 to PDF content width at 96dpi.
 * Keeps preview layout identical to the exported PDF.
 */
export const PDF_CONTENT_WIDTH_PX = Math.round(PDF_CONTENT_WIDTH_PT * PX_PER_PT)

/** Full A4 page size in CSS pixels (preview page frames). */
export const PDF_PAGE_WIDTH_PX = Math.round(PDF_PAGE_WIDTH_PT * PX_PER_PT)

export const PDF_PAGE_HEIGHT_PX = Math.round(PDF_PAGE_HEIGHT_PT * PX_PER_PT)

export const PDF_PAGE_MARGIN_PX = Math.round(PDF_PAGE_MARGIN_PT * PX_PER_PT)

/**
 * Report content height visible per PDF page — matches slice height in printReportPdf.js.
 */
export const PDF_PAGE_CONTENT_HEIGHT_PX = Math.round(PDF_PAGE_CONTENT_HEIGHT_PT * PX_PER_PT)

/** Canvas scale for sharp text in rasterized PDF pages. */
export const PDF_CAPTURE_SCALE = 2
