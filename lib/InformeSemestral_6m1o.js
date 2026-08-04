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
  const page1 = pdfDoc.getPages()[0]
  const page2 = pdfDoc.getPages()[1] // ✅ Página 2
  PAGE_HEIGHT = page1.getHeight()
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const negro = rgb(0, 0, 0)
  const verde = rgb(...VERDE)
  const azul = rgb(...AZUL)

  function lineasEn(page, arr, x, yTop, color = negro, size = 10, lineHeight = 11) {
    let y = convertirY(yTop) - size
    arr.forEach((linea) => {
      page.drawText(String(linea), { x, y, size, font, color })
      y -= lineHeight
    })
  }

  function centrado(page, texto, xCentro, yTop, size = 11, color = negro) {
    const ancho = font.widthOfTextAtSize(String(texto), size)
    page.drawText(String(texto), { x: xCentro - ancho / 2, y: convertirY(yTop) - size, size, font, color })
  }

  function parrafo(page, texto, conf) {
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

  // PÁGINA 1 - Coordenadas de membranas
  const c1 = {
    cliente:      { x: 680, y: 73 },
    parrafoIntro: { x: 18, y: 130, size: 11, color: negro, lineHeight: 14, ancho: 790 },
    m1Pre:  { x: 229, y: 220 }, m1Post: { x: 220, y: 284 },
    m2Pre:  { x: 379, y: 220 }, m2Post: { x: 357, y: 282 },
    m3Pre:  { x: 224, y: 318 }, m3Post: { x: 253, y: 382 },
    m4Pre:  { x: 366, y: 319 }, m4Post: { x: 391, y: 379 },
    m5Pre:  { x: 543, y: 256 }, m5Post: { x: 540, y: 320 },
    m6Pre:  { x: 678, y: 256 }, m6Post: { x: 671, y: 321 },
    entrada:{ x: 473, y: 442 }, salida: { x: 613, y: 422 },
  }

  // PÁGINA 2 - Cliente, párrafo conclusión, firma y nombre
  const c2 = {
    cliente:      { x: 655, y: 73 }, // Esquina superior izq página 2
    parrafoConcl: { x: 18, y: 107, size: 11, color: negro, lineHeight: 14, ancho: 790 },
    xFirma: 363,   // Coordenada X de la firma
    yFirma: 379,   // Coordenada Y de la firma
    xNombre: 416,  // Coordenada X del nombre
    yNombre: 390,  // Coordenada Y del nombre
  }

  // ========== PÁGINA 1 ==========
  lineasEn(page1, [cliente], c1.cliente.x, c1.cliente.y, negro, 11)
  parrafo(page1, `El ${diaInforme} de ${mesNombre} de ${anioInforme} se procedió a realizar un lavado químico de todas las membranas, como parte de este procedimiento se mide y observa cada membrana por separado. En el siguiente esquema se puede apreciar la configuración de las membranas de la ósmosis reversa de la planta de agua.`, c1.parrafoIntro)

  lineasEn(page1, [`Cond ${m1Pre} µS/cm`], c1.m1Pre.x, c1.m1Pre.y, azul)
  lineasEn(page1, [`Cond ${m1Post} µS/cm`, `${m1Flujo} Lpm`], c1.m1Post.x, c1.m1Post.y, verde)
  lineasEn(page1, [`Cond ${m2Pre} µS/cm`], c1.m2Pre.x, c1.m2Pre.y, azul)
  lineasEn(page1, [`Cond ${m2Post} µS/cm`, `${m2Flujo} Lpm`], c1.m2Post.x, c1.m2Post.y, verde)
  lineasEn(page1, [`Cond ${m3Pre} µS/cm`], c1.m3Pre.x, c1.m3Pre.y, azul)
  lineasEn(page1, [`Cond ${m3Post} µS/cm`, `${m3Flujo} Lpm`], c1.m3Post.x, c1.m3Post.y, verde)
  lineasEn(page1, [`Cond ${m4Pre} µS/cm`], c1.m4Pre.x, c1.m4Pre.y, azul)
  lineasEn(page1, [`Cond ${m4Post} µS/cm`, `${m4Flujo} Lpm`], c1.m4Post.x, c1.m4Post.y, verde)
  lineasEn(page1, [`Cond ${m5Pre} µS/cm`], c1.m5Pre.x, c1.m5Pre.y, azul)
  lineasEn(page1, [`Cond ${m5Post} µS/cm`, `${m5Flujo} Lpm`], c1.m5Post.x, c1.m5Post.y, verde)
  lineasEn(page1, [`Cond ${m6Pre} µS/cm`], c1.m6Pre.x, c1.m6Pre.y, azul)
  lineasEn(page1, [`Cond ${m6Post} µS/cm`, `${m6Flujo} Lpm`], c1.m6Post.x, c1.m6Post.y, verde)

  lineasEn(page1, [`Conductividad de`, `entrada ${cde} µS/cm`], c1.entrada.x, c1.entrada.y, negro)
  lineasEn(page1, [
    `Conductividad de salida`,
    `Primer paso ${cds} µS/cm`,
    `Flujo Prod ${fp} lpm`,
    `Flujo Desc ${fd} lpm`,
    `Pres desc ${pd} psi`,
  ], c1.salida.x, c1.salida.y, verde)

  // ========== PÁGINA 2 ==========
  lineasEn(page2, [cliente], c2.cliente.x, c2.cliente.y, negro, 11)
  parrafo(page2, `Después del procedimiento de lavado químico (ac. cítrico como desincrustante y ac. peracético como desinfectante), el sistema quedó con una mejor performance, conductividad de salida de ${cds} µS/cm, con lo cual estamos en una RR cercana al ${rrTexto}% ${valFinal}. También se verificaron los flujos normales (3-5 lts. por membrana). La presión de rechazo quedó en ${pd} psi y ${fp} lpm de flujo producto.`, c2.parrafoConcl)

  // Firma en página 2
  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 100
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      page2.drawImage(firmaImg, { x: c2.xFirma, y: convertirY(c2.yFirma), width: anchoFirma, height: altoFirma })
    } catch (e) { console.error('Error cargando firma:', e) }
  }
  centrado(page2, tecnicoResponsable, c2.xNombre, c2.yNombre, 11, negro)

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}