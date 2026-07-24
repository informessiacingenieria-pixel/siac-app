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

export async function generarPdfSemestral4s4s2oBlob(datos) {
  const {
    cliente,
    diaInforme, mesInforme, anioInforme,
    // Osmosis 1 (4 membranas)
    o1m1Pre, o1m1Post, o1m1Flujo,
    o1m2Pre, o1m2Post, o1m2Flujo,
    o1m3Pre, o1m3Post, o1m3Flujo,
    o1m4Pre, o1m4Post, o1m4Flujo,
    o1cde, o1cds, o1fp, o1fd, o1pd, o1recomendacion,
    // Osmosis 2 (4 membranas)
    o2m1Pre, o2m1Post, o2m1Flujo,
    o2m2Pre, o2m2Post, o2m2Flujo,
    o2m3Pre, o2m3Post, o2m3Flujo,
    o2m4Pre, o2m4Post, o2m4Flujo,
    o2cde, o2cds, o2fp, o2fd, o2pd, o2recomendacion,
    tecnicoResponsable,
  } = datos

  const plantillaUrl = '/plantillas/Plantilla_informe_matencion_4s_4s_2o.pdf'
  const plantillaRes = await fetch(plantillaUrl)
  const plantillaBytes = await plantillaRes.arrayBuffer()
  const pdfDoc = await PDFDocument.load(plantillaBytes)
  const paginas = pdfDoc.getPages()
  const pag1 = paginas[0]
  const pag2 = paginas[1]
  PAGE_HEIGHT = pag1.getHeight()
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

  function centradoEn(page, texto, xCentro, yTop, size = 11, color = negro) {
    const ancho = font.widthOfTextAtSize(String(texto), size)
    page.drawText(String(texto), { x: xCentro - ancho / 2, y: convertirY(yTop) - size, size, font, color })
  }

  function parrafoEn(page, texto, conf) {
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
  const rr1 = calcularRR(o1cde, o1cds)
  const rr1Texto = rr1 !== null ? (Math.round(rr1 * 100) / 100).toString().replace('.', ',') : ''
  const valFinal1 = textoFinalRR(rr1, o1recomendacion)
  const rr2 = calcularRR(o2cde, o2cds)
  const rr2Texto = rr2 !== null ? (Math.round(rr2 * 100) / 100).toString().replace('.', ',') : ''
  const valFinal2 = textoFinalRR(rr2, o2recomendacion)

  const cajaSalida = (cds, fp, fd, pd) => ([
    `Conductividad de salida`,
    `Primer paso ${cds} µS/cm`,
    `Flujo Prod ${fp} lpm`,
    `Flujo Desc ${fd} lpm`,
    `Pres desc ${pd} psi`,
  ])

  // ===================== PÁGINA 1 - OSMOSIS 1 (4 membranas) =====================
  const c1 = {
    cliente:      { x: 680, y: 73 },
    parrafoIntro: { x: 18, y: 130, size: 11, color: negro, lineHeight: 14, ancho: 790 },
    m1Pre:  { x: 235, y: 214 }, m1Post: { x: 235, y: 288 },
    m2Pre:  { x: 373, y: 214 }, m2Post: { x: 372, y: 288 },
    m3Pre:  { x: 502, y: 214 }, m3Post: { x: 502, y: 288 },
    m4Pre:  { x: 633, y: 214 }, m4Post: { x: 634, y: 288 },
    entrada:{ x: 422, y: 362 }, salida: { x: 555, y: 342 },
    parrafoConcl: { x: 18, y: 435, size: 11, color: negro, lineHeight: 14, ancho: 790 },
  }

  lineasEn(pag1, [cliente], c1.cliente.x, c1.cliente.y, negro, 11)
  parrafoEn(pag1, `El ${diaInforme} de ${mesNombre} de ${anioInforme} se procedió a realizar un lavado químico de todas las membranas, como parte de este procedimiento se mide y observa cada membrana por separado. En el siguiente esquema se puede apreciar la configuración de las membranas de la osmosis reversa de la planta de agua.`, c1.parrafoIntro)
  lineasEn(pag1, [`Cond ${o1m1Pre} µS/cm`], c1.m1Pre.x, c1.m1Pre.y, azul)
  lineasEn(pag1, [`Cond ${o1m1Post} µS/cm`, `${o1m1Flujo} Lpm`], c1.m1Post.x, c1.m1Post.y, verde)
  lineasEn(pag1, [`Cond ${o1m2Pre} µS/cm`], c1.m2Pre.x, c1.m2Pre.y, azul)
  lineasEn(pag1, [`Cond ${o1m2Post} µS/cm`, `${o1m2Flujo} Lpm`], c1.m2Post.x, c1.m2Post.y, verde)
  lineasEn(pag1, [`Cond ${o1m3Pre} µS/cm`], c1.m3Pre.x, c1.m3Pre.y, azul)
  lineasEn(pag1, [`Cond ${o1m3Post} µS/cm`, `${o1m3Flujo} Lpm`], c1.m3Post.x, c1.m3Post.y, verde)
  lineasEn(pag1, [`Cond ${o1m4Pre} µS/cm`], c1.m4Pre.x, c1.m4Pre.y, azul)
  lineasEn(pag1, [`Cond ${o1m4Post} µS/cm`, `${o1m4Flujo} Lpm`], c1.m4Post.x, c1.m4Post.y, verde)
  lineasEn(pag1, [`Conductividad de`, `entrada ${o1cde} µS/cm`], c1.entrada.x, c1.entrada.y, negro)
  lineasEn(pag1, cajaSalida(o1cds, o1fp, o1fd, o1pd), c1.salida.x, c1.salida.y, verde)
  parrafoEn(pag1, `Después del procedimiento de lavado químico (ac. cítrico como desincrustante y ac. peracético como desinfectante), el sistema quedo con una mejor performance, conductividad de salida de ${o1cds} µS/cm, con lo cual estamos en una RR cercana al ${rr1Texto}% ${valFinal1}. También se verificaron los flujos normales (3-5 lts. por membrana). La presión de rechazo quedo en ${o1pd} psi y ${o1fp} lpm de flujo producto.`, c1.parrafoConcl)

  // ===================== PÁGINA 2 - OSMOSIS 2 (4 membranas) =====================
  const c2 = {
    cliente:  { x: 680, y: 73 },
    m1Pre:  { x: 270, y: 150 }, m1Post: { x: 270, y: 200 },
    m2Pre:  { x: 400, y: 150 }, m2Post: { x: 400, y: 200 },
    m3Pre:  { x: 560, y: 150 }, m3Post: { x: 560, y: 200 },
    m4Pre:  { x: 660, y: 150 }, m4Post: { x: 660, y: 200 },
    entrada:{ x: 470, y: 300 }, salida: { x: 580, y: 250 },
    parrafoConcl: { x: 18, y: 390, size: 11, color: negro, lineHeight: 14, ancho: 790 },
    xFirma: 355, yFirma: 500, xNombre: 415, yNombre: 506,
  }

  lineasEn(pag2, [cliente], c2.cliente.x, c2.cliente.y, negro, 11)
  lineasEn(pag2, [`Cond ${o2m1Pre} µS/cm`], c2.m1Pre.x, c2.m1Pre.y, azul)
  lineasEn(pag2, [`Cond ${o2m1Post} µS/cm`, `${o2m1Flujo} Lpm`], c2.m1Post.x, c2.m1Post.y, verde)
  lineasEn(pag2, [`Cond ${o2m2Pre} µS/cm`], c2.m2Pre.x, c2.m2Pre.y, azul)
  lineasEn(pag2, [`Cond ${o2m2Post} µS/cm`, `${o2m2Flujo} Lpm`], c2.m2Post.x, c2.m2Post.y, verde)
  lineasEn(pag2, [`Cond ${o2m3Pre} µS/cm`], c2.m3Pre.x, c2.m3Pre.y, azul)
  lineasEn(pag2, [`Cond ${o2m3Post} µS/cm`, `${o2m3Flujo} Lpm`], c2.m3Post.x, c2.m3Post.y, verde)
  lineasEn(pag2, [`Cond ${o2m4Pre} µS/cm`], c2.m4Pre.x, c2.m4Pre.y, azul)
  lineasEn(pag2, [`Cond ${o2m4Post} µS/cm`, `${o2m4Flujo} Lpm`], c2.m4Post.x, c2.m4Post.y, verde)
  lineasEn(pag2, [`Conductividad de`, `entrada ${o2cde} µS/cm`], c2.entrada.x, c2.entrada.y, negro)
  lineasEn(pag2, cajaSalida(o2cds, o2fp, o2fd, o2pd), c2.salida.x, c2.salida.y, verde)
  parrafoEn(pag2, `Después del procedimiento de lavado químico (ac. cítrico como desincrustante y ac. peracético como desinfectante), el sistema quedo con una mejor performance, conductividad de salida de ${o2cds} µS/cm, con lo cual estamos en una RR cercana al ${rr2Texto}% ${valFinal2}. También se verificaron los flujos normales (3-5 lts. por membrana). La presión de rechazo quedo en ${o2pd} psi y ${o2fp} lpm de flujo producto.`, c2.parrafoConcl)

  const firmaUrl = FIRMAS[tecnicoResponsable]
  if (firmaUrl) {
    try {
      const firmaImg = await cargarImagenFirma(pdfDoc, firmaUrl)
      const anchoFirma = 100
      const altoFirma = (firmaImg.height / firmaImg.width) * anchoFirma
      pag2.drawImage(firmaImg, { x: c2.xFirma, y: convertirY(c2.yFirma), width: anchoFirma, height: altoFirma })
    } catch (e) { console.error('Error cargando firma:', e) }
  }
  centradoEn(pag2, tecnicoResponsable, c2.xNombre, c2.yNombre, 11, negro)

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes], { type: 'application/pdf' })
}