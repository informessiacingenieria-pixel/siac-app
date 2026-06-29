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
  const gris = rgb(0.4, 0.4, 0.4)

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

  // ---- ESCRIBIR ----

  // Fecha del informe: negrita + gris
  page.drawText(fechaInformeTexto, { x: 405, y: convertirY(101.0) - 9, size: 11, font: fontBold, color: gris })

  // Cliente: negrita
  page.drawText(cliente, { x: 95, y: convertirY(114.5) - 9, size: 11, font: fontBold, color: negro })

  const ANCHO = 320
  // Fecha del servicio: negrita
  escribirEnCelda(fechaServicioTexto, 230, 172.8, ANCHO, 22, { size: 11, bold: true })
  escribirEnCelda(lugarServicio, 230, 198.3, ANCHO, 21, { size: 11 })
  escribirEnCelda(quimicoTexto, 230, 223.1, ANCHO, 25, { size: 10 })
  escribirEnCelda(cintaPresencia, 230, 251.6, ANCHO, 27, { size: 9.5 })
  escribirEnCelda(cintaAusencia, 230, 282.3, ANCHO, 27, { size: 9.5 })
  escribirEnCelda(dilucionTexto, 230, 313.1, ANCHO, 21, { size: 10 })
  escribirEnCelda(concentracionFinalTexto, 230, 337.8, ANCHO, 21, { size: 11 })
  escribirEnCelda(`${horaInicio} hs.`, 230, 362.6, ANCHO, 21, { size: 11 })
  escribirEnCelda(puntosPresenciaTexto, 230, 390, ANCHO, 60, { size: 9, lineHeight: 10.5 })
  escribirEnCelda(`${tiempoEstadia} min.`, 230, 455, ANCHO, 28, { size: 11 })
  escribirEnCelda(`${tiempoEnjuague} min.`, 230, 490, ANCHO, 18, { size: 11 })
  escribirEnCelda(puntosAusenciaTexto, 230, 515, ANCHO, 60, { size: 9, lineHeight: 10.5 })
  escribirEnCelda(`${horaTermino} hs.`, 230, 580, ANCHO, 25, { size: 11 })

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

  page.drawText(tecnicoResponsable, { x: 250, y: convertirY(712), size: 11, font: fontBold, color: negro })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}