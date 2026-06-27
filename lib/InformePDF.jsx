import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { FIRMAS, formatearFechaLarga, formatearFechaCorta, calcularHoraTermino, calcularConcentracion, PUNTOS_SIN_REUSO } from './informesConfig'

// Coordenadas medidas desde la plantilla original (PDF 612x792, origen abajo-izquierda)
// pdf-lib usa Y desde abajo, así que convertimos: y_pdflib = 792 - y_top_medido

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

  // Cargar la plantilla base
  const plantillaUrl = '/plantillas/PLANTILLA_Informe_Servicio_SIAC.pdf'
  const plantillaRes = await fetch(plantillaUrl)
  const plantillaBytes = await plantillaRes.arrayBuffer()
  const pdfDoc = await PDFDocument.load(plantillaBytes)
  const page = pdfDoc.getPages()[0]
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const blanco = rgb(1, 1, 1)
  const negro = rgb(0, 0, 0)

  // Función para "borrar" el texto <<campo>> dibujando un rectángulo blanco encima
  function limpiar(x0, yTop, x1, alturaLinea = 14, lineasExtra = 0) {
    const y = convertirY(yTop) - 3
    page.drawRectangle({
      x: x0 - 2,
      y: y - (alturaLinea * lineasExtra),
      width: (x1 - x0) + 200, // suficiente ancho para cubrir cualquier texto largo
      height: alturaLinea * (lineasExtra + 1) + 4,
      color: blanco,
    })
  }

  // Función para escribir texto en una posición, con soporte multilínea
  function escribir(texto, x, yTop, opciones = {}) {
    const { size = 9, bold = false, maxWidth = 280, lineHeight = 12 } = opciones
    const usarFont = bold ? fontBold : font
    const lineas = String(texto).split('\n')
    let yActual = convertirY(yTop)
    lineas.forEach((linea) => {
      // Wrap simple si la línea es muy larga
      const palabras = linea.split(' ')
      let lineaActual = ''
      const lineasFinales = []
      palabras.forEach((palabra) => {
        const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra
        const ancho = usarFont.widthOfTextAtSize(prueba, size)
        if (ancho > maxWidth && lineaActual) {
          lineasFinales.push(lineaActual)
          lineaActual = palabra
        } else {
          lineaActual = prueba
        }
      })
      if (lineaActual) lineasFinales.push(lineaActual)

      lineasFinales.forEach((lf) => {
        page.drawText(lf, { x, y: yActual - 9, size, font: usarFont, color: negro })
        yActual -= lineHeight
      })
    })
    return yActual
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
    puntosPresenciaTexto = `Válvula toma de muestra post estanque.\nVálvula retorno anillo sala de diálisis y sala de reuso.\nVálvulas monitores N°${puntosPresencia.monitores}.\nN°${puntosPresencia.salaReparacion} sala de reparación de monitores.`
    puntosAusenciaTexto = `Válvula toma de muestra post estanque.\nVálvula retorno anillo sala de diálisis y sala de reuso.\nVálvulas monitores N°${puntosAusencia.monitores}.\nN°${puntosAusencia.salaReparacion} sala de reparación de monitores.`
  } else {
    puntosPresenciaTexto = PUNTOS_SIN_REUSO
    puntosAusenciaTexto = PUNTOS_SIN_REUSO
  }

  // ---- Limpiar y escribir cada campo (usando coordenadas medidas) ----

  // Santiago, <<Fecha del Informe>>  → y0=101.0, x0=404.9
  limpiar(404.9, 101.0, 516.1)
  escribir(fechaInformeTexto, 404.9, 101.0, { size: 10 })

  // <<Cliente>>  → y0=114.5, x0=104.6
  limpiar(104.6, 114.5, 163.2)
  escribir(cliente, 104.6, 114.5, { size: 10, maxWidth: 380 })

  // <<Fecha del Servicio>>  → y0=173.0, x0=225.5
  limpiar(225.5, 173.0, 336.0)
  escribir(fechaServicioTexto, 225.5, 173.0, { size: 9 })

  // <<Lugar de servicio>>  → y0=198.5, x0=225.5
  limpiar(225.5, 198.5, 327.2)
  escribir(lugarServicio, 225.5, 198.5, { size: 9, maxWidth: 280 })

  // <<Quimico>>  → y0=223.3, x0=225.5
  limpiar(225.5, 223.3, 288.8, 14, 1)
  escribir(quimicoTexto, 225.5, 223.3, { size: 9, maxWidth: 280 })

  // <<Cinta Reactiva Presencia>>  → y0=251.8, x0=225.5
  limpiar(225.5, 251.8, 360.2, 14, 1)
  escribir(cintaPresencia, 225.5, 251.8, { size: 9, maxWidth: 280 })

  // <<Cinta Reactiva Ausencia>>  → y0=282.5, x0=225.5
  limpiar(225.5, 282.5, 359.0, 14, 1)
  escribir(cintaAusencia, 225.5, 282.5, { size: 9, maxWidth: 280 })

  // <<Dilucion trabajo>>  → y0=313.3, x0=225.5
  const lineasDilucion = dilucionTexto.split('\n').length
  limpiar(225.5, 313.3, 322.0, 14, lineasDilucion - 1)
  escribir(dilucionTexto, 225.5, 313.3, { size: 9, maxWidth: 280, lineHeight: 12 })

  // <<Concentracion final>>  → y0=338.0, x0=225.5
  limpiar(225.5, 338.0, 337.3)
  escribir(concentracionFinalTexto, 225.5, 338.0, { size: 9, maxWidth: 280 })

  // <<Hora de inicio>>  → y0=362.8, x0=225.5
  limpiar(225.5, 362.8, 313.2)
  escribir(`${horaInicio} hs.`, 225.5, 362.8, { size: 9 })

  // <<Puntos muestreo presencia>>  → y0=387.5, x0=225.5
  const lineasPresencia = puntosPresenciaTexto.split('\n').length
  limpiar(225.5, 387.5, 367.5, 12, lineasPresencia - 1 + 1)
  escribir(puntosPresenciaTexto, 225.5, 387.5, { size: 8, maxWidth: 280, lineHeight: 11 })

  // <<Tiempo de estadia o recirculación>>  → y0=434.8, x0=225.5
  limpiar(225.5, 434.8, 421.4)
  escribir(`${tiempoEstadia} min.`, 225.5, 434.8, { size: 9 })

  // <<Tiempo de enguaje>>  → y0=470.0, x0=225.5
  limpiar(225.5, 470.0, 356.7)
  escribir(`${tiempoEnjuague} min.`, 225.5, 470.0, { size: 9 })

  // <<Puntos muestreo ausencia>>  → y0=494.8, x0=225.5
  const lineasAusencia = puntosAusenciaTexto.split('\n').length
  limpiar(225.5, 494.8, 366.6, 12, lineasAusencia - 1 + 1)
  escribir(puntosAusenciaTexto, 225.5, 494.8, { size: 8, maxWidth: 280, lineHeight: 11 })

  // <<Hora de termino>>  → y0=536.8, x0=225.5
  limpiar(225.5, 536.8, 337.6)
  escribir(`${horaTermino} hs.`, 225.5, 536.8, { size: 9 })

  // <<Firma URL>>  → y0=584.1, x0=270.7 — insertar imagen
  limpiar(270.7, 584.1, 346.5, 40)
  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 90
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      page.drawImage(firmaImg, {
        x: 270.7,
        y: convertirY(584.1) - altoFirma + 10,
        width: anchoFirma,
        height: altoFirma,
      })
    } catch (e) {
      console.error('Error cargando firma:', e)
    }
  }

  // <<Tecnico responsable>>  → y0=597.5, x0=249.1
  limpiar(249.1, 597.5, 363.2)
  escribir(tecnicoResponsable, 249.1, 597.5, { size: 10, maxWidth: 200 })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}