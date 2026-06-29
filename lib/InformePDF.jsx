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
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const negro = rgb(0, 0, 0)

  // Escribe texto con wrap automático dentro de un ancho disponible, alineado arriba de la celda
  function escribirEnCelda(texto, x0, topY, anchoDisponible, opciones = {}) {
    const { size = 9, lineHeight = 11 } = opciones
    const lineasOriginal = String(texto).split('\n')
    const lineasFinales: string[] = []

    lineasOriginal.forEach((linea) => {
      const palabras = linea.split(' ')
      let actual = ''
      palabras.forEach((palabra) => {
        const prueba = actual ? `${actual} ${palabra}` : palabra
        const ancho = font.widthOfTextAtSize(prueba, size)
        if (ancho > anchoDisponible && actual) {
          lineasFinales.push(actual)
          actual = palabra
        } else {
          actual = prueba
        }
      })
      if (actual) lineasFinales.push(actual)
    })

    let yActual = convertirY(topY) - size - 1
    lineasFinales.forEach((linea) => {
      page.drawText(linea, { x: x0, y: yActual, size, font, color: negro })
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

  // ---- ESCRIBIR (coordenadas de la plantilla SIN marcadores) ----

  // Fecha del informe (al lado de "Santiago,")
  page.drawText(fechaInformeTexto, { x: 405, y: convertirY(101.0) - 8, size: 10, font, color: negro })

  // Cliente (al lado de "Señores:")
  page.drawText(cliente, { x: 95, y: convertirY(114.5) - 8, size: 10, font, color: negro })

  // Tabla — columna derecha empieza en x=230, ancho disponible ~320
  escribirEnCelda(fechaServicioTexto, 230, 172.8, 320, { size: 9.5 })
  escribirEnCelda(lugarServicio, 230, 198.3, 320, { size: 9.5 })
  escribirEnCelda(quimicoTexto, 230, 223.1, 320, { size: 8.5 })
  escribirEnCelda(cintaPresencia, 230, 251.6, 320, { size: 8 })
  escribirEnCelda(cintaAusencia, 230, 282.3, 320, { size: 8 })
  escribirEnCelda(dilucionTexto, 230, 313.1, 320, { size: 8.5, lineHeight: 10 })
  escribirEnCelda(concentracionFinalTexto, 230, 337.8, 320, { size: 9 })
  escribirEnCelda(`${horaInicio} hs.`, 230, 362.6, 320, { size: 9.5 })
  escribirEnCelda(puntosPresenciaTexto, 230, 387.3, 320, { size: 7.8, lineHeight: 9.5 })
  escribirEnCelda(`${tiempoEstadia} min.`, 230, 452.6, 320, { size: 9.5 })
  escribirEnCelda(`${tiempoEnjuague} min.`, 230, 487.8, 320, { size: 9.5 })
  escribirEnCelda(puntosAusenciaTexto, 230, 512.6, 320, { size: 7.8, lineHeight: 9.5 })
  escribirEnCelda(`${horaTermino} hs.`, 230, 577.8, 320, { size: 9.5 })

  // Firma — entre "Atentamente," (top=611) y "Servicio Técnico" (top=719)
  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 110
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      page.drawImage(firmaImg, {
        x: 250,
        y: convertirY(700) ,
        width: anchoFirma,
        height: altoFirma,
      })
    } catch (e) {
      console.error('Error cargando firma:', e)
    }
  }

  // Nombre del técnico (justo arriba de "Servicio Técnico")
  page.drawText(tecnicoResponsable, { x: 250, y: convertirY(710), size: 10, font: fontBold, color: negro })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}