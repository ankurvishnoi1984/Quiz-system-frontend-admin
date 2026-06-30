import reportDocumentCss from '../styles/report-document.css?inline'
import {
  PDF_CAPTURE_SCALE,
  PDF_CONTENT_WIDTH_PT,
  PDF_CONTENT_WIDTH_PX,
  PDF_PAGE_MARGIN_PT,
} from '../constants/reportPdf'

function buildCloneStyles() {
  return `${reportDocumentCss}

html, body {
  margin: 0;
  padding: 0;
  background: #ffffff;
  color: #0f172a;
  width: auto;
  height: auto;
  overflow: visible;
  font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
}

.report-document {
  width: ${PDF_CONTENT_WIDTH_PX}px !important;
  max-width: ${PDF_CONTENT_WIDTH_PX}px !important;
  margin: 0 !important;
  padding: 32px 40px !important;
  box-sizing: border-box !important;
  background: #ffffff !important;
  color: #0f172a !important;
}
`
}

/**
 * html2canvas cannot parse Tailwind v4 oklch() colors.
 * Strip all external stylesheets in the clone and inject hex-only report CSS.
 */
function sanitizeCloneForPdf(clonedDoc, clonedElement) {
  clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => node.remove())

  const style = clonedDoc.createElement('style')
  style.textContent = buildCloneStyles()
  clonedDoc.head.appendChild(style)

  if (clonedElement) {
    clonedElement.classList.add('report-document--export')
    clonedElement.style.width = `${PDF_CONTENT_WIDTH_PX}px`
    clonedElement.style.maxWidth = `${PDF_CONTENT_WIDTH_PX}px`
    clonedElement.style.backgroundColor = '#ffffff'
    clonedElement.style.color = '#0f172a'
  }

  clonedDoc.querySelectorAll('[class]').forEach((node) => {
    const kept = [...node.classList].filter(
      (className) =>
        className === 'report-document' ||
        className.startsWith('report-print') ||
        className === 'report-document--export',
    )

    if (kept.length > 0) {
      node.className = kept.join(' ')
      return
    }

    node.removeAttribute('class')
  })

  clonedDoc.querySelectorAll('[style]').forEach((node) => {
    const raw = node.getAttribute('style') || ''
    if (/oklch|lab\(|lch\(/i.test(raw)) {
      node.removeAttribute('style')
    }
  })
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

function waitForImages(element) {
  const images = [...element.querySelectorAll('img')]
  return Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
        }),
    ),
  )
}

/**
 * Render inside an isolated iframe so html2canvas never reads Tailwind oklch() from the app.
 */
function mountCaptureFrame(element) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.setAttribute('tabindex', '-1')
  iframe.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    `width:${PDF_CONTENT_WIDTH_PX}px`,
    'border:0',
    'visibility:hidden',
  ].join(';')

  document.body.appendChild(iframe)

  const doc = iframe.contentDocument
  doc.open()
  doc.write(
    '<!DOCTYPE html><html><head></head><body style="margin:0;padding:0;background:#ffffff;color:#0f172a;"></body></html>',
  )
  doc.close()

  const style = doc.createElement('style')
  style.textContent = buildCloneStyles()
  doc.head.appendChild(style)

  const clone = element.cloneNode(true)
  clone.classList.add('report-document--export')
  clone.style.width = `${PDF_CONTENT_WIDTH_PX}px`
  clone.style.maxWidth = `${PDF_CONTENT_WIDTH_PX}px`
  clone.style.backgroundColor = '#ffffff'
  clone.style.color = '#0f172a'
  doc.body.appendChild(clone)

  return { iframe, clone }
}

function unmountCaptureFrame(iframe) {
  iframe?.remove()
}

async function renderReportCanvas(element) {
  const html2canvas = (await import('html2canvas')).default
  const { iframe, clone } = mountCaptureFrame(element)

  try {
    await waitForNextPaint()
    await waitForImages(clone)

    iframe.style.height = `${Math.max(clone.scrollHeight, 1)}px`

    await waitForNextPaint()

    return await html2canvas(clone, {
      scale: PDF_CAPTURE_SCALE,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: PDF_CONTENT_WIDTH_PX,
      windowWidth: PDF_CONTENT_WIDTH_PX,
      onclone: sanitizeCloneForPdf,
    })
  } finally {
    unmountCaptureFrame(iframe)
  }
}

function addCanvasToPdf(pdf, canvas) {
  const margin = PDF_PAGE_MARGIN_PT
  const pageHeight = pdf.internal.pageSize.getHeight()
  const pageContentHeight = pageHeight - margin * 2

  const imgWidthPt = PDF_CONTENT_WIDTH_PT
  const imgHeightPt = (canvas.height * imgWidthPt) / canvas.width
  const imgData = canvas.toDataURL('image/png')

  let heightLeft = imgHeightPt
  let position = margin

  pdf.addImage(imgData, 'PNG', margin, position, imgWidthPt, imgHeightPt, undefined, 'FAST')
  heightLeft -= pageContentHeight

  while (heightLeft > 0) {
    position = margin - (imgHeightPt - heightLeft)
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', margin, position, imgWidthPt, imgHeightPt, undefined, 'FAST')
    heightLeft -= pageContentHeight
  }
}

/**
 * Export a visible `.report-document` element as a multi-page PDF.
 */
export async function downloadReportPdf({ element, filename = 'report.pdf' } = {}) {
  if (!element) {
    throw new Error('No printable report element provided')
  }

  const canvas = await renderReportCanvas(element)

  if (!canvas.width || !canvas.height) {
    throw new Error('Report preview is empty')
  }

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: 'portrait',
    compress: true,
  })

  addCanvasToPdf(pdf, canvas)
  pdf.save(filename)
}
