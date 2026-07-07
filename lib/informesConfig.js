// Configuración del módulo de Informes de Desinfección

export const FIRMAS = {
  'Claudio Fuentes': 'https://res.cloudinary.com/dhozxnzre/image/upload/v1782505198/Firma_Claudio_kodjib.png',
  'Mauro Poloni': 'https://res.cloudinary.com/dhozxnzre/image/upload/v1782505201/Firma_Mauro0001_gsyxhe.png',
  'Marcelo Meza': 'https://res.cloudinary.com/dhozxnzre/image/upload/v1782505200/Firma_Marcelo_1_mfwtkg.jpg',
  'Matias Lazo': 'https://res.cloudinary.com/dhozxnzre/image/upload/v1782505200/Firma_Matias_1_eab822.jpg',
  'Isaias Miranda': 'https://res.cloudinary.com/dhozxnzre/image/upload/v1782505199/Firma_Isai%CC%81as_1_cths6q.jpg',
  'Jaime Figueroa': 'https://res.cloudinary.com/dhozxnzre/image/upload/v1782505202/Firma_Jaime_qqejmc.jpg',
  'Gian Cuvertino': 'https://res.cloudinary.com/dhozxnzre/image/upload/v1782505199/Firma_Gian_fgspcy.png',
  'Baldomero Urriola': 'https://res.cloudinary.com/dhozxnzre/image/upload/v1782505199/Firma_JPC_1_1_y8nmvf.jpg',
}

export const TECNICOS_INFORME = Object.keys(FIRMAS)

export const LUGARES_SERVICIO = [
  'Unidad de diálisis',
  'Unidad de UCI',
  'Unidad de esterilización',
  'Unidad de esterilización DAN',
]

export const CINTAS_REACTIVAS = [
  'Cinta peracidtest Lote: 2507199004 Exp. 07/2027',
  'Cinta WaterCheck. Lote:2407155001 Exp. 01/2027',
]

export const CONCENTRACIONES_ACIDO_REF = [
  '50 g/l - 5%',
  '100 g/l - 10%',
  '150 g/l - 15%',
]

// Texto fijo cuando NO hay salas de reuso
export const PUNTOS_SIN_REUSO = 'Válvula toma de muestra post estanque.\nVálvula retorno anillo sala de diálisis.'

export const CORREOS_DESTINO_FIJOS = [
  'informessiacingenieria@gmail.com',
  'ventas@siac-ingenieria.cl',
]

export const MESES_NOMBRE = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export function formatearFechaLarga(dia, mes, anio) {
  const mesNum = parseInt(mes) - 1
  const nombreMes = MESES_NOMBRE[mesNum] || ''
  const nombreMesCap = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)
  return `${dia} de ${nombreMesCap} ${anio}`
}

export function formatearFechaCorta(dia, mes, anio) {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const d = String(dia).padStart(2, '0')
  const nombreMes = meses[parseInt(mes) - 1] || mes
  return `${d}/${nombreMes}/${anio}`
}

export function calcularHoraTermino(horaInicio, tiempoEstadia, tiempoEnjuague) {
  if (!horaInicio) return ''
  const [h, m] = horaInicio.split(':').map(Number)
  const totalMin = (parseInt(tiempoEstadia) || 0) + (parseInt(tiempoEnjuague) || 0)
  let fecha = new Date()
  fecha.setHours(h, m, 0, 0)
  fecha.setMinutes(fecha.getMinutes() + totalMin)
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mm = String(fecha.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}