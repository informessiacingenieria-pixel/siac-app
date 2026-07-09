import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { FIRMAS } from './informesConfig'

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

// Nombres de meses para la fecha larga del cuerpo del informe
const MESES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ---- Cálculo del RR (rendimiento) ----
// RR = ((entrada - salida) / entrada) * 100
export function calcularRR(entrada, salida) {
  const e = parseFloat(String(entrada).replace(',', '.')) || 0
  const s = parseFloat(String(salida).replace(',', '.')) || 0
  if (e === 0) return null
  return ((e - s) / e) * 100
}

// ---- Texto final según el RR ----
// Si RR >= 97  -> texto normal (dentro de parámetros)
// Si RR < 97   -> fuera de rango. Con recomendación la incluye; sin ella, "Recomendación pendiente."
export function textoFinalRR(rr, recomendacion) {
  if (rr === null || rr === undefined || rr === '') return ''
  if (rr < 97) {
    const rec = (recomendacion || '').trim()
    if (!rec) return 'Recomendación pendiente.'
    return `encontrandose fuera de rango (97-99,5%). Recomendación: ${rec}`
  }
  return 'que está dentro de los parámetros normales de funcionamiento (97-99,5%) de la ósmosis reversa'
}

export async function generarPdfSemestralBlob(datos) {
  const {
    cliente,
    diaInforme, mesInforme, anioInforme,
    // Membrana 1
    o1CondPre1, o1CondPost1, o1Flujo1,
    // Membrana 2
    o1CondPre2, o1CondPost2, o1Flujo2,
    // Osmosis
    cde1, cds1, fp1, fd1, pd1,
    // Recomendación (solo si RR < 97)
    recomendacion,
    tecnicoResponsable,
  } = datos

  const plantillaUrl = '/plantillas/Plantilla_informe_matencion_2s_1o.pdf'
  const plantillaRes = await fetch(plantillaUrl)
  const plantillaBytes = await plantillaRes.arrayBuffer()
  const pdfDoc = await PDFDocument.load(plantillaBytes)
  const page = pdfDoc.getPages()[0]
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const negro = rgb(0, 0, 0)
  const verde = rgb(0.11, 0.45, 0.30)
  const azul = rgb(0.13, 0.29, 0.55)

  // Escribe texto en una posición (x, yTop). Soporta saltos de línea con \n.
  function escribir(texto, x, yTop, opciones = {}) {
    const { size = 9, bold = false, color = negro, lineHeight = 10 } = opciones
    const usarFont = bold ? fontBold : font
    const lineas = String(texto).split('\n')
    let y = convertirY(yTop) - size
    lineas.forEach((linea) => {
      page.drawText(linea, { x, y, size, font: usarFont, color })
      y -= lineHeight
    })
  }

  // Escribe centrado en x (para el nombre del técnico)
  function escribirCentrado(texto, xCentro, yTop, opciones = {}) {
    const { size = 11, bold = false, color = negro } = opciones
    const usarFont = bold ? fontBold : font
    const ancho = usarFont.widthOfTextAtSize(String(texto), size)
    page.drawText(String(texto), { x: xCentro - ancho / 2, y: convertirY(yTop) - size, size, font: usarFont, color })
  }

  // ---- Cálculos ----
  const rr = calcularRR(cde1, cds1)
  const rrTexto = rr !== null ? (Math.round(rr * 100) / 100).toString().replace('.', ',') : ''
  const valFinal = textoFinalRR(rr, recomendacion)

  const mesNombre = MESES_NOMBRE[parseInt(mesInforme) - 1] || ''

  // ---- COORDENADAS (punto de partida, se ajustan tras la primera prueba) ----
  const c = {
    // Encabezado
    cliente:        { x: 700, y: 118, size: 11, bold: false, color: negro },
    // Párrafo de intro: "El <dia> <mes> de <anio> se procedió..."
    diaInforme:     { x: 33,  y: 218, size: 11, color: negro },
    mesInforme:     { x: 70,  y: 218, size: 11, color: negro },
    anioInforme:    { x: 150, y: 218, size: 11, color: negro },

    // Diagrama - Membrana 1 (izquierda)
    o1CondPre1:     { x: 360, y: 328, size: 9, color: azul },   // Cond pre lavado Memb 1 (arriba)
    o1CondPost1:    { x: 250, y: 439, size: 9, color: verde },  // Cond post lavado Memb 1 (abajo)
    o1Flujo1:       { x: 250, y: 470, size: 9, color: verde },  // Flujo Memb 1 (abajo)

    // Diagrama - Membrana 2 (derecha)
    o1CondPre2:     { x: 615, y: 328, size: 9, color: azul },   // Cond pre lavado Memb 2 (arriba)
    o1CondPost2:    { x: 452, y: 439, size: 9, color: verde },  // Cond post lavado Memb 2 (abajo)
    o1Flujo2:       { x: 452, y: 470, size: 9, color: verde },  // Flujo Memb 2 (abajo)

    // Conductividad de entrada (recuadro central)
    cde1:           { x: 895, y: 400, size: 9, color: negro },

    // Recuadro de salida (derecha, verde)
    cds1Salida:     { x: 1050, y: 372, size: 9, color: verde }, // Primer paso <CDS1>
    fp1:            { x: 1050, y: 405, size: 9, color: verde }, // Flujo Prod
    fd1:            { x: 1050, y: 423, size: 9, color: verde }, // Flujo Desc
    pd1:            { x: 1050, y: 441, size: 9, color: verde }, // Pres desc

    // Párrafo de conclusión (los valores van dentro del texto)
    parrafoConcl:   { x: 33, y: 610, size: 11, color: negro, lineHeight: 14, ancho: 1240 },

    // Firma y nombre técnico
    xFirma: 560, yFirma: 665,
    xNombreCentro: 615, yNombre: 700,
  }

  // ---- ESCRIBIR ----
  // Encabezado cliente (arriba derecha)
  escribir(cliente, c.cliente.x, c.cliente.y, { size: c.cliente.size, color: c.cliente.color })

  // Fecha en el párrafo de intro
  escribir(diaInforme, c.diaInforme.x, c.diaInforme.y, { size: c.diaInforme.size, color: c.diaInforme.color })
  escribir(mesNombre, c.mesInforme.x, c.mesInforme.y, { size: c.mesInforme.size, color: c.mesInforme.color })
  escribir(anioInforme, c.anioInforme.x, c.anioInforme.y, { size: c.anioInforme.size, color: c.anioInforme.color })

  // Diagrama Membrana 1
  escribir(o1CondPre1, c.o1CondPre1.x, c.o1CondPre1.y, { size: c.o1CondPre1.size, color: c.o1CondPre1.color })
  escribir(o1CondPost1, c.o1CondPost1.x, c.o1CondPost1.y, { size: c.o1CondPost1.size, color: c.o1CondPost1.color })
  escribir(o1Flujo1, c.o1Flujo1.x, c.o1Flujo1.y, { size: c.o1Flujo1.size, color: c.o1Flujo1.color })

  // Diagrama Membrana 2
  escribir(o1CondPre2, c.o1CondPre2.x, c.o1CondPre2.y, { size: c.o1CondPre2.size, color: c.o1CondPre2.color })
  escribir(o1CondPost2, c.o1CondPost2.x, c.o1CondPost2.y, { size: c.o1CondPost2.size, color: c.o1CondPost2.color })
  escribir(o1Flujo2, c.o1Flujo2.x, c.o1Flujo2.y, { size: c.o1Flujo2.size, color: c.o1Flujo2.color })

  // Osmosis
  escribir(cde1, c.cde1.x, c.cde1.y, { size: c.cde1.size, color: c.cde1.color })
  escribir(cds1, c.cds1Salida.x, c.cds1Salida.y, { size: c.cds1Salida.size, color: c.cds1Salida.color })
  escribir(fp1, c.fp1.x, c.fp1.y, { size: c.fp1.size, color: c.fp1.color })
  escribir(fd1, c.fd1.x, c.fd1.y, { size: c.fd1.size, color: c.fd1.color })
  escribir(pd1, c.pd1.x, c.pd1.y, { size: c.pd1.size, color: c.pd1.color })

  // ---- Párrafo de conclusión con valores insertados ----
  // Se escribe como texto envuelto en varias líneas dentro del ancho disponible.
  const parrafo = `Después del procedimiento de lavado químico (ac. cítrico como desincrustante y ac. peracético como desinfectante), la conductividad de salida quedó en ${cds1} µS/cm, con lo cual estamos en una RR cercana al ${rrTexto}% ${valFinal}. También se verificaron los flujos normales (normal 3-5 lts. por membrana). La presión de rechazo quedó en ${pd1} psi y ${fp1} lpm de flujo de permeado. Se vuelve a configuración para trabajar como ósmosis en línea.`

  // Envolver el párrafo dentro del ancho disponible
  const pc = c.parrafoConcl
  const palabras = parrafo.split(' ')
  const lineasParrafo = []
  let actual = ''
  palabras.forEach((palabra) => {
    const prueba = actual ? `${actual} ${palabra}` : palabra
    const ancho = font.widthOfTextAtSize(prueba, pc.size)
    if (ancho > pc.ancho && actual) {
      lineasParrafo.push(actual)
      actual = palabra
    } else {
      actual = prueba
    }
  })
  if (actual) lineasParrafo.push(actual)

  let yParrafo = convertirY(pc.y) - pc.size
  lineasParrafo.forEach((linea) => {
    page.drawText(linea, { x: pc.x, y: yParrafo, size: pc.size, font, color: pc.color })
    yParrafo -= pc.lineHeight
  })

  // ---- Firma ----
  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 110
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      page.drawImage(firmaImg, {
        x: c.xFirma,
        y: convertirY(c.yFirma),
        width: anchoFirma,
        height: altoFirma,
      })
    } catch (e) {
      console.error('Error cargando firma:', e)
    }
  }

  // ---- Nombre del técnico (centrado) ----
  escribirCentrado(tecnicoResponsable, c.xNombreCentro, c.yNombre, { size: 11, color: negro })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}