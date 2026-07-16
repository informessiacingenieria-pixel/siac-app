import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { FIRMAS } from './informesConfig'

let PAGE_HEIGHT = 596
function convertirY(yTop) { return PAGE_HEIGHT - yTop }

async function cargarImagenFirma(pdfDoc, url) {
  const res = await fetch(url)
  const bytes = await res.arrayBuffer()
  const esJpg = url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')
  return esJpg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes)
}

const MESES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function calcularRR(entrada, salida) {
  const e = parseFloat(String(entrada).replace(',', '.')) || 0
  const s = parseFloat(String(salida).replace(',', '.')) || 0
  if (e === 0) return null
  return ((e - s) / e) * 100
}

export function textoFinalRR(rr, recomendacion) {
  if (rr === null || rr === undefined || rr === '') return ''
  if (rr < 97) {
    const rec = (recomendacion || '').trim()
    if (!rec) return 'Recomendación pendiente.'
    return `encontrandose fuera de rango (97-99,5%). Recomendación: ${rec}`
  }
  return 'que está dentro de los parámetros normales de funcionamiento (97-99,5%) de la ósmosis reversa'
}

const VERDE = [0.0, 0.6902, 0.3137]
const AZUL  = [0.0941, 0.4902, 0.7765]

export async function generarPdfSemestral3s1oBlob(datos) {
  const {
    cliente,
    diaInforme, mesInforme, anioInforme,
    m1Pre, m1Post, m1Flujo,
    m2Pre, m2Post, m2Flujo,
    m3Pre, m3Post, m3Flujo,
    cde, cds, fp, fd, pd,
    recomendacion,
    tecnicoResponsable,
  } = datos

  const plantillaUrl = '/plantillas/Plantilla_informe_matencion_3s_1o.pdf'
  const plantillaRes = await fetch(plantillaUrl)
  const plantillaBytes = await plantillaRes.arrayBuffer()
  const pdfDoc = await PDFDocument.load(plantillaBytes)
  const page = pdfDoc.getPages()[0]
  PAGE_HEIGHT = page.getHeight()
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const negro = rgb(0, 0, 0)
  const verde = rgb(...VERDE)
  const azul = rgb(...AZUL)

  function lineasEn(arr, x, yTop, color = negro, size = 10, lineHeight = 11) {
    let y = convertirY(yTop) - size
    arr.forEach((linea) => {
      page.drawText(String(linea), { x, y, size, font, color })
      y -= lineHeight
    })
  }

  function centrado(texto, xCentro, yTop, size = 11, color = negro) {
    const ancho = font.widthOfTextAtSize(String(texto), size)
    page.drawText(String(texto), { x: xCentro - ancho / 2, y: convertirY(yTop) - size, size, font, color })
  }

  function parrafo(texto, conf) {
    const palabras = String(texto).split(' ')
    const lineas = []
    let actual = ''
    palabras.forEach((palabra) => {
      const prueba = actual ? `${actual} ${palabra}` : palabra
      if (font.widthOfTextAtSize(prueba, conf.size) > conf.ancho && actual) {
        lineas.push(actual); actual = palabra
      } else { actual = prueba }
    })
    if (actual) lineas.push(actual)
    let y = convertirY(conf.y) - conf.size
    lineas.forEach((linea) => {
      page.drawText(linea, { x: conf.x, y, size: conf.size, font, color: conf.color })
      y -= conf.lineHeight
    })
  }

  const mesNombre = MESES_NOMBRE[parseInt(mesInforme) - 1] || ''
  const rr = calcularRR(cde, cds)
  const rrTexto = rr !== null ? (Math.round(rr * 100) / 100).toString().replace('.', ',') : ''
  const valFinal = textoFinalRR(rr, recomendacion)

  const c = {
    cliente:      { x: 680, y: 73 },
    parrafoIntro: { x: 25, y: 135, size: 11, color: negro, lineHeight: 14, ancho: 770 },

    // 3 membranas en fila
    m1Pre:  { x: 210, y: 220 }, m1Post: { x: 200, y: 290 },
    m2Pre:  { x: 300, y: 220 }, m2Post: { x: 310, y: 290 },
    m3Pre:  { x: 430, y: 220 }, m3Post: { x: 400, y: 290 },

    entrada:{ x: 550, y: 242 }, salida: { x: 6000, y: 232 },

    parrafoConcl: { x: 25, y: 390, size: 11, color: negro, lineHeight: 14, ancho: 770 },

    xFirma: 377, yFirma: 497, xNombre: 415, yNombre: 498,
  }

  lineasEn([cliente], c.cliente.x, c.cliente.y, negro, 11)
  parrafo(`El ${diaInforme} de ${mesNombre} de ${anioInforme} se procedió a realizar un lavado químico de todas las membranas, como parte de este procedimiento se mide y observa cada membrana por separado. En el siguiente esquema se puede apreciar la configuración de las membranas de la osmosis reversa de la planta de agua.`, c.parrafoIntro)

  lineasEn([`Cond ${m1Pre} µS/cm`], c.m1Pre.x, c.m1Pre.y, azul)
  lineasEn([`Cond ${m1Post} µS/cm`, `${m1Flujo} Lpm`], c.m1Post.x, c.m1Post.y, verde)
  lineasEn([`Cond ${m2Pre} µS/cm`], c.m2Pre.x, c.m2Pre.y, azul)
  lineasEn([`Cond ${m2Post} µS/cm`, `${m2Flujo} Lpm`], c.m2Post.x, c.m2Post.y, verde)
  lineasEn([`Cond ${m3Pre} µS/cm`], c.m3Pre.x, c.m3Pre.y, azul)
  lineasEn([`Cond ${m3Post} µS/cm`, `${m3Flujo} Lpm`], c.m3Post.x, c.m3Post.y, verde)

  lineasEn([`Conductividad de`, `entrada ${cde} µS/cm`], c.entrada.x, c.entrada.y, negro)
  lineasEn([
    `Conductividad de salida`,
    `Primer paso ${cds} µS/cm`,
    `Flujo Prod ${fp} lpm`,
    `Flujo Desc ${fd} lpm`,
    `Pres desc ${pd} psi`,
  ], c.salida.x, c.salida.y, verde)

  parrafo(`Después del procedimiento de lavado químico (ac. cítrico como desincrustante y ac. peracético como desinfectante), la conductividad de salida quedó en ${cds} µS/cm, con lo cual estamos en una RR cercana al ${rrTexto}% ${valFinal}. También se verificaron los flujos normales (normal 3-5 lts. por membrana). La presión de rechazo quedó en ${pd} psi y ${fp} lpm de flujo de permeado. Se vuelve a configuración para trabajar como ósmosis en línea.`, c.parrafoConcl)

  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 85
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      page.drawImage(firmaImg, { x: c.xFirma, y: convertirY(c.yFirma), width: anchoFirma, height: altoFirma })
    } catch (e) { console.error('Error cargando firma:', e) }
  }
  centrado(tecnicoResponsable, c.xNombre, c.yNombre, 11, negro)

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}