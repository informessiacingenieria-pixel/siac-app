import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { FIRMAS, formatearFechaLarga, formatearFechaCorta, calcularHoraTermino, calcularConcentracion, PUNTOS_SIN_REUSO } from './informesConfig'

const PAGE_HEIGHT = 792

function convertirY(yTop) {
  return PAGE_HEIGHT - yTop
}

async function cargarImagenFirma(pdfDoc, url) {
  const res = await fetch(url)
  const bytes = await res.arrayBuffer()
  const esJpg = url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')
  return esJpg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes)
}

// Formatea los números de monitores/sala separados por coma con "N°" delante de cada uno
function formatearNumeros(texto) {
  return texto.split(',').map(n => `N°${n.trim()}`).join(', ')
}

export async function generarPdfBlob(datos) {
  const {
    cliente, fechaInformeDia, fechaInformeMes, fechaInformeAnio,
    fechaServicioDia, fechaServicioMes, fechaServicioAnio,
    lugarServicio, quimico, concentracionCloro, fechaExpiracionCloro,
    concentracionAcido, loteAcido, fechaVencimientoAcido,
    cintaPresencia, cintaAusencia,
    ltAguaTratada, ltQuimicoUtilizado, hay2doEstanque, ltAguaTratada2, ltQuimicoUtilizado2,
    horaInicio, tiempoEstadia, tiempoEnjuague,
    haySalasReuso, puntosPresencia, puntosAusencia,
    tecnicoResponsable,
  } = datos

  const plantillaUrl = '/plantillas/PLANTILLA_Informe_Servicio_SIAC.pdf'
  const plantillaRes = await fetch(plantillaUrl)
  const plantillaBytes = await plantillaRes.arrayBuffer()
  const pdfDoc = await PDFDocument.load(plantillaBytes)
  const page = pdfDoc.getPages()[0]
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const negro = rgb(0, 0, 0)

  function escribirEnCelda(texto, x0, topY, anchoDisponible, espacioMaxAlto, opciones = {}) {
    let { size = 11, lineHeight = 12.5, bold = false, color = negro, centradoVertical = true } = opciones
    const usarFont = bold ? fontBold : font
    const lineasOriginal = String(texto).split('\n')

    function calcularLineas(tam) {
      const lineas = []
      lineasOriginal.forEach((linea) => {
        const palabras = linea.split(' ')
        let actual = ''
        palabras.forEach((palabra) => {
          const prueba = actual ? `${actual} ${palabra}` : palabra
          const ancho = usarFont.widthOfTextAtSize(prueba, tam)
          if (ancho > anchoDisponible && actual) {
            lineas.push(actual)
            actual = palabra
          } else {
            actual = prueba
          }
        })
        if (actual) lineas.push(actual)
      })
      return lineas
    }

    let lineasFinales = calcularLineas(size)
    while (lineasFinales.length * lineHeight > espacioMaxAlto && size > 6) {
      size -= 0.5
      lineHeight -= 0.5
      lineasFinales = calcularLineas(size)
    }

    // Centrado vertical: si el texto ocupa menos que el espacio disponible, lo bajamos para centrarlo
    const altoTexto = lineasFinales.length * lineHeight
    const offsetCentrado = centradoVertical ? Math.max(0, (espacioMaxAlto - altoTexto) / 2) : 0

    let yActual = convertirY(topY) - size - offsetCentrado
    lineasFinales.forEach((linea) => {
      page.drawText(linea, { x: x0, y: yActual, size, font: usarFont, color })
      yActual -= lineHeight
    })
  }

  // ---- Calcular valores ----
  const fechaInformeTexto = formatearFechaLarga(fechaInformeDia, fechaInformeMes, fechaInformeAnio)
  const fechaServicioTexto = formatearFechaCorta(fechaServicioDia, fechaServicioMes, fechaServicioAnio)
  const horaTermino = calcularHoraTermino(horaInicio, tiempoEstadia, tiempoEnjuague)

  const quimicoTexto = quimico === 'Cloro comercial'
    ? `Cloro comercial (${concentracionCloro} g/l) Exp: ${fechaExpiracionCloro}`
    : `Ácido peracético (${concentracionAcido} g/l) Lote: ${loteAcido} Exp: ${fechaVencimientoAcido}`

  let dilucionTexto, concentracionFinalTexto
  if (hay2doEstanque) {
    const nombreQ = quimico === 'Cloro comercial' ? 'Cloro comercial' : 'Ácido peracético'
    dilucionTexto = `Estanque Sala: ${ltAguaTratada} lt. Agua trat. y ${ltQuimicoUtilizado} lt. de ${nombreQ}\nEstanque reuso: ${ltAguaTratada2} lt. Agua trat. y ${ltQuimicoUtilizado2} lt. de ${nombreQ}`
    const conc1 = calcularConcentracion(ltAguaTratada, ltQuimicoUtilizado)
    concentracionFinalTexto = `${conc1} por cada estanque.`
  } else {
    const nombreQ = quimico === 'Cloro comercial' ? 'Cloro comercial' : 'Ácido peracético'
    dilucionTexto = `${ltAguaTratada} lt. Agua trat. y ${ltQuimicoUtilizado} lt. de ${nombreQ}`
    concentracionFinalTexto = calcularConcentracion(ltAguaTratada, ltQuimicoUtilizado)
  }

  let puntosPresenciaTexto, puntosAusenciaTexto
  if (haySalasReuso) {
    const monitoresPresFmt = formatearNumeros(puntosPresencia.monitores)
    const salaPresFmt = formatearNumeros(puntosPresencia.salaReparacion)
    const monitoresAusFmt = formatearNumeros(puntosAusencia.monitores)
    const salaAusFmt = formatearNumeros(puntosAusencia.salaReparacion)
    puntosPresenciaTexto = `Válvula toma de muestra post estanque. Válvula retorno anillo sala de diálisis y sala de reuso. Válvulas monitores ${monitoresPresFmt}, y ${salaPresFmt} sala de reparación de monitores.`
    puntosAusenciaTexto = `Válvula toma de muestra post estanque. Válvula retorno anillo sala de diálisis y sala de reuso. Válvulas monitores ${monitoresAusFmt}, y ${salaAusFmt} sala de reparación de monitores.`
  } else {
    puntosPresenciaTexto = PUNTOS_SIN_REUSO.replace('\n', ' ')
    puntosAusenciaTexto = PUNTOS_SIN_REUSO.replace('\n', ' ')
  }

  // ---- ESCRIBIR ----

  // Fecha del informe: negrita, color negro
  page.drawText(fechaInformeTexto, { x: 405, y: convertirY(101.0) - 9, size: 11, font: fontBold, color: negro })

  // Cliente: negrita
  page.drawText(cliente, { x: 95, y: convertirY(114.5) - 9, size: 11, font: fontBold, color: negro })

  const ANCHO = 320
  escribirEnCelda(fechaServicioTexto, 230, 172.8, ANCHO, 24.8, { size: 11, bold: true })
  escribirEnCelda(lugarServicio, 230, 198.3, ANCHO, 30.8, { size: 11 })
  escribirEnCelda(quimicoTexto, 230, 223.1, ANCHO, 24.8, { size: 11 })
  escribirEnCelda(cintaPresencia, 230, 251.6, ANCHO, 30.8, { size: 11 })
  escribirEnCelda(cintaAusencia, 230, 282.3, ANCHO, 24.8, { size: 11 })
  escribirEnCelda(dilucionTexto, 230, 313.1, ANCHO, 24.8, { size: 11 })
  escribirEnCelda(concentracionFinalTexto, 230, 337.8, ANCHO, 24.8, { size: 11 })
  escribirEnCelda(`${horaInicio} hs.`, 230, 362.6, ANCHO, 24.8, { size: 11 })
  escribirEnCelda(puntosPresenciaTexto, 230, 387.3, ANCHO, 65.3, { size: 11, lineHeight: 12.5 })
  escribirEnCelda(`${tiempoEstadia} min.`, 230, 452.6, ANCHO, 35.2, { size: 11 })
  escribirEnCelda(`${tiempoEnjuague} min.`, 230, 487.8, ANCHO, 24.8, { size: 11 })
  escribirEnCelda(puntosAusenciaTexto, 230, 512.6, ANCHO, 65.2, { size: 11, lineHeight: 12.5 })
  escribirEnCelda(`${horaTermino} hs.`, 230, 577.8, ANCHO, 33.2, { size: 11 })

  // Firma
  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 110
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      page.drawImage(firmaImg, {
        x: 250,
        y: convertirY(700),
        width: anchoFirma,
        height: altoFirma,
      })
    } catch (e) {
      console.error('Error cargando firma:', e)
    }
  }

  // Nombre del técnico debajo de la firma
  page.drawText(tecnicoResponsable, { x: 250, y: convertirY(712), size: 11, font: fontBold, color: negro })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}