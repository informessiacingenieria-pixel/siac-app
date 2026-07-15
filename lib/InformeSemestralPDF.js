import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { FIRMAS } from './informesConfig'

// La altura real de la página se toma de la plantilla al generar (soporta horizontal y vertical)
let PAGE_HEIGHT = 596

function convertirY(yTop) {
  return PAGE_HEIGHT - yTop
}

async function cargarImagenFirma(pdfDoc, url) {
  const res = await fetch(url)
  const bytes = await res.arrayBuffer()
  const esJpg = url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')
  return esJpg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes)
}

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
    o1CondPre1, o1CondPost1, o1Flujo1,
    o1CondPre2, o1CondPost2, o1Flujo2,
    cde1, cds1, fp1, fd1, pd1,
    recomendacion,
    tecnicoResponsable,
  } = datos

  const plantillaUrl = '/plantillas/Plantilla_informe_matencion_2s_1o.pdf'
  const plantillaRes = await fetch(plantillaUrl)
  const plantillaBytes = await plantillaRes.arrayBuffer()
  const pdfDoc = await PDFDocument.load(plantillaBytes)
  const page = pdfDoc.getPages()[0]
  PAGE_HEIGHT = page.getHeight()
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const negro = rgb(0, 0, 0)
  const verde = rgb(0.0, 0.6902, 0.3137)
  const azul = rgb(0.0941, 0.4902, 0.7765)

  function escribirLineas(lineas, x, yTop, opciones = {}) {
    const { size = 9, color = negro, lineHeight = 11, bold = false } = opciones
    const usarFont = bold ? fontBold : font
    let y = convertirY(yTop) - size
    lineas.forEach((linea) => {
      page.drawText(String(linea), { x, y, size, font: usarFont, color })
      y -= lineHeight
    })
  }

  function escribirCentrado(texto, xCentro, yTop, opciones = {}) {
    const { size = 11, bold = false, color = negro } = opciones
    const usarFont = bold ? fontBold : font
    const ancho = usarFont.widthOfTextAtSize(String(texto), size)
    page.drawText(String(texto), { x: xCentro - ancho / 2, y: convertirY(yTop) - size, size, font: usarFont, color })
  }

  function escribirParrafo(texto, conf) {
    const palabras = String(texto).split(' ')
    const lineas = []
    let actual = ''
    palabras.forEach((palabra) => {
      const prueba = actual ? `${actual} ${palabra}` : palabra
      const ancho = font.widthOfTextAtSize(prueba, conf.size)
      if (ancho > conf.ancho && actual) {
        lineas.push(actual)
        actual = palabra
      } else {
        actual = prueba
      }
    })
    if (actual) lineas.push(actual)
    let y = convertirY(conf.y) - conf.size
    lineas.forEach((linea) => {
      page.drawText(linea, { x: conf.x, y, size: conf.size, font, color: conf.color })
      y -= conf.lineHeight
    })
  }

  const rr = calcularRR(cde1, cds1)
  const rrTexto = rr !== null ? (Math.round(rr * 100) / 100).toString().replace('.', ',') : ''
  const valFinal = textoFinalRR(rr, recomendacion)
  const mesNombre = MESES_NOMBRE[parseInt(mesInforme) - 1] || ''

  const c = {
    cliente:        { x: 680, y: 73, size: 11, color: negro },
    parrafoIntro:   { x: 30, y: 142, size: 11, color: negro, lineHeight: 14, ancho: 770 },

    memb1Pre:   { x: 231, y: 205, size: 10, color: azul,  lineHeight: 11 },
    memb1Post:  { x: 160, y: 277, size: 10, color: verde, lineHeight: 11 },
    memb2Pre:   { x: 398, y: 206, size: 10, color: azul,  lineHeight: 11 },
    memb2Post:  { x: 285, y: 278, size: 10, color: verde, lineHeight: 11 },

    entrada:    { x: 540, y: 245, size: 10, color: negro, lineHeight: 11 },
    salida:     { x: 665, y: 220, size: 10, color: verde, lineHeight: 11 },

    parrafoConcl:   { x: 30, y: 385, size: 11, color: negro, lineHeight: 14, ancho: 770 },

    xFirma: 377, yFirma: 497,
    xNombreCentro: 415, yNombre: 498,
  }

  escribirLineas([cliente], c.cliente.x, c.cliente.y, { size: c.cliente.size, color: c.cliente.color })

  const parrafoIntro = `El ${diaInforme} de ${mesNombre} de ${anioInforme} se procedió a realizar un lavado químico de todas las membranas, como parte de este procedimiento se mide y observa cada membrana por separado. En el siguiente esquema se puede apreciar la configuración de las membranas de la osmosis reversa de la planta de agua.`
  escribirParrafo(parrafoIntro, c.parrafoIntro)

  escribirLineas([`Cond ${o1CondPre1} µS/cm`], c.memb1Pre.x, c.memb1Pre.y, c.memb1Pre)
  escribirLineas([`Cond ${o1CondPost1} µS/cm`, `${o1Flujo1} Lpm`], c.memb1Post.x, c.memb1Post.y, c.memb1Post)
  escribirLineas([`Cond ${o1CondPre2} µS/cm`], c.memb2Pre.x, c.memb2Pre.y, c.memb2Pre)
  escribirLineas([`Cond ${o1CondPost2} µS/cm`, `${o1Flujo2} Lpm`], c.memb2Post.x, c.memb2Post.y, c.memb2Post)

  escribirLineas([`Conductividad de`, `entrada ${cde1} µS/cm`], c.entrada.x, c.entrada.y, c.entrada)

  escribirLineas([
    `Conductividad de salida`,
    `Primer paso ${cds1} µS/cm`,
    `Flujo Prod ${fp1} lpm`,
    `Flujo Desc ${fd1} lpm`,
    `Pres desc ${pd1} psi`,
  ], c.salida.x, c.salida.y, c.salida)

  const parrafo = `Después del procedimiento de lavado químico (ac. cítrico como desincrustante y ac. peracético como desinfectante), la conductividad de salida quedó en ${cds1} µS/cm, con lo cual estamos en una RR cercana al ${rrTexto}% ${valFinal}. También se verificaron los flujos normales (normal 3-5 lts. por membrana). La presión de rechazo quedó en ${pd1} psi y ${fp1} lpm de flujo de permeado. Se vuelve a configuración para trabajar como ósmosis en línea.`
  escribirParrafo(parrafo, c.parrafoConcl)

  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 88
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

  escribirCentrado(tecnicoResponsable, c.xNombreCentro, c.yNombre, { size: 11, color: negro })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}