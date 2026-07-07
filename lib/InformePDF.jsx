import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { FIRMAS, formatearFechaLarga, formatearFechaCorta, calcularHoraTermino, PUNTOS_SIN_REUSO } from './informesConfig'

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

function formatearNumeros(texto) {
  return texto.split(',').map(n => `N°${n.trim()}`).join(', ')
}

function calcularConcentracionSIAC(ltQuimico, ltAgua, quimico) {
  const q = parseFloat(String(ltQuimico).replace(',', '.')) || 0
  const a = parseFloat(String(ltAgua).replace(',', '.')) || 0
  if (a === 0) return '0% o 0 PPM'
  const match = String(quimico).match(/\((\d+)\s*g\/l\)/)
  const concGl = match ? parseFloat(match[1]) : 40
  const ppm = Math.round((q * concGl / a) * 1000 / 1000) * 1000
  const porcentaje = Math.round((ppm / 50 / 1000) * 1000 * 100) / 1000
  return `${porcentaje}% o ${ppm} PPM`
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
  const grisClaro = rgb(0.6, 0.6, 0.6)

  function escribirEnCelda(texto, x0, topY, anchoDisponible, espacioMaxAlto, opciones = {}) {
    let { size = 11, lineHeight = 12.5, bold = false, color = negro } = opciones
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

    let yActual = convertirY(topY) - size - 1
    lineasFinales.forEach((linea) => {
      page.drawText(linea, { x: x0, y: yActual, size, font: usarFont, color })
      yActual -= lineHeight
    })
  }

  const fechaInformeTexto = formatearFechaLarga(fechaInformeDia, fechaInformeMes, fechaInformeAnio)
  const fechaServicioTexto = formatearFechaCorta(fechaServicioDia, fechaServicioMes, fechaServicioAnio)
  const horaTermino = calcularHoraTermino(horaInicio, tiempoEstadia, tiempoEnjuague)

  const concGl = quimico === 'Cloro comercial' ? concentracionCloro : concentracionAcido
  const quimicoTexto = quimico === 'Cloro comercial'
    ? `Cloro comercial (${concentracionCloro} g/l) Exp: ${fechaExpiracionCloro}`
    : `Ácido peracético (${concentracionAcido} g/l) Lote: ${loteAcido} Exp: ${fechaVencimientoAcido}`

  const quimicoConConc = `${quimico} (${concGl} g/l)`

  let dilucionTexto, concentracionFinalTexto
  if (hay2doEstanque) {
    const nombreQ = quimico === 'Cloro comercial' ? 'Cloro comercial' : 'Ácido peracético'
    dilucionTexto = `Estanque Sala: ${ltAguaTratada} lt. Agua trat. y ${ltQuimicoUtilizado} lt. de ${nombreQ}\nEstanque reuso: ${ltAguaTratada2} lt. Agua trat. y ${ltQuimicoUtilizado2} lt. de ${nombreQ}`
    const conc1 = calcularConcentracionSIAC(ltQuimicoUtilizado, ltAguaTratada, quimicoConConc)
    const conc2 = calcularConcentracionSIAC(ltQuimicoUtilizado2, ltAguaTratada2, quimicoConConc)
    concentracionFinalTexto = `${conc1} / ${conc2} por cada estanque.`
  } else {
    const nombreQ = quimico === 'Cloro comercial' ? 'Cloro comercial' : 'Ácido peracético'
    dilucionTexto = `${ltAguaTratada} lt. Agua trat. y ${ltQuimicoUtilizado} lt. de ${nombreQ}`
    concentracionFinalTexto = calcularConcentracionSIAC(ltQuimicoUtilizado, ltAguaTratada, quimicoConConc)
  }

  let puntosPresenciaTexto, puntosAusenciaTexto
  if (haySalasReuso) {
    const monitoresPresFmt = formatearNumeros(puntosPresencia.monitores)
    const salaPresFmt = formatearNumeros(puntosPresencia.salaReparacion)
    const monitoresAusFmt = formatearNumeros(puntosAusencia.monitores)
    const salaAusFmt = formatearNumeros(puntosAusencia.salaReparacion)
    puntosPresenciaTexto = `Válvula toma de muestra post estanque.\nVálvula retorno anillo sala de diálisis y sala de reuso.\nVálvulas monitores ${monitoresPresFmt}, y ${salaPresFmt} sala de reparación de monitores.`
    puntosAusenciaTexto = `Válvula toma de muestra post estanque.\nVálvula retorno anillo sala de diálisis y sala de reuso.\nVálvulas monitores ${monitoresAusFmt}, y ${salaAusFmt} sala de reparación de monitores.`
  } else {
    puntosPresenciaTexto = PUNTOS_SIN_REUSO
    puntosAusenciaTexto = PUNTOS_SIN_REUSO
  }

  page.drawText(fechaInformeTexto, { x: 405, y: convertirY(101.0) - 9, size: 11, font: fontBold, color: grisClaro })
  page.drawText(cliente, { x: 95, y: convertirY(114.5) - 9, size: 11, font: fontBold, color: negro })

  const ANCHO = 320
  escribirEnCelda(fechaServicioTexto, 230, 170, ANCHO, 22, { size: 11, bold: true })
  escribirEnCelda(lugarServicio, 230, 198.3, ANCHO, 21, { size: 11 })
  escribirEnCelda(quimicoTexto, 230, 223.1, ANCHO, 25, { size: 11 })
  escribirEnCelda(cintaPresencia, 230, 251.6, ANCHO, 27, { size: 11 })
  escribirEnCelda(cintaAusencia, 230, 282.3, ANCHO, 27, { size: 11 })
  escribirEnCelda(dilucionTexto, 230, 310, ANCHO, 21, { size: 11 })
  escribirEnCelda(concentracionFinalTexto, 230, 334, ANCHO, 21, { size: 11 })
  escribirEnCelda(`${horaInicio} hs.`, 230, 360, ANCHO, 21, { size: 11 })
  escribirEnCelda(puntosPresenciaTexto, 230, 385, ANCHO, 60, { size: 11, lineHeight: 13 })
  escribirEnCelda(`${tiempoEstadia} min.`, 230, 452, ANCHO, 32, { size: 11 })
  escribirEnCelda(`${tiempoEnjuague} min.`, 230, 483, ANCHO, 21, { size: 11 })
  escribirEnCelda(puntosAusenciaTexto, 230, 508, ANCHO, 60, { size: 11, lineHeight: 13 })
  escribirEnCelda(`${horaTermino} hs.`, 230, 574, ANCHO, 28, { size: 11 })

  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 110
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      page.drawImage(firmaImg, {
        x: 254,
        y: convertirY(695),
        width: anchoFirma,
        height: altoFirma,
      })
    } catch (e) {
      console.error('Error cargando firma:', e)
    }
  }

  // Nombre del técnico centrado bajo la firma
  const anchoNombre = font.widthOfTextAtSize(tecnicoResponsable, 11)
  const xNombre = 305 - anchoNombre / 2
  page.drawText(tecnicoResponsable, { x: xNombre, y: convertirY(711), size: 11, font, color: negro })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}