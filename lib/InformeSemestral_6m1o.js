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

export async function generarPdfSemestral6s1oBlob(datos) {
  const {
    cliente,
    diaInforme, mesInforme, anioInforme,
    m1Pre, m1Post, m1Flujo,
    m2Pre, m2Post, m2Flujo,
    m3Pre, m3Post, m3Flujo,
    m4Pre, m4Post, m4Flujo,
    m5Pre, m5Post, m5Flujo,
    m6Pre, m6Post, m6Flujo,
    cde, cds, fp, fd, pd,
    recomendacion,
    tecnicoResponsable,
  } = datos

  const plantillaUrl = '/plantillas/Plantilla_informe_matencion_6m_1o.pdf'
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
    parrafoIntro: { x: 18, y: 130, size: 11, color: negro, lineHeight: 14, ancho: 790 },
    // Membrana 1 y 2 están en serie (columna izquierda, una arriba de la otra)
    m1Pre:  { x: 229, y: 220 }, m1Post: { x: 226, y: 285 },
    m2Pre:  { x: 367, y: 219 }, m2Post: { x: 357, y: 283 },
    // Membranas 3, 4, 5, 6 en paralelo (fila derecha)
    m3Pre:  { x: 224, y: 322 }, m3Post: { x: 217, y: 383 },
    m4Pre:  { x: 366, y: 321 }, m4Post: { x: 360, y: 380 },
    m5Pre:  { x: 543, y: 256 }, m5Post: { x: 540, y: 321 },
    m6Pre:  { x: 672, y: 256 }, m6Post: { x: 674, y: 321 },
    entrada:{ x: 522.5, y: 402 }, salida: { x: 657, y: 389 },
    parrafoConcl: { x: 18, y: 500, size: 11, color: negro, lineHeight: 14, ancho: 790 },
  }

  lineasEn([cliente], c.cliente.x, c.cliente.y, negro, 11)
  parrafo(`El ${diaInforme} de ${mesNombre} de ${anioInforme} se procedió a realizar un lavado químico de todas las membranas, como parte de este procedimiento se mide y observa cada membrana por separado. En el siguiente esquema se puede apreciar la configuración de las membranas de la ósmosis reversa de la planta de agua.`, c.parrafoIntro)

  lineasEn([`Cond ${m1Pre} µS/cm`], c.m1Pre.x, c.m1Pre.y, azul)
  lineasEn([`Cond ${m1Post} µS/cm`, `${m1Flujo} Lpm`], c.m1Post.x, c.m1Post.y, verde)
  lineasEn([`Cond ${m2Pre} µS/cm`], c.m2Pre.x, c.m2Pre.y, azul)
  lineasEn([`Cond ${m2Post} µS/cm`, `${m2Flujo} Lpm`], c.m2Post.x, c.m2Post.y, verde)
  lineasEn([`Cond ${m3Pre} µS/cm`], c.m3Pre.x, c.m3Pre.y, azul)
  lineasEn([`Cond ${m3Post} µS/cm`, `${m3Flujo} Lpm`], c.m3Post.x, c.m3Post.y, verde)
  lineasEn([`Cond ${m4Pre} µS/cm`], c.m4Pre.x, c.m4Pre.y, azul)
  lineasEn([`Cond ${m4Post} µS/cm`, `${m4Flujo} Lpm`], c.m4Post.x, c.m4Post.y, verde)
  lineasEn([`Cond ${m5Pre} µS/cm`], c.m5Pre.x, c.m5Pre.y, azul)
  lineasEn([`Cond ${m5Post} µS/cm`, `${m5Flujo} Lpm`], c.m5Post.x, c.m5Post.y, verde)
  lineasEn([`Cond ${m6Pre} µS/cm`], c.m6Pre.x, c.m6Pre.y, azul)
  lineasEn([`Cond ${m6Post} µS/cm`, `${m6Flujo} Lpm`], c.m6Post.x, c.m6Post.y, verde)

  lineasEn([`Conductividad de`, `entrada ${cde} µS/cm`], c.entrada.x, c.entrada.y, negro)
  lineasEn([
    `Conductividad de salida`,
    `Primer paso ${cds} µS/cm`,
    `Flujo Prod ${fp} lpm`,
    `Flujo Desc ${fd} lpm`,
    `Pres desc ${pd} psi`,
  ], c.salida.x, c.salida.y, verde)

  parrafo(`Después del procedimiento de lavado químico (ac. cítrico como desincrustante y ac. peracético como desinfectante), el sistema quedó con una mejor performance, conductividad de salida de ${cds} µS/cm, con lo cual estamos en una RR cercana al ${rrTexto}% ${valFinal}. También se verificaron los flujos normales (3-5 lts. por membrana). La presión de rechazo quedó en ${pd} psi y ${fp} lpm de flujo producto.`, c.parrafoConcl)

  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 100
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      page.drawImage(firmaImg, { x: c.xFirma, y: convertirY(c.yFirma), width: anchoFirma, height: altoFirma })
    } catch (e) { console.error('Error cargando firma:', e) }
  }
  centrado(tecnicoResponsable, c.xNombre, c.yNombre, 11, negro)

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}