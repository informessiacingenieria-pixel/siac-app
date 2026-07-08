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

  const tieneSegundoEstanque = hay2doEstanque === true

  const plantillaUrl = tieneSegundoEstanque
    ? '/plantillas/PLANTILLA_Informe_Servicio_SIAC_dos_estanques.pdf'
    : '/plantillas/PLANTILLA_Informe_Servicio_SIAC.pdf'

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

  // ---- Calcular valores ----
  const fechaInformeTexto = formatearFechaLarga(fechaInformeDia, fechaInformeMes, fechaInformeAnio)
  const fechaServicioTexto = formatearFechaCorta(fechaServicioDia, fechaServicioMes, fechaServicioAnio)
  const horaTermino = calcularHoraTermino(horaInicio, tiempoEstadia, tiempoEnjuague)

  const concGl = quimico === 'Cloro comercial' ? concentracionCloro : concentracionAcido
  const quimicoTexto = quimico === 'Cloro comercial'
    ? `Cloro comercial (${concentracionCloro} g/l) Exp: ${fechaExpiracionCloro}`
    : `Ácido peracético (${concentracionAcido} g/l) Lote: ${loteAcido} Exp: ${fechaVencimientoAcido}`

  const quimicoConConc = `${quimico} (${concGl} g/l)`

  let dilucionTexto, concentracionFinalTexto
  if (tieneSegundoEstanque) {
    const nombreQ = quimico === 'Cloro comercial' ? 'Cloro comercial' : 'Ácido peracético'
    dilucionTexto = `Estanque Sala: ${ltAguaTratada} lt. Agua trat. y ${ltQuimicoUtilizado} lt. de ${nombreQ}\nEstanque Reuso: ${ltAguaTratada2} lt. Agua trat. y ${ltQuimicoUtilizado2} lt. de ${nombreQ}`
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

  // ---- COORDENADAS según plantilla ----
  const coords = tieneSegundoEstanque ? {
    fechaInformeX: 400, fechaInformeY: 83.0,
    clienteX: 95, clienteY: 96.5,
    fecha: 152,
    servicio: 178,
    quimico: 205.1,
    cintaPresencia: 233.6,
    cintaAusencia: 264.3,
    dilucionTop: 293, dilucionBottom: 333.3,
    concentracion: 330,
    horaInicio: 356,
    puntosPresenciaTop: 380, puntosPresenciaBottom: 448.1,
    tiempoEstadia: 448.1,
    tiempoEnjuague: 480,
    puntosAusenciaTop: 505, puntosAusenciaBottom: 573.3,
    horaTermino: 570,
    xFirma: 250, yFirma: 670,
    xNombreCentro: 312, yNombre: 690,
  } : {
    fechaInformeX: 405, fechaInformeY: 101.0,
    clienteX: 95, clienteY: 114.5,
    fecha: 172.8,
    servicio: 198.3,
    quimico: 223.1,
    cintaPresencia: 251.6,
    cintaAusencia: 282.3,
    dilucionTop: 311, dilucionBottom: 337.8,
    concentracion: 335,
    horaInicio: 362.6,
    puntosPresenciaTop: 385, puntosPresenciaBottom: 452.6,
    tiempoEstadia: 452.6,
    tiempoEnjuague: 485,
    puntosAusenciaTop: 510, puntosAusenciaBottom: 577.8,
    horaTermino: 575,
    xFirma: 260, yFirma: 686,
    xNombreCentro: 325, yNombre: 708,
  }

  // ---- ESCRIBIR ----
  page.drawText(fechaInformeTexto, { x: coords.fechaInformeX, y: convertirY(coords.fechaInformeY) - 9, size: 11, font: fontBold, color: grisClaro })
  page.drawText(cliente, { x: coords.clienteX, y: convertirY(coords.clienteY) - 9, size: 11, font: fontBold, color: negro })

  const X = 230
  escribirEnCelda(fechaServicioTexto, X, coords.fecha, 320, 22, { size: 11, bold: true })
  escribirEnCelda(lugarServicio, X, coords.servicio, 320, 22, { size: 11 })
  escribirEnCelda(quimicoTexto, X, coords.quimico, 320, 25, { size: 11 })
  escribirEnCelda(cintaPresencia, X, coords.cintaPresencia, 320, 27, { size: 11 })
  escribirEnCelda(cintaAusencia, X, coords.cintaAusencia, 320, 27, { size: 11 })
  escribirEnCelda(dilucionTexto, X, coords.dilucionTop, 320, coords.dilucionBottom - coords.dilucionTop, { size: 11, lineHeight: 12 })
  escribirEnCelda(concentracionFinalTexto, X, coords.concentracion, 320, 22, { size: 11 })
  escribirEnCelda(`${horaInicio} hs.`, X, coords.horaInicio, 320, 22, { size: 11 })
  escribirEnCelda(puntosPresenciaTexto, X, coords.puntosPresenciaTop, 320, coords.puntosPresenciaBottom - coords.puntosPresenciaTop, { size: 11, lineHeight: 13 })
  escribirEnCelda(`${tiempoEstadia} min.`, X, coords.tiempoEstadia, 320, 32, { size: 11 })
  escribirEnCelda(`${tiempoEnjuague} min.`, X, coords.tiempoEnjuague, 320, 22, { size: 11 })
  escribirEnCelda(puntosAusenciaTexto, X, coords.puntosAusenciaTop, 320, coords.puntosAusenciaBottom - coords.puntosAusenciaTop, { size: 11, lineHeight: 13 })
  escribirEnCelda(`${horaTermino} hs.`, X, coords.horaTermino, 320, 30, { size: 11 })

  // Firma
  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 110
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      page.drawImage(firmaImg, {
        x: coords.xFirma,
        y: convertirY(coords.yFirma),
        width: anchoFirma,
        height: altoFirma,
      })
    } catch (e) {
      console.error('Error cargando firma:', e)
    }
  }

  // Nombre del técnico
  const anchoNombre = font.widthOfTextAtSize(tecnicoResponsable, 11)
  const xNombre = coords.xNombreCentro - anchoNombre / 2
  page.drawText(tecnicoResponsable, { x: xNombre, y: convertirY(coords.yNombre), size: 11, font, color: negro })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}