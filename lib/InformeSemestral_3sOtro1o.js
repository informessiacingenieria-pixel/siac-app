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

export async function generarPdfSemestral3sOtro1oBlob(datos) {
  const {
    cliente,
    diaInforme, mesInforme, anioInforme,
    m1Pre, m1Post, m1Flujo,
    m2Pre, m2Post, m2Flujo,
    m3Pre, m3Post, m3Flujo,
    cde,
    cds1, fp1, fd1, pd1,   // salida primer paso
    cds2, fp2, fd2, pd2,   // salida segundo paso
    recomendacion,
    tecnicoResponsable,
  } = datos

  const plantillaUrl = '/plantillas/Plantilla_informe_matencion_3s_otro_1o.pdf'
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
  const rr1 = calcularRR(cde, cds1)
  const rr1Texto = rr1 !== null ? (Math.round(rr1 * 100) / 100).toString().replace('.', ',') : ''
  const rr2 = calcularRR(cde, cds2)
  const rr2Texto = rr2 !== null ? (Math.round(rr2 * 100) / 100).toString().replace('.', ',') : ''
  const valFinal = textoFinalRR(rr1, recomendacion)

  // ===================== PÁGINA 1 - DIAGRAMA =====================
  const c1 = {
    cliente:      { x: 680, y: 73 },
    parrafoIntro: { x: 20, y: 130, size: 11, color: negro, lineHeight: 14, ancho: 770 },
    m1Pre:  { x: 254, y: 245 }, m1Post: { x: 160, y: 319 },
    m2Pre:  { x: 392, y: 245 }, m2Post: { x: 283, y: 318 },
    m3Pre:  { x: 560, y: 249 }, m3Post: { x: 565, y: 320 },
    entrada:  { x: 320, y: 390 },
    salida1:  { x: 450, y: 385 },   // Primer paso
    salida2:  { x: 620, y: 383 },   // Segundo paso
  }

  lineasEn(pag1, [cliente], c1.cliente.x, c1.cliente.y, negro, 11)
  parrafoEn(pag1, `El ${diaInforme} de ${mesNombre} de ${anioInforme} se procedió a realizar un lavado químico de todas las membranas, como parte de este procedimiento se mide y observa cada membrana por separado. En el siguiente esquema se puede apreciar la configuración de las membranas de la osmosis reversa de la planta de agua.`, c1.parrafoIntro)

  lineasEn(pag1, [`Cond ${m1Pre} µS/cm`], c1.m1Pre.x, c1.m1Pre.y, azul)
  lineasEn(pag1, [`Cond ${m1Post} µS/cm`, `${m1Flujo} Lpm`], c1.m1Post.x, c1.m1Post.y, verde)
  lineasEn(pag1, [`Cond ${m2Pre} µS/cm`], c1.m2Pre.x, c1.m2Pre.y, azul)
  lineasEn(pag1, [`Cond ${m2Post} µS/cm`, `${m2Flujo} Lpm`], c1.m2Post.x, c1.m2Post.y, verde)
  lineasEn(pag1, [`Cond ${m3Pre} µS/cm`], c1.m3Pre.x, c1.m3Pre.y, azul)
  lineasEn(pag1, [`Cond ${m3Post} µS/cm`, `${m3Flujo} Lpm`], c1.m3Post.x, c1.m3Post.y, verde)

  lineasEn(pag1, [`Conductividad de`, `entrada ${cde} µS/cm`], c1.entrada.x, c1.entrada.y, negro)
  lineasEn(pag1, [
    `Conductividad de salida`,
    `Primer paso ${cds1} µS/cm`,
    `Flujo Prod ${fp1} lpm`,
    `Flujo Desc ${fd1} lpm`,
    `Pres desc ${pd1} psi`,
  ], c1.salida1.x, c1.salida1.y, verde)
  lineasEn(pag1, [
    `Conductividad de salida`,
    `Segundo paso ${cds2} µS/cm`,
    `Flujo Prod ${fp2} lpm`,
    `Flujo Desc ${fd2} lpm`,
    `Pres desc ${pd2} psi`,
  ], c1.salida2.x, c1.salida2.y, verde)

  // ===================== PÁGINA 2 - CONCLUSIÓN + NOTA + FIRMA =====================
  const c2 = {
    cliente:      { x: 680, y: 80 },
    parrafoConcl: { x: 20, y: 130, size: 11, color: negro, lineHeight: 14, ancho: 770 },
    nota:         { x: 20, y: 195, size: 11, color: negro, lineHeight: 14, ancho: 770 },
    xFirma: 360, yFirma: 420, xNombre: 420, yNombre: 419.5,
  }

  lineasEn(pag2, [cliente], c2.cliente.x, c2.cliente.y, negro, 11)
  parrafoEn(pag2, `Después del procedimiento de lavado químico (ac. cítrico como desincrustante y ac. peracético como desinfectante), la conductividad de salida quedo en ${cds1} µS/cm, con lo cual estamos en una RR cercana al ${rr1Texto}% ${valFinal}. También se verificaron los flujos normales (normal 3-5 lts. por membrana). La presión de rechazo quedo en ${pd1} psi y ${fp1} lpm de flujo de permeado. Se vuelve a configuración para trabajar como osmosis en línea.`, c2.parrafoConcl)
  parrafoEn(pag2, `Nota: Adicionalmente, se efectuó medición por separado de la membrana del segundo paso con agua blanda quedando con una resolución de rechazo (RR) de ${rr2Texto} %.`, c2.nota)

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