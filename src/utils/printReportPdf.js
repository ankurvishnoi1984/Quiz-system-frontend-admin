import reportDocumentCss from '../styles/report-document.css?inline'

const PDF_PAGE_MARGIN_PT = 36

function sanitizeCloneForPdf(clonedDoc) {
  clonedDoc.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => node.remove())

  const style = clonedDoc.createElement('style')
  style.textContent = reportDocumentCss
  clonedDoc.head.appendChild(style)

  clonedDoc.querySelectorAll('[class]').forEach((element) => {
    const kept = [...element.classList].filter(
      (className) =>
        className === 'report-document' ||
        className.startsWith('report-print'),
    )

    if (kept.length > 0) {
      element.className = kept.join(' ')
      return
    }

    element.removeAttribute('class')
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
 * Export a visible `.report-document` element as a multi-page PDF.
 */
export async function downloadReportPdf({ element, filename = 'report.pdf' } = {}) {
  if (!element) {
    throw new Error('No printable report element provided')
  }

  await waitForNextPaint()
  await waitForImages(element)

  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const canvas = await html2canvas(element, {
    scale: Math.min(2, window.devicePixelRatio || 1.5),
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    onclone: sanitizeCloneForPdf,
  })

  if (!canvas.width || !canvas.height) {
    throw new Error('Report preview is empty')
  }

  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: 'portrait',
    compress: true,
  })

  const margin = PDF_PAGE_MARGIN_PT
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - margin * 2
  const pageContentHeight = pageHeight - margin * 2

  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const imgHeight = (canvas.height * contentWidth) / canvas.width

  let heightLeft = imgHeight
  let position = margin

  pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight)
  heightLeft -= pageContentHeight

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft)
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight)
    heightLeft -= pageContentHeight
  }

  pdf.save(filename)
}
