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

export async function generarPdfSemestral6sCarmenBlob(datos) {
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

  const plantillaUrl = '/plantillas/Plantilla_informe_matencion_6m_Carmen.pdf'
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
    cliente:      { x: 620, y: 73 },
    parrafoIntro: { x: 18, y: 130, size: 11, color: negro, lineHeight: 14, ancho: 790 },
    m1Pre:  { x: 257, y: 235 }, m1Post: { x: 199, y: 300 },
    m2Pre:  { x: 222, y: 360 }, m2Post: { x: 217, y: 425 },
    m3Pre:  { x: 361, y: 235 }, m3Post: { x: 312, y: 300 },
    m4Pre:  { x: 333, y: 360 }, m4Post: { x: 320, y: 425 },
    m5Pre:  { x: 465, y: 235 }, m5Post: { x: 418, y: 301 },
    m6Pre:  { x: 444, y: 359 }, m6Post: { x: 430, y: 425 },
    entrada:{ x: 437, y: 482 }, salida: { x: 562, y: 474 },
  }

  // PÁGINA 2 - Cliente, párrafo conclusión, firma y nombre
  const c2 = {
    cliente:      { x: 620, y: 73 }, // Esquina superior izq página 2
    parrafoConcl: { x: 18, y: 107, size: 11, color: negro, lineHeight: 14, ancho: 790 },
    xFirma: 360,   // Coordenada X de la firma
    yFirma: 397,   // Coordenada Y de la firma
    xNombre: 414,  // Coordenada X del nombre
    yNombre: 409,  // Coordenada Y del nombre
  }

  // ========== PÁGINA 1 ==========
  lineasEn(page1, [cliente], c1.cliente.x, c1.cliente.y, negro, 11)
  parrafo(page1, `El ${diaInforme} de ${mesNombre} de ${anioInforme} se procedió a realizar un lavado químico de todas las membranas que incluye la desinfección de las mismas. Como parte de este procedimiento se mide y observa cada membrana por separado. En el siguiente esquema se puede apreciar la configuración de las membranas de la Osmosis Reversa de la planta de agua. `, c1.parrafoIntro)

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
  parrafo(page2, `Después del procedimiento del lavado químico, con ácido cítrico al 3% por 45 minutos como desincrustante y luego expuesto a la acción de ácido Peracético al 1% por 30 minutos como desinfectante, el sistema quedo con una salida de ${cds} µS/cm, con una RR de ${rrTexto}% ${valFinal}. También se verificaron los flujos por membrana (normal 4 - 5 lts.) y las presiones, quedando en ${pd} psi de presión de rechazo y ${fp} lpm de flujo de permeado.`, c2.parrafoConcl)

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