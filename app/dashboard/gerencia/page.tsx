'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '../../../lib/firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp, where } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts'
import { generarPdfBlob } from '../../../lib/InformePDF'
import { generarPdfSemestralBlob, calcularRR, textoFinalRR } from '../../../lib/InformeSemestralPDF'
import { generarPdfSemestral2m4m2oBlob } from '../../../lib/InformeSemestral_2m4m2o'
import { generarPdfSemestral3s1oBlob } from '../../../lib/InformeSemestral_3s1o'
import { generarPdfSemestral3sOtro1oBlob } from '../../../lib/InformeSemestral_3sOtro1o'
import { generarPdfSemestral3s3s2oBlob } from '../../../lib/InformeSemestral_3s3s2o'
import { generarPdfSemestral3s2s2oBlob } from '../../../lib/InformeSemestral_3s2s2o'
import { generarPdfSemestral4s1oBlob } from '../../../lib/InformeSemestral_4s1o.js'
import { generarPdfSemestral4s2s2oBlob } from '../../../lib/InformeSemestral_4s2s2o'
import { generarPdfSemestral4s3s2oBlob } from '../../../lib/InformeSemestral_4s3s2o'
import { generarPdfSemestral4s4s2oBlob } from '../../../lib/InformeSemestral_4s4s2o'
import { generarPdfSemestral5s1oBlob } from '../../../lib/InformeSemestral_5s1o'
import { generarPdfSemestral5s2s2oBlob } from '../../../lib/InformeSemestral_5s2s2o'
import { generarPdfSemestral5s3s2oBlob } from '../../../lib/InformeSemestral_5s3s2o'
import { generarPdfSemestral5m4mBlob } from '../../../lib/InformeSemestral_5m_4m'
import { generarPdfSemestral6ot4s2oBlob } from '../../../lib/InformeSemestral_6ot4s2o'
import { generarPdfSemestral6m6m2oBlob } from '../../../lib/InformeSemestral_6m6m2o'
import { generarPdfSemestral6s1oBlob } from '../../../lib/InformeSemestral_6m1o'
import { generarPdfSemestral6t3s2oBlob } from '../../../lib/InformeSemestral_6t3s2o'
import { generarPdfSemestral6t4s2oBlob } from '../../../lib/InformeSemestral_6t4s2o'
import { generarPdfSemestral7m4s2oBlob } from '../../../lib/InformeSemestral_7m4s2o'
import { generarPdfSemestral8m5s2oBlob } from '../../../lib/InformeSemestral_8m5s2o'
import { generarPdfSemestral6sCarmenBlob } from '../../../lib/InformeSemestral_6sCarmen'
import { LUGARES_SERVICIO, CINTAS_REACTIVAS } from '../../../lib/informesConfig'

const CENTROS = [
  'CD Cendial Salamanca','CD Chacabuco','CD Dialsur','CD Interdial','CD La Reina',
  'CD Lampa','CD Los Andes','CD Mendoza','CD Nueva Vida Huepil','CD Nueva Vida Los Angeles',
  'CD Ñuñoa','CD Ñuñoa Pudahuel','CD Ñuñoa Quinta Normal','CD Pacifico','CD Padre Hurtado',
  'CD Rancagua Dial','CD San Lucas','CD Tabancura','CD Unidial','CD Urodial San Vicente',
  'CD Vespucio','CD Vidacare','CD Vidadial Collipulli','CD Vidadial Lanco','CD Vidadial Paillaco',
  'Ctro. Nefro. Puerto Montt','DAM Santiago','DAM Quilpué','Davila Cron','Davila UCI','Diamar',
  'HBTL Alimentación','HBTL Diálisis','HBTL Endoscopia','HBTL Esterilización','HBTL Sedile',
  'HBTL UTI 1','HCUCH Abla. y Panta Estéril','HCUCH Calderas','HCUCH DAN','HCUCH Diálisis',
  'Hemodiálisis Curicó','Hosp. Calbuco','Hosp. El Carmen DAN','Hosp. El Carmen Dental','Hosp. El Carmen Esterilización',
  'Hosp. El Carmen Farmacia y Labt','Hosp. El Carmen Hemodiálisis','Hosp. El Carmen Sedile', 'Hosp. La Florida Esterelizacion',
  'Hosp. La Florida Farmacia y Laboratorio','Hosp. La Florida Anatomia Patologica',
  'Hosp. La Florida Odontologia','Hosp. La Florida SEDILE','Hosp. Curacautin','Hosp. Lautaro Antiguo',
  'Hosp. Lautaro Nuevo','Hosp. Luis Calvo Mackenna Diálisis','Hosp. Luis Calvo Mackenna Estéril',
  'Hosp. Maipú','Hosp. Nueva Imperial','Hosp. Osorno Diálisis','Hosp. Osorno Esterelización',
  'Hosp. Puerto Montt','Hosp. Purranque','Hosp. Salvador Diálisis','Hosp. Salvador Estéril',
  'Hosp. San Camilo','Hosp. San Jose','Hosp. Valdivia','Nefrodial Linares','Nefrodial Molina',
  'Nefrodial San Javier','Municipalidad Puerto Montt','Premio Nobel','Red Dialisis','UPC Hospital Nueva Imperial'
]

const ESTADOS = ['Pendiente', 'En revisión', 'Cobrado']
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_NOMBRE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const ANIOS_DISPONIBLES = [2026, 2027, 2028, 2029, 2030]
const DIAS_DISPONIBLES = Array.from({length: 31}, (_, i) => i + 1)
const CLOUDINARY_CLOUD = 'dhozxnzre'
const CLOUDINARY_PRESET = 'siac_uploads'

const informeVacio = {
  cliente: '',
  fechaInformeDia: '', fechaInformeMes: '', fechaInformeAnio: '',
  fechaServicioDia: '', fechaServicioMes: '', fechaServicioAnio: '',
  lugarServicio: '',
  quimico: '',
  concentracionCloro: '', fechaExpiracionCloro: '',
  concentracionAcido: '', loteAcido: '', fechaVencimientoAcido: '',
  cintaPresencia: '', cintaAusencia: '',
  ltAguaTratada: '', ltQuimicoUtilizado: '',
  hay2doEstanque: null, ltAguaTratada2: '', ltQuimicoUtilizado2: '',
  horaInicio: '', tiempoEstadia: '', tiempoEnjuague: '',
  haySalasReuso: null,
  monitoresPresencia: '', salaReparacionPresencia: '',
  monitoresAusencia: '', salaReparacionAusencia: '',
}

const semestralVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  o1CondPre1: '', o1CondPost1: '', o1Flujo1: '',
  o1CondPre2: '', o1CondPost2: '', o1Flujo2: '',
  cde1: '', cds1: '', fp1: '', fd1: '', pd1: '',
  recomendacion: '',
}

const semestral2Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1 (2 membranas)
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  // Osmosis 2 (4 membranas)
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2m4Pre: '', o2m4Post: '', o2m4Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_3S1O = ['CD Cendial Salamanca',
  'CD Lampa','CD Los Andes',
  'CD Nueva Vida Huepil',
  'CD Ñuñoa Pudahuel',
  'CD Padre Hurtado',
  'CD Rancagua Dial',
  'CD San Lucas',
  'CD Urodial San Vicente',
  'CD Vidadial Collipulli',
  'Hemodiálisis Curicó',
  'Hosp. Lautaro Nuevo',
  'Hosp. Nueva Imperial',
  'Nefrodial Linares',
  'Nefrodial Molina',
  'Nefrodial San Javier',
  'UPC Hospital Nueva Imperial']

const semestral3Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  m1Pre: '', m1Post: '', m1Flujo: '',
  m2Pre: '', m2Post: '', m2Flujo: '',
  m3Pre: '', m3Post: '', m3Flujo: '',
  cde: '', cds: '', fp: '', fd: '', pd: '', recomendacion: '',
  hayObservaciones: null,   // ← AGREGAR (null = todavía no responde)
  observaciones: '', 
}

const CENTROS_3S_OTRO = ['DAM Quilpué','HBTL Esterilización','HBTL Sedile','HBTL UTI 1']

const semestral4Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  m1Pre: '', m1Post: '', m1Flujo: '',
  m2Pre: '', m2Post: '', m2Flujo: '',
  m3Pre: '', m3Post: '', m3Flujo: '',
  cde: '',
  cds1: '', fp1: '', fd1: '', pd1: '',
  cds2: '', fp2: '', fd2: '', pd2: '',
  recomendacion: '',
}

const semestral5Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_3S_2S = ['Davila UCI','Municipalidad Puerto Montt']

const semestral6Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_4S1O = ['CD Interdial','CD Nueva Vida Los Angeles','Hosp. Lautaro Antiguo','Hosp. Luis Calvo Mackenna Diálisis','Red Dialisis']

const semestral7Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  m1Pre: '', m1Post: '', m1Flujo: '',
  m2Pre: '', m2Post: '', m2Flujo: '',
  m3Pre: '', m3Post: '', m3Flujo: '',
  m4Pre: '', m4Post: '', m4Flujo: '',
  cde: '', cds: '', fp: '', fd: '', pd: '', recomendacion: '',
}

const semestral8Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_4S_3S = ['CD Mendoza','Hosp. Curacautin']

const semestral9Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const semestral10Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2m4Pre: '', o2m4Post: '', o2m4Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_5S1O = ['CD Vidadial Lanco','CD Vidadial Paillaco']

const semestral11Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  m1Pre: '', m1Post: '', m1Flujo: '',
  m2Pre: '', m2Post: '', m2Flujo: '',
  m3Pre: '', m3Post: '', m3Flujo: '',
  m4Pre: '', m4Post: '', m4Flujo: '',
  m5Pre: '', m5Post: '', m5Flujo: '',
  cde: '', cds: '', fp: '', fd: '', pd: '', recomendacion: '',
}

const CENTROS_5S_2S_2O = ['Hosp. Luis Calvo Mackenna Estéril']

const semestral12Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_5S_3S_2O = ['DAM Santiago', 'Hosp. Calbuco', 'Hosp. San Jose']

const semestral13Vacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_5M_4M = ['Davila Cron']

const semestral5m4mVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1: 5 membranas
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  // Osmosis 2: 4 membranas
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2m4Pre: '', o2m4Post: '', o2m4Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_6ot_4M = ['CD La Reina']

const semestral6ot4mVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1: 6 membranas
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1m6Pre: '', o1m6Post: '', o1m6Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  // Osmosis 2: 4 membranas
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2m4Pre: '', o2m4Post: '', o2m4Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_6M_6M = ['CD Ñuñoa','CD Unidial','Hosp. Puerto Montt']

const semestral6m6mVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1: 6 membranas
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1m6Pre: '', o1m6Post: '', o1m6Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  // Osmosis 2: 6 membranas
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2m4Pre: '', o2m4Post: '', o2m4Flujo: '',
  o2m5Pre: '', o2m5Post: '', o2m5Flujo: '',
  o2m6Pre: '', o2m6Post: '', o2m6Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_6M = ['CD Vespucio','Hosp. Maipú','Hosp. Purranque','Hosp. Valdivia']

const semestral6mVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1: 6 membranas
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1m6Pre: '', o1m6Post: '', o1m6Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
}

const CENTROS_6T_3S = ['Premio Nobel']

const semestral6t3sVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1: 6 membranas
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1m6Pre: '', o1m6Post: '', o1m6Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  // Osmosis 2: 3 membranas
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_6T_4S = ['CD Dialsur','CD Ñuñoa Quinta Normal','Diamar','HBTL Diálisis','Hosp. Osorno Diálisis','Hosp. San Camilo']

const semestral6t4sVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1: 6 membranas
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1m6Pre: '', o1m6Post: '', o1m6Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  // Osmosis 2: 6 membranas
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2m4Pre: '', o2m4Post: '', o2m4Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_7M_4S = ['CD Chacabuco']

const semestral7m4sVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1: 6 membranas
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1m6Pre: '', o1m6Post: '', o1m6Flujo: '',
  o1m7Pre: '', o1m7Post: '', o1m7Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  // Osmosis 2: 4 membranas
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2m4Pre: '', o2m4Post: '', o2m4Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_8M_5S = ['HCUCH Diálisis']

const semestral8m5sVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1: 6 membranas
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1m6Pre: '', o1m6Post: '', o1m6Flujo: '',
  o1m7Pre: '', o1m7Post: '', o1m7Flujo: '',
  o1m8Pre: '', o1m8Post: '', o1m8Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
  // Osmosis 2: 4 membranas
  o2m1Pre: '', o2m1Post: '', o2m1Flujo: '',
  o2m2Pre: '', o2m2Post: '', o2m2Flujo: '',
  o2m3Pre: '', o2m3Post: '', o2m3Flujo: '',
  o2m4Pre: '', o2m4Post: '', o2m4Flujo: '',
  o2m5Pre: '', o2m5Post: '', o2m5Flujo: '',
  o2cde: '', o2cds: '', o2fp: '', o2fd: '', o2pd: '', o2recomendacion: '',
}

const CENTROS_6sCarmen= ['Hosp. El Carmen Hemodiálisis']

const semestral6sCarmenVacio = {
  cliente: '',
  diaInforme: '', mesInforme: '', anioInforme: '',
  // Osmosis 1: 6 membranas
  o1m1Pre: '', o1m1Post: '', o1m1Flujo: '',
  o1m2Pre: '', o1m2Post: '', o1m2Flujo: '',
  o1m3Pre: '', o1m3Post: '', o1m3Flujo: '',
  o1m4Pre: '', o1m4Post: '', o1m4Flujo: '',
  o1m5Pre: '', o1m5Post: '', o1m5Flujo: '',
  o1m6Pre: '', o1m6Post: '', o1m6Flujo: '',
  o1cde: '', o1cds: '', o1fp: '', o1fd: '', o1pd: '', o1recomendacion: '',
}

const CENTROS_YA_IMPLEMENTADOS = [
  'CD Vidacare',
  'CD Pacifico',
  'Ctro. Nefro. Puerto Montt',
  'HCUCH Abla. y Panta Estéril',
  'Hosp. Salvador Diálisis',
  ...CENTROS_3S1O,
  ...CENTROS_3S_OTRO,
  ...CENTROS_3S_2S,
  ...CENTROS_4S1O,
  ...CENTROS_4S_3S,
  ...CENTROS_5S1O,
  ...CENTROS_5S_2S_2O,
  ...CENTROS_5S_3S_2O,
  ...CENTROS_5M_4M,
  ...CENTROS_6ot_4M,
  ...CENTROS_6M_6M,
  ...CENTROS_6M,
  ...CENTROS_6T_3S,
  ...CENTROS_6T_4S,
  ...CENTROS_7M_4S,
  ...CENTROS_8M_5S,
  ...CENTROS_6sCarmen,
]

export default function GerenciaPage() {
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState('inicio')
  const [registros, setRegistros] = useState<any[]>([])
  const [todosInformes, setTodosInformes] = useState<any[]>([])
  const [misInformesG, setMisInformesG] = useState<any[]>([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTecnico, setFiltroTecnico] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('')
  const [filtroMesReg, setFiltroMesReg] = useState('')
  const [filtroTecnicoInf, setFiltroTecnicoInf] = useState('')
  const [filtroCentroInf, setFiltroCentroInf] = useState('')
  const [filtroMesInf, setFiltroMesInf] = useState('')
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const [submenuInformesOpen, setSubmenuInformesOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [modalRegistro, setModalRegistro] = useState<any>(null)
  const [editando, setEditando] = useState(false)
  const [editRepuestos, setEditRepuestos] = useState<any[]>([])
  const [editObservaciones, setEditObservaciones] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editUsaRepuestos, setEditUsaRepuestos] = useState(true)
  const [editFotos, setEditFotos] = useState<string[]>([])
  const [editNumeroInforme, setEditNumeroInforme] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [fotoVisor, setFotoVisor] = useState<string|null>(null)

  // Estado nueva visita gerencia
  const [centro, setCentro] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [numeroInforme, setNumeroInforme] = useState('')
  const [usaRepuestos, setUsaRepuestos] = useState<boolean|null>(null)
  const [repuestos, setRepuestos] = useState<any[]>([{nombre:'',cantidad:1}])
  const [observaciones, setObservaciones] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [subiendoFotos, setSubiendoFotos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  // Estado informe desinfección
  const [informe, setInforme] = useState<any>(informeVacio)
  const [generandoInforme, setGenerandoInforme] = useState(false)
  const [exitoInforme, setExitoInforme] = useState(false)

  // Estado informe semestral
  const [semestral, setSemestral] = useState<any>(semestralVacio)
  const [semestrales, setSemestrales] = useState<any[]>([])
  const [generandoSemestral, setGenerandoSemestral] = useState(false)
  const [exitoSemestral, setExitoSemestral] = useState(false)
  const [submenuSemestralOpen, setSubmenuSemestralOpen] = useState(false)
  const [filtroTecnicoSemestral, setFiltroTecnicoSemestral] = useState('')
  const [filtroCentroSemestral, setFiltroCentroSemestral] = useState('')
  const [filtroMesSemestral, setFiltroMesSemestral] = useState('')
  const [showMasServicios, setShowMasServicios] = useState(false)
  const [mostrarObs3s1o, setMostrarObs3s1o] = useState(false)

  // Estado informes semestral 2 osmosis (CD Pacifico)
  const [semestral2, setSemestral2] = useState<any>(semestral2Vacio)
  const [semestral3, setSemestral3] = useState<any>(semestral3Vacio)
  const [semestral4, setSemestral4] = useState<any>(semestral4Vacio)
  const [semestral5, setSemestral5] = useState<any>(semestral5Vacio)
  const [semestral6, setSemestral6] = useState<any>(semestral6Vacio)
  const [semestral7, setSemestral7] = useState<any>(semestral7Vacio)
  const [semestral8, setSemestral8] = useState<any>(semestral8Vacio)
  const [semestral9, setSemestral9] = useState<any>(semestral9Vacio)
  const [semestral10, setSemestral10] = useState<any>(semestral10Vacio)
  const [semestral11, setSemestral11] = useState<any>(semestral11Vacio)
  const [semestral12, setSemestral12] = useState<any>(semestral12Vacio)
  const [semestral13, setSemestral13] = useState<any>(semestral13Vacio)
  const [semestral5m4m, setSemestral5m4m] = useState<any>(semestral5m4mVacio)
  const [semestral6ot4m, setSemestral6ot4m] = useState<any>(semestral6ot4mVacio)
  const [semestral6m6m, setSemestral6m6m] = useState<any>(semestral6m6mVacio)
  const [semestral6m, setSemestral6m] = useState<any>(semestral6mVacio)
  const [semestral6t3s, setSemestral6t3s] = useState<any>(semestral6t3sVacio)
  const [semestral6t4s, setSemestral6t4s] = useState<any>(semestral6t4sVacio)
  const [semestral7m4s, setSemestral7m4s] = useState<any>(semestral7m4sVacio)
  const [semestral8m5s, setSemestral8m5s] = useState<any>(semestral8m5sVacio)
  const [semestral6sCarmen, setSemestral6sCarmen] = useState<any>(semestral6sCarmenVacio)
  

  const router = useRouter()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/'); return }
      if (u.email !== 'informessiacingenieria@gmail.com') { router.push('/dashboard/tecnico'); return }
      setUser(u)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'visitas'), orderBy('fecha', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setRegistros(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[])
    })
    return () => unsub()
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'informes'), orderBy('creadoEn', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
      setTodosInformes(todos)
      setMisInformesG(todos.filter(i => i.email === user.email))
    })
    return () => unsub()
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'informes_semestrales'), orderBy('creadoEn', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setSemestrales(snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[])
    })
    return () => unsub()
  }, [user])

  useEffect(() => {
    const bloquearScroll = (e: any) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'number' && document.activeElement === e.target) {
        e.target.blur()
      }
    }
    document.addEventListener('wheel', bloquearScroll, { passive: true })
    return () => document.removeEventListener('wheel', bloquearScroll)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push('/'); return }
      if (u.email !== 'informessiacingenieria@gmail.com') { router.push('/dashboard/tecnico'); return }
      setUser(u)
    })
    return () => unsub()
  }, [])

  const handleLogout = async () => { await signOut(auth); router.push('/') }

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    await updateDoc(doc(db, 'visitas', id), { estado: nuevoEstado })
  }

  const eliminarVisita = async (id: string) => {
    if (!confirm('¿Estás seguro que deseas eliminar este registro?')) return
    await deleteDoc(doc(db, 'visitas', id))
    if (modalRegistro?.id === id) cerrarModal()
  }

  const eliminarInforme = async (id: string) => {
    if (!confirm('¿Estás seguro que deseas eliminar este informe? Esta acción no se puede deshacer.')) return
    await deleteDoc(doc(db, 'informes', id))
  }

  const irARevisiones = (estado: string) => {
    setFiltroEstado(estado); setFiltroTecnico(''); setFiltroCentro('')
    setTab('registros'); setSubmenuOpen(true)
  }

  const parsearRepuestos = (reps: any[]): {nombre:string,cantidad:number}[] => {
    if (!reps || reps.length === 0) return []
    if (typeof reps[0] === 'string') return reps.map(r => ({nombre:r, cantidad:1}))
    return reps
  }

  const abrirModal = (r: any) => {
    setModalRegistro(r)
    const parsed = parsearRepuestos(r.repuestos || [])
    setEditRepuestos(parsed.length > 0 ? parsed : [{nombre:'',cantidad:1}])
    setEditObservaciones(r.observaciones || '')
    setEditEstado(r.estado || 'Pendiente')
    setEditUsaRepuestos(r.repuestos && r.repuestos.length > 0)
    setEditFotos(r.fotos || [])
    setEditNumeroInforme(r.numeroInforme || '')
    setEditFecha(r.fecha?.toDate ? r.fecha.toDate().toISOString().split('T')[0] : '')
    setEditando(false)
  }

  const cerrarModal = () => { setModalRegistro(null); setEditando(false); setFotoVisor(null) }

  const handleUsaRepuestosChange = (usa: boolean) => {
    setEditUsaRepuestos(usa)
    if (!usa) {
      setEditRepuestos([])
      setEditObservaciones(prev => prev || 'No se utilizaron repuestos')
    } else {
      setEditRepuestos([{nombre:'',cantidad:1}])
      if (editObservaciones === 'No se utilizaron repuestos') setEditObservaciones('')
    }
  }

  const guardarEdicion = async () => {
    if (!modalRegistro) return
    setGuardandoEdit(true)
    const repsGuardar = editUsaRepuestos
      ? editRepuestos.filter(r => r.nombre.trim()).map(r => ({ nombre: r.nombre, cantidad: parseInt(String(r.cantidad)) || 1 }))
      : []
    await updateDoc(doc(db, 'visitas', modalRegistro.id), {
      repuestos: repsGuardar, observaciones: editObservaciones, estado: editEstado,
      usaRepuestos: editUsaRepuestos, fotos: editFotos, numeroInforme: editNumeroInforme,
      fecha: editFecha ? Timestamp.fromDate(new Date(editFecha + 'T12:00:00')) : modalRegistro.fecha,
    })
    setGuardandoEdit(false); setEditando(false)
    setModalRegistro({...modalRegistro, repuestos: repsGuardar, observaciones: editObservaciones, estado: editEstado, fotos: editFotos, numeroInforme: editNumeroInforme, fecha: editFecha ? Timestamp.fromDate(new Date(editFecha + 'T12:00:00')) : modalRegistro.fecha})
  }

  const subirFoto = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    return data.secure_url
  }

  const subirPdf = async (blob: Blob): Promise<string> => {
    const formData = new FormData()
    formData.append('file', blob, 'informe.pdf')
    formData.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    if (!data.secure_url) throw new Error('No se pudo subir el PDF: ' + JSON.stringify(data))
    return data.secure_url
  }

  const handleFotosEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setSubiendoFotos(true)
    try {
      const urls = await Promise.all(Array.from(e.target.files).map(f => subirFoto(f)))
      setEditFotos(prev => [...prev, ...urls])
    } catch { alert('Error al subir fotos') }
    finally { setSubiendoFotos(false) }
  }

  const handleFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setSubiendoFotos(true)
    try {
      const urls = await Promise.all(Array.from(e.target.files).map(f => subirFoto(f)))
      setFotos(prev => [...prev, ...urls])
    } catch { alert('Error al subir fotos') }
    finally { setSubiendoFotos(false) }
  }

  const handleUsaRepuestos = (val: boolean) => {
    setUsaRepuestos(val)
    if (!val) {
      setRepuestos([])
      setObservaciones(prev => prev || 'No se utilizaron repuestos en esta visita')
    } else {
      setRepuestos([{nombre:'',cantidad:1}])
      if (observaciones === 'No se utilizaron repuestos en esta visita') setObservaciones('')
    }
  }

  const handleSubmitNuevaVisita = async () => {
    if (!centro) { alert('Por favor selecciona un centro'); return }
    if (usaRepuestos === null) { alert('Por favor indica si se utilizaron repuestos'); return }
    if (usaRepuestos && repuestos.filter(r => r.nombre.trim()).length === 0) { alert('Por favor agrega al menos un repuesto'); return }
    setGuardando(true)
    try {
      const repuestosFinal = repuestos.filter(r => r.nombre.trim()).map(r => ({ nombre: r.nombre, cantidad: parseInt(String(r.cantidad)) || 1 }))
      await addDoc(collection(db, 'visitas'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email, centro,
        fecha: Timestamp.fromDate(new Date(fecha + 'T12:00:00')),
        numeroInforme,
        repuestos: usaRepuestos ? repuestosFinal : [],
        usaRepuestos, observaciones, fotos, estado: 'Pendiente', creadoEn: Timestamp.now()
      })
      setExito(true)
      setCentro(''); setRepuestos([{nombre:'',cantidad:1}]); setObservaciones('')
      setFecha(new Date().toISOString().split('T')[0]); setUsaRepuestos(null); setFotos([])
      setNumeroInforme('')
      setTimeout(() => { setExito(false); irARevisiones('') }, 1500)
    } catch { alert('Error al guardar') }
    finally { setGuardando(false) }
  }

  const setI = (field: string, val: any) => setInforme((prev: any) => ({ ...prev, [field]: val }))

  const validarInforme = () => {
    if (!informe.cliente) return 'Selecciona un cliente'
    if (!informe.fechaInformeDia || !informe.fechaInformeMes || !informe.fechaInformeAnio) return 'Completa la fecha del informe'
    if (!informe.fechaServicioDia || !informe.fechaServicioMes || !informe.fechaServicioAnio) return 'Completa la fecha del servicio'
    if (!informe.lugarServicio) return 'Selecciona el lugar de servicio'
    if (!informe.quimico) return 'Selecciona el químico utilizado'
    if (informe.quimico === 'Cloro comercial' && (!informe.concentracionCloro || !informe.fechaExpiracionCloro)) return 'Completa los datos del cloro'
    if (informe.quimico === 'Ácido peracético' && (!informe.concentracionAcido || !informe.loteAcido || !informe.fechaVencimientoAcido)) return 'Completa los datos del ácido'
    if (!informe.cintaPresencia || !informe.cintaAusencia) return 'Selecciona las cintas reactivas'
    if (!informe.ltAguaTratada || !informe.ltQuimicoUtilizado) return 'Completa la dilución de trabajo'
    if (informe.hay2doEstanque === null) return 'Indica si hay segundo estanque'
    if (informe.hay2doEstanque && (!informe.ltAguaTratada2 || !informe.ltQuimicoUtilizado2)) return 'Completa la dilución del 2do estanque'
    if (!informe.horaInicio || !informe.tiempoEstadia || !informe.tiempoEnjuague) return 'Completa los tiempos del servicio'
    if (informe.haySalasReuso === null) return 'Indica si hay salas de reuso'
    if (informe.haySalasReuso && (!informe.monitoresPresencia || !informe.salaReparacionPresencia || !informe.monitoresAusencia || !informe.salaReparacionAusencia)) return 'Completa los puntos de muestreo'
    return null
  }

  const handleGenerarInforme = async () => {
    const error = validarInforme()
    if (error) { alert(error); return }
    setGenerandoInforme(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = {
        ...informe,
        tecnicoResponsable: 'Baldomero Urriola',
        puntosPresencia: { monitores: informe.monitoresPresencia, salaReparacion: informe.salaReparacionPresencia },
        puntosAusencia: { monitores: informe.monitoresAusencia, salaReparacion: informe.salaReparacionAusencia },
      }
      const blob = await generarPdfBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaServicioTexto = `${String(informe.fechaServicioDia).padStart(2,'0')}/${String(informe.fechaServicioMes).padStart(2,'0')}/${informe.fechaServicioAnio}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: informe.cliente, fechaServicio: fechaServicioTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      pasoActual = 'enviando correo'
      const respCorreo = await fetch('/api/enviar-informe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl, tecnicoEmail: user.email, tecnicoNombre: 'Baldomero Urriola', cliente: informe.cliente, fechaServicio: fechaServicioTexto }),
      })
      const dataCorreo = await respCorreo.json()
      if (!respCorreo.ok || dataCorreo.error) {
        alert('⚠️ Informe generado y guardado, pero error al enviar correo: ' + (dataCorreo.error || 'desconocido'))
      } else {
        setExitoInforme(true)
        setTimeout(() => setExitoInforme(false), 4000)
      }
      setInforme(informeVacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoInforme(false)
    }
  }

  const setS7 = (field: string, val: any) => setSemestral7((prev: any) => ({ ...prev, [field]: val }))

  const rr7 = semestral7.cde && semestral7.cds ? calcularRR(semestral7.cde, semestral7.cds) : null
  const rr7Fuera = rr7 !== null && rr7 < 97

  const validarSemestral7 = () => {
    if (!semestral7.diaInforme || !semestral7.mesInforme || !semestral7.anioInforme) return 'Completa la fecha del informe'
    const campos = ['m1Pre','m1Post','m1Flujo','m2Pre','m2Post','m2Flujo','m3Pre','m3Post','m3Flujo','m4Pre','m4Post','m4Flujo','cde','cds','fp','fd','pd']
    for (const campo of campos) {
      if (!semestral7[campo]) return 'Completa todos los datos de las membranas y la osmosis'
    }
    return null
  }

  const handleGenerarSemestral7 = async () => {
    const error = validarSemestral7()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral7, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral4s1oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral7.diaInforme).padStart(2,'0')}/${String(semestral7.mesInforme).padStart(2,'0')}/${semestral7.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral7(semestral7Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS10 = (field: string, val: any) => setSemestral10((prev: any) => ({ ...prev, [field]: val }))

  const rr10o1 = semestral10.o1cde && semestral10.o1cds ? calcularRR(semestral10.o1cde, semestral10.o1cds) : null
  const rr10o2 = semestral10.o2cde && semestral10.o2cds ? calcularRR(semestral10.o2cde, semestral10.o2cds) : null
  const rr10o1Fuera = rr10o1 !== null && rr10o1 < 97
  const rr10o2Fuera = rr10o2 !== null && rr10o2 < 97

  const validarSemestral10 = () => {
    if (!semestral10.diaInforme || !semestral10.mesInforme || !semestral10.anioInforme) return 'Completa la fecha del informe'
    const campos = [
      'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
      'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2m4Pre','o2m4Post','o2m4Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
    ]
    for (const campo of campos) {
      if (!semestral10[campo]) return 'Completa todos los datos de las membranas y las osmosis'
    }
    return null
  }

  const handleGenerarSemestral10 = async () => {
    const error = validarSemestral10()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral10, cliente: 'Hosp. Salvador Diálisis', tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral4s4s2oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral10.diaInforme).padStart(2,'0')}/${String(semestral10.mesInforme).padStart(2,'0')}/${semestral10.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: 'Hosp. Salvador Diálisis', fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral10(semestral10Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS9 = (field: string, val: any) => setSemestral9((prev: any) => ({ ...prev, [field]: val }))

  const rr9o1 = semestral9.o1cde && semestral9.o1cds ? calcularRR(semestral9.o1cde, semestral9.o1cds) : null
  const rr9o2 = semestral9.o2cde && semestral9.o2cds ? calcularRR(semestral9.o2cde, semestral9.o2cds) : null
  const rr9o1Fuera = rr9o1 !== null && rr9o1 < 97
  const rr9o2Fuera = rr9o2 !== null && rr9o2 < 97

  const validarSemestral9 = () => {
    if (!semestral9.diaInforme || !semestral9.mesInforme || !semestral9.anioInforme) return 'Completa la fecha del informe'
    const campos = [
      'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
      'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
    ]
    for (const campo of campos) {
      if (!semestral9[campo]) return 'Completa todos los datos de las membranas y las osmosis'
    }
    return null
  }

  const handleGenerarSemestral9 = async () => {
    const error = validarSemestral9()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral9, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral4s3s2oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral9.diaInforme).padStart(2,'0')}/${String(semestral9.mesInforme).padStart(2,'0')}/${semestral9.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral9(semestral9Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS8 = (field: string, val: any) => setSemestral8((prev: any) => ({ ...prev, [field]: val }))

  const rr8o1 = semestral8.o1cde && semestral8.o1cds ? calcularRR(semestral8.o1cde, semestral8.o1cds) : null
  const rr8o2 = semestral8.o2cde && semestral8.o2cds ? calcularRR(semestral8.o2cde, semestral8.o2cds) : null
  const rr8o1Fuera = rr8o1 !== null && rr8o1 < 97
  const rr8o2Fuera = rr8o2 !== null && rr8o2 < 97

  const validarSemestral8 = () => {
    if (!semestral8.diaInforme || !semestral8.mesInforme || !semestral8.anioInforme) return 'Completa la fecha del informe'
    const campos = [
      'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
      'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
    ]
    for (const campo of campos) {
      if (!semestral8[campo]) return 'Completa todos los datos de las membranas y las osmosis'
    }
    return null
  }

  const handleGenerarSemestral8 = async () => {
    const error = validarSemestral8()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral8, cliente: 'HCUCH Abla. y Panta Estéril', tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral4s2s2oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral8.diaInforme).padStart(2,'0')}/${String(semestral8.mesInforme).padStart(2,'0')}/${semestral8.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: 'HCUCH Abla. y Panta Estéril', fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral8(semestral8Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS2 = (field: string, val: any) => setSemestral2((prev: any) => ({ ...prev, [field]: val }))

  // RR en vivo para cada osmosis
  const rr2o1 = semestral2.o1cde && semestral2.o1cds ? calcularRR(semestral2.o1cde, semestral2.o1cds) : null
  const rr2o2 = semestral2.o2cde && semestral2.o2cds ? calcularRR(semestral2.o2cde, semestral2.o2cds) : null
  const rr2o1Fuera = rr2o1 !== null && rr2o1 < 97
  const rr2o2Fuera = rr2o2 !== null && rr2o2 < 97

  const validarSemestral2 = () => {
    if (!semestral2.diaInforme || !semestral2.mesInforme || !semestral2.anioInforme) return 'Completa la fecha del informe'
    const campos = [
      'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
      'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo',
      'o2m4Pre','o2m4Post','o2m4Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
    ]
    for (const campo of campos) {
      if (!semestral2[campo]) return 'Completa todos los datos de las membranas y las osmosis'
    }
    return null
  }

  const handleGenerarSemestral2 = async () => {
    const error = validarSemestral2()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral2, cliente: 'CD Pacifico', tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral2m4m2oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral2.diaInforme).padStart(2,'0')}/${String(semestral2.mesInforme).padStart(2,'0')}/${semestral2.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: 'CD Pacifico', fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral2(semestral2Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS6 = (field: string, val: any) => setSemestral6((prev: any) => ({ ...prev, [field]: val }))

  const rr6o1 = semestral6.o1cde && semestral6.o1cds ? calcularRR(semestral6.o1cde, semestral6.o1cds) : null
  const rr6o2 = semestral6.o2cde && semestral6.o2cds ? calcularRR(semestral6.o2cde, semestral6.o2cds) : null
  const rr6o1Fuera = rr6o1 !== null && rr6o1 < 97
  const rr6o2Fuera = rr6o2 !== null && rr6o2 < 97

  const validarSemestral6 = () => {
    if (!semestral6.diaInforme || !semestral6.mesInforme || !semestral6.anioInforme) return 'Completa la fecha del informe'
    const campos = [
      'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
      'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
    ]
    for (const campo of campos) {
      if (!semestral6[campo]) return 'Completa todos los datos de las membranas y las osmosis'
    }
    return null
  }

  const handleGenerarSemestral6 = async () => {
    const error = validarSemestral6()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral6, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral3s2s2oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral6.diaInforme).padStart(2,'0')}/${String(semestral6.mesInforme).padStart(2,'0')}/${semestral6.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral6(semestral6Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS5 = (field: string, val: any) => setSemestral5((prev: any) => ({ ...prev, [field]: val }))

  const rr5o1 = semestral5.o1cde && semestral5.o1cds ? calcularRR(semestral5.o1cde, semestral5.o1cds) : null
  const rr5o2 = semestral5.o2cde && semestral5.o2cds ? calcularRR(semestral5.o2cde, semestral5.o2cds) : null
  const rr5o1Fuera = rr5o1 !== null && rr5o1 < 97
  const rr5o2Fuera = rr5o2 !== null && rr5o2 < 97

  const validarSemestral5 = () => {
    if (!semestral5.diaInforme || !semestral5.mesInforme || !semestral5.anioInforme) return 'Completa la fecha del informe'
    const campos = [
      'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
      'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
    ]
    for (const campo of campos) {
      if (!semestral5[campo]) return 'Completa todos los datos de las membranas y las osmosis'
    }
    return null
  }

  const handleGenerarSemestral5 = async () => {
    const error = validarSemestral5()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral5, cliente: 'Ctro. Nefro. Puerto Montt', tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral3s3s2oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral5.diaInforme).padStart(2,'0')}/${String(semestral5.mesInforme).padStart(2,'0')}/${semestral5.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: 'Ctro. Nefro. Puerto Montt', fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral5(semestral5Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS4 = (field: string, val: any) => setSemestral4((prev: any) => ({ ...prev, [field]: val }))

  const rr4_1 = semestral4.cde && semestral4.cds1 ? calcularRR(semestral4.cde, semestral4.cds1) : null
  const rr4_2 = semestral4.cde && semestral4.cds2 ? calcularRR(semestral4.cde, semestral4.cds2) : null
  const rr4_1Fuera = rr4_1 !== null && rr4_1 < 97

  const validarSemestral4 = () => {
    if (!semestral4.diaInforme || !semestral4.mesInforme || !semestral4.anioInforme) return 'Completa la fecha del informe'
    const campos = ['m1Pre','m1Post','m1Flujo','m2Pre','m2Post','m2Flujo','m3Pre','m3Post','m3Flujo','cde','cds1','fp1','fd1','pd1','cds2','fp2','fd2','pd2']
    for (const campo of campos) {
      if (!semestral4[campo]) return 'Completa todos los datos de las membranas y las salidas'
    }
    return null
  }

  const handleGenerarSemestral4 = async () => {
    const error = validarSemestral4()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral4, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral3sOtro1oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral4.diaInforme).padStart(2,'0')}/${String(semestral4.mesInforme).padStart(2,'0')}/${semestral4.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral4(semestral4Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS3 = (field: string, val: any) => setSemestral3((prev: any) => ({ ...prev, [field]: val }))

  const rr3 = semestral3.cde && semestral3.cds ? calcularRR(semestral3.cde, semestral3.cds) : null
  const rr3Fuera = rr3 !== null && rr3 < 97

  const validarSemestral3 = () => {
    if (!semestral3.diaInforme || !semestral3.mesInforme || !semestral3.anioInforme) return 'Completa la fecha del informe'
    const campos = ['m1Pre','m1Post','m1Flujo','m2Pre','m2Post','m2Flujo','m3Pre','m3Post','m3Flujo','cde','cds','fp','fd','pd']
    for (const campo of campos) {
      if (!semestral3[campo]) return 'Completa todos los datos de las membranas y la osmosis'
    }
    return null
  }

  const handleGenerarSemestral3 = async () => {
    const error = validarSemestral3()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral3, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral3s1oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral3.diaInforme).padStart(2,'0')}/${String(semestral3.mesInforme).padStart(2,'0')}/${semestral3.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral3(semestral3Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS = (field: string, val: any) => setSemestral((prev: any) => ({ ...prev, [field]: val }))

  // RR calculado en vivo (o null si falta entrada/salida)
  const rrSemestral = semestral.cde1 && semestral.cds1 ? calcularRR(semestral.cde1, semestral.cds1) : null
  const rrFueraRango = rrSemestral !== null && rrSemestral < 97

  const eliminarSemestral = async (id: string) => {
    if (!confirm('¿Estás seguro que deseas eliminar este informe semestral?')) return
    await deleteDoc(doc(db, 'informes_semestrales', id))
  }

  const validarSemestral = () => {
    if (!semestral.cliente) return 'Selecciona un cliente'
    if (semestral.cliente !== 'CD Vidacare') return 'Esta configuración solo está disponible para CD Vidacare por ahora'
    if (!semestral.diaInforme || !semestral.mesInforme || !semestral.anioInforme) return 'Completa la fecha del informe'
    const campos = ['o1CondPre1','o1CondPost1','o1Flujo1','o1CondPre2','o1CondPost2','o1Flujo2','cde1','cds1','fp1','fd1','pd1']
    for (const campo of campos) {
      if (!semestral[campo]) return 'Completa todos los datos de las membranas y la osmosis'
    }
    return null
  }

  const handleGenerarSemestral = async () => {
    const error = validarSemestral()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral, tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestralBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral.diaInforme).padStart(2,'0')}/${String(semestral.mesInforme).padStart(2,'0')}/${semestral.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral(semestralVacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS11 = (field: string, val: any) => setSemestral11((prev: any) => ({ ...prev, [field]: val }))

  const rr11 = semestral11.cde && semestral11.cds ? calcularRR(semestral11.cde, semestral11.cds) : null
  const rr11Fuera = rr11 !== null && rr11 < 97

  const validarSemestral11 = () => {
    if (!semestral11.diaInforme || !semestral11.mesInforme || !semestral11.anioInforme) return 'Completa la fecha del informe'
    const campos = ['m1Pre','m1Post','m1Flujo','m2Pre','m2Post','m2Flujo','m3Pre','m3Post','m3Flujo','m4Pre','m4Post','m4Flujo','m5Pre','m5Post','m5Flujo','cde','cds','fp','fd','pd']
    for (const campo of campos) {
      if (!semestral11[campo]) return 'Completa todos los datos de las membranas y la osmosis'
    }
    return null
  }

  const handleGenerarSemestral11 = async () => {
    const error = validarSemestral11()
    if (error) { alert(error); return }
    setGenerandoSemestral(true)
    let pasoActual = 'inicio'
    try {
      pasoActual = 'generando PDF'
      const datosPdf = { ...semestral11, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
      const blob = await generarPdfSemestral5s1oBlob(datosPdf)
      pasoActual = 'subiendo PDF'
      const pdfUrl = await subirPdf(blob)
      const fechaInformeTexto = `${String(semestral11.diaInforme).padStart(2,'0')}/${String(semestral11.mesInforme).padStart(2,'0')}/${semestral11.anioInforme}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes_semestrales'), {
        uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
        cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
        tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
      })
      setExitoSemestral(true)
      setTimeout(() => setExitoSemestral(false), 4000)
      setSemestral11(semestral11Vacio)
    } catch (e: any) {
      alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoSemestral(false)
    }
  }

  const setS12 = (field: string, val: any) => setSemestral12((prev: any) => ({ ...prev, [field]: val }))

const rr12o1 = semestral12.o1cde && semestral12.o1cds ? calcularRR(semestral12.o1cde, semestral12.o1cds) : null
const rr12o2 = semestral12.o2cde && semestral12.o2cds ? calcularRR(semestral12.o2cde, semestral12.o2cds) : null
const rr12o1Fuera = rr12o1 !== null && rr12o1 < 97
const rr12o2Fuera = rr12o2 !== null && rr12o2 < 97

const validarSemestral12 = () => {
  if (!semestral12.diaInforme || !semestral12.mesInforme || !semestral12.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
    'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
  ]
  for (const campo of campos) {
    if (!semestral12[campo]) return 'Completa todos los datos de las membranas y las osmosis'
  }
  return null
}

const handleGenerarSemestral12 = async () => {
  const error = validarSemestral12()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = { ...semestral12, cliente: 'Hosp. Luis Calvo Mackenna Estéril', tecnicoResponsable: 'Baldomero Urriola' }
    const blob = await generarPdfSemestral5s2s2oBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral12.diaInforme).padStart(2,'0')}/${String(semestral12.mesInforme).padStart(2,'0')}/${semestral12.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: 'Hosp. Luis Calvo Mackenna Estéril', fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral12(semestral12Vacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

const setS13 = (field: string, val: any) => setSemestral13((prev: any) => ({ ...prev, [field]: val }))

const rr13o1 = semestral13.o1cde && semestral13.o1cds ? calcularRR(semestral13.o1cde, semestral13.o1cds) : null
const rr13o2 = semestral13.o2cde && semestral13.o2cds ? calcularRR(semestral13.o2cde, semestral13.o2cds) : null
const rr13o1Fuera = rr13o1 !== null && rr13o1 < 97
const rr13o2Fuera = rr13o2 !== null && rr13o2 < 97

const validarSemestral13 = () => {
  if (!semestral13.diaInforme || !semestral13.mesInforme || !semestral13.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
    'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
  ]
  for (const campo of campos) {
    if (!semestral13[campo]) return 'Completa todos los datos de las membranas y las osmosis'
  }
  return null
}

const handleGenerarSemestral13 = async () => {
  const error = validarSemestral13()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = { ...semestral13, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
    const blob = await generarPdfSemestral5s3s2oBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral13.diaInforme).padStart(2,'0')}/${String(semestral13.mesInforme).padStart(2,'0')}/${semestral13.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral13(semestral13Vacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

// Helper para actualizar estado
const setS6ot4m = (field: string, val: any) => setSemestral6ot4m((prev: any) => ({ ...prev, [field]: val }))

// Cálculos de RR
const rr6ot4mo1 = semestral6ot4m.o1cde && semestral6ot4m.o1cds ? calcularRR(semestral6ot4m.o1cde, semestral6ot4m.o1cds) : null
const rr6ot4mo2 = semestral6ot4m.o2cde && semestral6ot4m.o2cds ? calcularRR(semestral6ot4m.o2cde, semestral6ot4m.o2cds) : null
const rr6ot4mo1Fuera = rr6ot4mo1 !== null && rr6ot4mo1 < 97
const rr6ot4mo2Fuera = rr6ot4mo2 !== null && rr6ot4mo2 < 97

// Validación
const validarSemestral6ot4m = () => {
  if (!semestral.cliente) return 'Selecciona un cliente'
  if (!semestral6ot4m.diaInforme || !semestral6ot4m.mesInforme || !semestral6ot4m.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    // Osmosis 1: 6 membranas
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1m6Pre','o1m6Post','o1m6Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
    // Osmosis 2: 4 membranas
    'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2m4Pre','o2m4Post','o2m4Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
  ]
  for (const campo of campos) {
    if (!semestral6ot4m[campo]) return 'Completa todos los datos de las membranas y osmosis'
  }
  return null
}

// Generar PDF
const handleGenerarSemestral6ot4m = async () => {
  const error = validarSemestral6ot4m()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = { ...semestral6ot4m, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
    const blob = await generarPdfSemestral6ot4s2oBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral6ot4m.diaInforme).padStart(2,'0')}/${String(semestral6ot4m.mesInforme).padStart(2,'0')}/${semestral6ot4m.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral6ot4m(semestral6ot4mVacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

// Helper para actualizar estado
const setS5m4m = (field: string, val: any) => setSemestral5m4m((prev: any) => ({ ...prev, [field]: val }))

// Cálculos de RR
const rr5m4mo1 = semestral5m4m.o1cde && semestral5m4m.o1cds ? calcularRR(semestral5m4m.o1cde, semestral5m4m.o1cds) : null
const rr5m4mo2 = semestral5m4m.o2cde && semestral5m4m.o2cds ? calcularRR(semestral5m4m.o2cde, semestral5m4m.o2cds) : null
const rr5m4mo1Fuera = rr5m4mo1 !== null && rr5m4mo1 < 97
const rr5m4mo2Fuera = rr5m4mo2 !== null && rr5m4mo2 < 97

// Validación
const validarSemestral5m4m = () => {
  if (!semestral.cliente) return 'Selecciona un cliente'
  if (!semestral5m4m.diaInforme || !semestral5m4m.mesInforme || !semestral5m4m.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    // Osmosis 1: 5 membranas
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
    // Osmosis 2: 4 membranas
    'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2m4Pre','o2m4Post','o2m4Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
  ]
  for (const campo of campos) {
    if (!semestral5m4m[campo]) return 'Completa todos los datos de las membranas y osmosis'
  }
  return null
}

// Generar PDF
const handleGenerarSemestral5m4m = async () => {
  const error = validarSemestral5m4m()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = { ...semestral5m4m, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
    const blob = await generarPdfSemestral5m4mBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral5m4m.diaInforme).padStart(2,'0')}/${String(semestral5m4m.mesInforme).padStart(2,'0')}/${semestral5m4m.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral5m4m(semestral5m4mVacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

// Helper para actualizar estado
const setS6m6m = (field: string, val: any) => setSemestral6m6m((prev: any) => ({ ...prev, [field]: val }))

// Cálculos de RR
const rr6m6mo1 = semestral6m6m.o1cde && semestral6m6m.o1cds ? calcularRR(semestral6m6m.o1cde, semestral6m6m.o1cds) : null
const rr6m6mo2 = semestral6m6m.o2cde && semestral6m6m.o2cds ? calcularRR(semestral6m6m.o2cde, semestral6m6m.o2cds) : null
const rr6m6mo1Fuera = rr6m6mo1 !== null && rr6m6mo1 < 97
const rr6m6mo2Fuera = rr6m6mo2 !== null && rr6m6mo2 < 97

// Validación
const validarSemestral6m6m = () => {
  if (!semestral.cliente) return 'Selecciona un cliente'
  if (!semestral6m6m.diaInforme || !semestral6m6m.mesInforme || !semestral6m6m.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    // Osmosis 1: 6 membranas
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1m6Pre','o1m6Post','o1m6Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
    // Osmosis 2: 6 membranas
    'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2m4Pre','o2m4Post','o2m4Flujo','o2m5Pre','o2m5Post','o2m5Flujo','o2m6Pre','o2m6Post','o2m6Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
  ]
  for (const campo of campos) {
    if (!semestral6m6m[campo]) return 'Completa todos los datos de las membranas y osmosis'
  }
  return null
}

// Generar PDF
const handleGenerarSemestral6m6m = async () => {
  const error = validarSemestral6m6m()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = { ...semestral6m6m, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
    const blob = await generarPdfSemestral6m6m2oBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral6m6m.diaInforme).padStart(2,'0')}/${String(semestral6m6m.mesInforme).padStart(2,'0')}/${semestral6m6m.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral6m6m(semestral6m6mVacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

// Helper para actualizar estado
const setS6m = (field: string, val: any) => setSemestral6m((prev: any) => ({ ...prev, [field]: val }))

// Cálculos de RR
const rr6m = semestral6m.o1cde && semestral6m.o1cds ? calcularRR(semestral6m.o1cde, semestral6m.o1cds) : null
const rr6mFuera = rr6m !== null && rr6m < 97

// Validación
const validarSemestral6m = () => {
  if (!semestral.cliente) return 'Selecciona un cliente'
  if (!semestral6m.diaInforme || !semestral6m.mesInforme || !semestral6m.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1m6Pre','o1m6Post','o1m6Flujo','o1cde','o1cds','o1fp','o1fd','o1pd'
  ]
  for (const campo of campos) {
    if (!semestral6m[campo]) return 'Completa todos los datos de las membranas y la osmosis'
  }
  return null
}

// Generar PDF
const handleGenerarSemestral6m = async () => {
  const error = validarSemestral6m()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    // ✅ MAPEAR o1* → sin prefijo
    const datosPdf = {
      cliente: semestral.cliente,
      diaInforme: semestral6m.diaInforme,
      mesInforme: semestral6m.mesInforme,
      anioInforme: semestral6m.anioInforme,
      // Membranas
      m1Pre: semestral6m.o1m1Pre,
      m1Post: semestral6m.o1m1Post,
      m1Flujo: semestral6m.o1m1Flujo,
      m2Pre: semestral6m.o1m2Pre,
      m2Post: semestral6m.o1m2Post,
      m2Flujo: semestral6m.o1m2Flujo,
      m3Pre: semestral6m.o1m3Pre,
      m3Post: semestral6m.o1m3Post,
      m3Flujo: semestral6m.o1m3Flujo,
      m4Pre: semestral6m.o1m4Pre,
      m4Post: semestral6m.o1m4Post,
      m4Flujo: semestral6m.o1m4Flujo,
      m5Pre: semestral6m.o1m5Pre,
      m5Post: semestral6m.o1m5Post,
      m5Flujo: semestral6m.o1m5Flujo,
      m6Pre: semestral6m.o1m6Pre,
      m6Post: semestral6m.o1m6Post,
      m6Flujo: semestral6m.o1m6Flujo,
      // Osmosis
      cde: semestral6m.o1cde,
      cds: semestral6m.o1cds,
      fp: semestral6m.o1fp,
      fd: semestral6m.o1fd,
      pd: semestral6m.o1pd,
      recomendacion: semestral6m.o1recomendacion || '',
      tecnicoResponsable: 'Baldomero Urriola',
    }
    const blob = await generarPdfSemestral6s1oBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral6m.diaInforme).padStart(2,'0')}/${String(semestral6m.mesInforme).padStart(2,'0')}/${semestral6m.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral6m(semestral6mVacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

// Helper para actualizar estado
const setS6t3s = (field: string, val: any) => setSemestral6t3s((prev: any) => ({ ...prev, [field]: val }))

// Cálculos de RR
const rr6t3so1 = semestral6t3s.o1cde && semestral6t3s.o1cds ? calcularRR(semestral6t3s.o1cde, semestral6t3s.o1cds) : null
const rr6t3so2 = semestral6t3s.o2cde && semestral6t3s.o2cds ? calcularRR(semestral6t3s.o2cde, semestral6t3s.o2cds) : null
const rr6t3so1Fuera = rr6t3so1 !== null && rr6t3so1 < 97
const rr6t3so2Fuera = rr6t3so2 !== null && rr6t3so2 < 97

// Validación
const validarSemestral6t3s = () => {
  if (!semestral.cliente) return 'Selecciona un cliente'
  if (!semestral6t3s.diaInforme || !semestral6t3s.mesInforme || !semestral6t3s.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    // Osmosis 1: 6 membranas
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1m6Pre','o1m6Post','o1m6Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
    // Osmosis 2: 3 membranas
    'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
  ]
  for (const campo of campos) {
    if (!semestral6t3s[campo]) return 'Completa todos los datos de las membranas y osmosis'
  }
  return null
}

// Generar PDF
const handleGenerarSemestral6t3s = async () => {
  const error = validarSemestral6t3s()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = { ...semestral6t3s, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
    const blob = await generarPdfSemestral6t3s2oBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral6t3s.diaInforme).padStart(2,'0')}/${String(semestral6t3s.mesInforme).padStart(2,'0')}/${semestral6t3s.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral6t3s(semestral6t3sVacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

// Helper para actualizar estado
const setS6t4s = (field: string, val: any) => setSemestral6t4s((prev: any) => ({ ...prev, [field]: val }))

// Cálculos de RR
const rr6t4so1 = semestral6t4s.o1cde && semestral6t4s.o1cds ? calcularRR(semestral6t4s.o1cde, semestral6t4s.o1cds) : null
const rr6t4so2 = semestral6t4s.o2cde && semestral6t4s.o2cds ? calcularRR(semestral6t4s.o2cde, semestral6t4s.o2cds) : null
const rr6t4so1Fuera = rr6t4so1 !== null && rr6t4so1 < 97
const rr6t4so2Fuera = rr6t4so2 !== null && rr6t4so2 < 97

// Validación
const validarSemestral6t4s = () => {
  if (!semestral.cliente) return 'Selecciona un cliente'
  if (!semestral6t4s.diaInforme || !semestral6t4s.mesInforme || !semestral6t4s.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    // Osmosis 1: 6 membranas
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1m6Pre','o1m6Post','o1m6Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
    // Osmosis 2: 4 membranas
    'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2m4Pre','o2m4Post','o2m4Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
  ]
  for (const campo of campos) {
    if (!semestral6t4s[campo]) return 'Completa todos los datos de las membranas y osmosis'
  }
  return null
}

// Generar PDF
const handleGenerarSemestral6t4s = async () => {
  const error = validarSemestral6t4s()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = { ...semestral6t4s, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
    const blob = await generarPdfSemestral6t4s2oBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral6t4s.diaInforme).padStart(2,'0')}/${String(semestral6t4s.mesInforme).padStart(2,'0')}/${semestral6t4s.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral6t4s(semestral6t4sVacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

// Helper para actualizar estado
const setS7m4s = (field: string, val: any) => setSemestral7m4s((prev: any) => ({ ...prev, [field]: val }))

// Cálculos de RR
const rr7m4so1 = semestral7m4s.o1cde && semestral7m4s.o1cds ? calcularRR(semestral7m4s.o1cde, semestral7m4s.o1cds) : null
const rr7m4so2 = semestral7m4s.o2cde && semestral7m4s.o2cds ? calcularRR(semestral7m4s.o2cde, semestral7m4s.o2cds) : null
const rr7m4so1Fuera = rr7m4so1 !== null && rr7m4so1 < 97
const rr7m4so2Fuera = rr7m4so2 !== null && rr7m4so2 < 97

// Validación
const validarSemestral7m4s = () => {
  if (!semestral.cliente) return 'Selecciona un cliente'
  if (!semestral7m4s.diaInforme || !semestral7m4s.mesInforme || !semestral7m4s.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    // Osmosis 1: 7 membranas
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1m6Pre','o1m6Post','o1m6Flujo','o1m7Pre','o1m7Post','o1m7Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
    // Osmosis 2: 4 membranas
    'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2m4Pre','o2m4Post','o2m4Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
  ]
  for (const campo of campos) {
    if (!semestral7m4s[campo]) return 'Completa todos los datos de las membranas y osmosis'
  }
  return null
}

// Generar PDF
const handleGenerarSemestral7m4s = async () => {
  const error = validarSemestral7m4s()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = { ...semestral7m4s, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
    const blob = await generarPdfSemestral7m4s2oBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral7m4s.diaInforme).padStart(2,'0')}/${String(semestral7m4s.mesInforme).padStart(2,'0')}/${semestral7m4s.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral7m4s(semestral7m4sVacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

// Helper para actualizar estado
const setS8m5s = (field: string, val: any) => setSemestral8m5s((prev: any) => ({ ...prev, [field]: val }))

// Cálculos de RR
const rr8m5so1 = semestral8m5s.o1cde && semestral8m5s.o1cds ? calcularRR(semestral8m5s.o1cde, semestral8m5s.o1cds) : null
const rr8m5so2 = semestral8m5s.o2cde && semestral8m5s.o2cds ? calcularRR(semestral8m5s.o2cde, semestral8m5s.o2cds) : null
const rr8m5so1Fuera = rr8m5so1 !== null && rr8m5so1 < 97
const rr8m5so2Fuera = rr8m5so2 !== null && rr8m5so2 < 97

// Validación
const validarSemestral8m5s = () => {
  if (!semestral.cliente) return 'Selecciona un cliente'
  if (!semestral8m5s.diaInforme || !semestral8m5s.mesInforme || !semestral8m5s.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    // Osmosis 1: 8 membranas
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo','o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo','o1m5Pre','o1m5Post','o1m5Flujo','o1m6Pre','o1m6Post','o1m6Flujo','o1m7Pre','o1m7Post','o1m7Flujo','o1m8Pre','o1m8Post','o1m8Flujo','o1cde','o1cds','o1fp','o1fd','o1pd',
    // Osmosis 2: 5 membranas
    'o2m1Pre','o2m1Post','o2m1Flujo','o2m2Pre','o2m2Post','o2m2Flujo','o2m3Pre','o2m3Post','o2m3Flujo','o2m4Pre','o2m4Post','o2m4Flujo','o2m5Pre','o2m5Post','o2m5Flujo','o2cde','o2cds','o2fp','o2fd','o2pd'
  ]
  for (const campo of campos) {
    if (!semestral8m5s[campo]) return 'Completa todos los datos de las membranas y osmosis'
  }
  return null
}

// Generar PDF
const handleGenerarSemestral8m5s = async () => {
  const error = validarSemestral8m5s()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = { ...semestral8m5s, cliente: semestral.cliente, tecnicoResponsable: 'Baldomero Urriola' }
    const blob = await generarPdfSemestral8m5s2oBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral8m5s.diaInforme).padStart(2,'0')}/${String(semestral8m5s.mesInforme).padStart(2,'0')}/${semestral8m5s.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral8m5s(semestral8m5sVacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

// Helper para actualizar estado
const setS6sCarmen = (field: string, val: any) => setSemestral6sCarmen((prev: any) => ({ ...prev, [field]: val }))

// Cálculo de RR
const rr6sCarmenO1 = semestral6sCarmen.o1cde && semestral6sCarmen.o1cds ? calcularRR(semestral6sCarmen.o1cde, semestral6sCarmen.o1cds) : null
const rr6sCarmenO1Fuera = rr6sCarmenO1 !== null && rr6sCarmenO1 < 97

// Validación
const validarSemestral6sCarmen = () => {
  if (!semestral.cliente) return 'Selecciona un cliente'
  if (!semestral6sCarmen.diaInforme || !semestral6sCarmen.mesInforme || !semestral6sCarmen.anioInforme) return 'Completa la fecha del informe'
  const campos = [
    'o1m1Pre','o1m1Post','o1m1Flujo','o1m2Pre','o1m2Post','o1m2Flujo',
    'o1m3Pre','o1m3Post','o1m3Flujo','o1m4Pre','o1m4Post','o1m4Flujo',
    'o1m5Pre','o1m5Post','o1m5Flujo','o1m6Pre','o1m6Post','o1m6Flujo',
    'o1cde','o1cds','o1fp','o1fd','o1pd'
  ]
  for (const campo of campos) {
    if (!semestral6sCarmen[campo]) return 'Completa todos los datos de las membranas y osmosis'
  }
  return null
}

// Generar PDF
const handleGenerarSemestral6sCarmen = async () => {
  const error = validarSemestral6sCarmen()
  if (error) { alert(error); return }
  setGenerandoSemestral(true)
  let pasoActual = 'inicio'
  try {
    pasoActual = 'generando PDF'
    const datosPdf = {
      cliente: semestral.cliente,
      diaInforme: semestral6sCarmen.diaInforme,
      mesInforme: semestral6sCarmen.mesInforme,
      anioInforme: semestral6sCarmen.anioInforme,
      m1Pre: semestral6sCarmen.o1m1Pre, m1Post: semestral6sCarmen.o1m1Post, m1Flujo: semestral6sCarmen.o1m1Flujo,
      m2Pre: semestral6sCarmen.o1m2Pre, m2Post: semestral6sCarmen.o1m2Post, m2Flujo: semestral6sCarmen.o1m2Flujo,
      m3Pre: semestral6sCarmen.o1m3Pre, m3Post: semestral6sCarmen.o1m3Post, m3Flujo: semestral6sCarmen.o1m3Flujo,
      m4Pre: semestral6sCarmen.o1m4Pre, m4Post: semestral6sCarmen.o1m4Post, m4Flujo: semestral6sCarmen.o1m4Flujo,
      m5Pre: semestral6sCarmen.o1m5Pre, m5Post: semestral6sCarmen.o1m5Post, m5Flujo: semestral6sCarmen.o1m5Flujo,
      m6Pre: semestral6sCarmen.o1m6Pre, m6Post: semestral6sCarmen.o1m6Post, m6Flujo: semestral6sCarmen.o1m6Flujo,
      cde: semestral6sCarmen.o1cde, cds: semestral6sCarmen.o1cds,
      fp: semestral6sCarmen.o1fp, fd: semestral6sCarmen.o1fd, pd: semestral6sCarmen.o1pd,
      recomendacion: semestral6sCarmen.o1recomendacion,
      tecnicoResponsable: 'Baldomero Urriola',
    }
    const blob = await generarPdfSemestral6sCarmenBlob(datosPdf)
    pasoActual = 'subiendo PDF'
    const pdfUrl = await subirPdf(blob)
    const fechaInformeTexto = `${String(semestral6sCarmen.diaInforme).padStart(2,'0')}/${String(semestral6sCarmen.mesInforme).padStart(2,'0')}/${semestral6sCarmen.anioInforme}`
    pasoActual = 'guardando en Firestore'
    await addDoc(collection(db, 'informes_semestrales'), {
      uid: 'gerencia', tecnico: 'Baldomero Urriola', email: user.email,
      cliente: semestral.cliente, fechaInforme: fechaInformeTexto,
      tecnicoResponsable: 'Baldomero Urriola', pdfUrl, creadoEn: Timestamp.now(),
    })
    setExitoSemestral(true)
    setTimeout(() => setExitoSemestral(false), 4000)
    setSemestral6sCarmen(semestral6sCarmenVacio)
  } catch (e: any) {
    alert('Error en "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
  } finally {
    setGenerandoSemestral(false)
  }
}

  const registrosFiltrados = registros.filter(r => {
    if (filtroTecnico && r.tecnico !== filtroTecnico) return false
    if (filtroCentro && r.centro !== filtroCentro) return false
    if (filtroEstado && r.estado !== filtroEstado) return false
    if (filtroMesReg !== '') {
      const fd = r.fecha?.toDate()
      if (!fd || fd.getMonth() !== parseInt(filtroMesReg)) return false
    }
    return true
  })

  const informesFiltrados = todosInformes.filter(i => {
    if (filtroTecnicoInf && i.tecnico !== filtroTecnicoInf) return false
    if (filtroCentroInf && i.cliente !== filtroCentroInf) return false
    if (filtroMesInf) {
      const partes = i.fechaServicio?.split('/')
      if (partes && partes[1] !== filtroMesInf) return false
    }
    return true
  })

  const mesActual = new Date().getMonth()
  const mesActualYear = new Date().getFullYear()
  const registrosMes = registros.filter(r => {
    const fd = r.fecha?.toDate()
    return fd && fd.getMonth()===mesActual && fd.getFullYear()===mesActualYear
  })
  const registrosMesConRepuestos = registrosMes.filter(r => r.repuestos && r.repuestos.length > 0)
  const pendientes = registros.filter(r => r.estado === 'Pendiente').length
  const enRevision = registros.filter(r => r.estado === 'En revisión').length
  const cobrados = registros.filter(r => r.estado === 'Cobrado').length
  const totalRepuestos = registrosMes.filter(r => r.repuestos && r.repuestos.length > 0).reduce((acc, r) => {
  return acc + r.repuestos.reduce((a:number, rep:any) => a + (typeof rep === 'object' ? (rep.cantidad||1) : 1), 0)
}, 0)

  const centroCount: Record<string,number> = {}
  registros.forEach(r => { if (r.repuestos) centroCount[r.centro] = (centroCount[r.centro] || 0) + r.repuestos.length })
  const top5 = Object.entries(centroCount).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,value]) => ({name,value}))

  const now = new Date()
  const ultimos6 = Array.from({length:6}, (_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1)
    const count = registros.filter(r => {
      const fd = r.fecha?.toDate()
      return fd && fd.getMonth()===d.getMonth() && fd.getFullYear()===d.getFullYear()
    }).reduce((acc,r) => acc+(r.repuestos?.length||0),0)
    return {mes: MESES[d.getMonth()], repuestos: count}
  })

  const dataPie = [
    {name:'Pendiente', value:pendientes, color:'#ef5350'},
    {name:'En revisión', value:enRevision, color:'#ffb300'},
    {name:'Cobrado', value:cobrados, color:'#4caf50'},
  ]

  const tecnicosUnicos = [...new Set(registros.map(r => r.tecnico))].filter(Boolean)
  const centrosUnicos = [...new Set(registros.map(r => r.centro))].filter(Boolean)
  const tecnicosInformesUnicos = [...new Set(todosInformes.map(i => i.tecnico))].filter(Boolean)
  const centrosInformesUnicos = [...new Set(todosInformes.map(i => i.cliente))].filter(Boolean)
  const tecnicosSemestralesUnicos = Array.from(new Set(semestrales.map(s => s.tecnicoResponsable).filter(Boolean))).sort()
  const centrosSemestralesUnicos = Array.from(new Set(semestrales.map(s => s.cliente).filter(Boolean))).sort()

  const semestralesFiltrados = semestrales.filter(s => {
    if (filtroTecnicoSemestral && s.tecnicoResponsable !== filtroTecnicoSemestral) return false
    if (filtroCentroSemestral && s.cliente !== filtroCentroSemestral) return false
    if (filtroMesSemestral) {
      const mesDoc = String(s.fechaInforme).split('/')[1]
      if (mesDoc !== filtroMesSemestral) return false
    }
    return true
  })

  const formatRepuestos = (reps: any[]) => {
    if (!reps || reps.length === 0) return 'Sin repuestos'
    return reps.map(r => typeof r === 'object' ? `${r.nombre} (x${r.cantidad})` : r).join(', ')
  }

  const badge = (estado: string) => ({
    display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,
    background:estado==='Pendiente'?'#FCEBEB':estado==='Cobrado'?'#EAF3DE':'#FAEEDA',
    color:estado==='Pendiente'?'#c0392b':estado==='Cobrado'?'#27ae60':'#e67e22'
  })

  const navTab = (active: boolean) => ({
    flex:1, display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center',
    padding:'8px 4px', cursor:'pointer', borderTop: active?'2px solid #2196f3':'2px solid transparent',
    background: active?'#f0f7ff':'transparent', color: active?'#1a3a6b':'#888', fontSize:10, gap:2
  })

  const sheetItem: React.CSSProperties = {
    display:'flex', alignItems:'center', gap:14,
    padding:'16px 4px', borderBottom:'1px solid #f0f0f0',
    fontSize:17, cursor:'pointer'
  }

  const sheetSectionLabel: React.CSSProperties = {
    fontSize:12, fontWeight:700, color:'#888',
    letterSpacing:0.5, margin:'18px 4px 6px'
  }

  const goTab = (t: string) => { setTab(t); if(isMobile) setSidebarOpen(false) }

  const navItem = (active: boolean) => ({
    display:'flex',alignItems:'center',gap:10,padding:'12px 1rem',
    color:active?'#fff':'rgba(255,255,255,0.8)',fontSize:14,cursor:'pointer',
    background:active?'rgba(255,255,255,0.18)':'transparent',
    borderLeft:active?'3px solid #fff':'3px solid transparent',whiteSpace:'nowrap' as const,overflow:'hidden'
  })

  const subItem = (active: boolean) => ({
    display:'flex',alignItems:'center',gap:8,padding:'9px 1rem 9px 2.5rem',
    color:active?'#fff':'rgba(255,255,255,0.65)',fontSize:13,cursor:'pointer',
    background:active?'rgba(255,255,255,0.12)':'transparent',
    borderLeft:active?'3px solid #fff':'3px solid transparent'
  })

  const inputStyle = {width:'100%',padding:'10px',border:'1.5px solid #ddd',borderRadius:8,fontSize:13,color:'#222',background:'#fff'}
  const labelStyle = {fontSize:13,color:'#555',display:'block' as const,marginBottom:4,fontWeight:500}

  const kpis = [
    {label:'Repuestos utilizados este mes', value:totalRepuestos, sub:'+15% vs mes anterior', subColor:'#27ae60', icon:'/icon-repuestos.png', onClick:undefined},
    {label:'Visitas con repuestos este mes', value:registrosMesConRepuestos.length, sub:'Solo visitas con repuestos', subColor:'#2196f3', icon:'/icon-visitas.png', onClick:undefined},
    {label:'Pendientes de cobro', value:pendientes, sub:'Ver pendientes →', subColor:'#ef5350', icon:'/icon-pendientes.png', onClick:() => irARevisiones('Pendiente')},
    {label:'Repuestos cobrados este mes', value:cobrados, sub:'Ver cobrados →', subColor:'#27ae60', icon:'/icon-cobrados.png', onClick:() => irARevisiones('Cobrado')},
    {label:'Centros visitados este mes', value:[...new Set(registrosMes.map((r:any)=>r.centro))].length, sub:'Todas las visitas del mes', subColor:'#2196f3', icon:'/icon-centros.png', onClick:undefined},
  ]

  const TablaRegistros = ({lista}: {lista:any[]}) => isMobile ? (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {lista.map(r => (
        <div key={r.id} style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:13,fontWeight:600,color:'#1a1a2e'}}>{r.centro}</span>
            <span style={badge(r.estado)}>{r.estado}</span>
          </div>
          <div style={{fontSize:12,color:'#888',marginBottom:2}}>{r.fecha?.toDate().toLocaleDateString('es-CL')} · {r.tecnico}</div>
          {r.numeroInforme && <div style={{fontSize:12,color:'#1a6fa8',marginBottom:2}}>N° Informe: {r.numeroInforme}</div>}
          <div style={{fontSize:12,color:'#555',marginBottom:8}}>{formatRepuestos(r.repuestos)}</div>
          <div style={{display:'flex',gap:8}}>
            <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)} style={{flex:1,padding:'7px',border:'1px solid #ddd',borderRadius:6,fontSize:12}}>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button onClick={() => abrirModal(r)} style={{flex:1,padding:'7px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>Ver detalle</button>
            <button onClick={() => eliminarVisita(r.id)} style={{padding:'7px 10px',background:'#FCEBEB',color:'#c0392b',border:'1px solid #fce4e4',borderRadius:6,fontSize:12,cursor:'pointer'}}>🗑️</button>
          </div>
        </div>
      ))}
      {lista.length===0 && <p style={{textAlign:'center',color:'#aaa',padding:'1rem'}}>No hay registros</p>}
    </div>
  ) : (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
      <thead><tr>{['Fecha','Registrado','Centro','Técnico','N° Inf.','Repuesto(s)','Estado','Cambiar',''].map(h => (
        <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
      ))}</tr></thead>
      <tbody>
        {lista.map(r => (
          <tr key={r.id}>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',whiteSpace:'nowrap'}}>{r.fecha?.toDate().toLocaleDateString('es-CL')}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',whiteSpace:'nowrap',color:'#888'}}>{r.creadoEn?.toDate ? r.creadoEn.toDate().toLocaleDateString('es-CL') : '-'}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.centro}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.tecnico}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',color:'#1a6fa8',fontWeight:500}}>{r.numeroInforme || '-'}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',maxWidth:150}}>{formatRepuestos(r.repuestos)}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}><span style={badge(r.estado)}>{r.estado}</span></td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
              <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)} style={{padding:'3px 6px',border:'1px solid #ddd',borderRadius:6,fontSize:11,cursor:'pointer'}}>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',display:'flex',gap:4}}>
              <button onClick={() => abrirModal(r)} style={{padding:'4px 8px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>Ver</button>
              <button onClick={() => eliminarVisita(r.id)} style={{padding:'4px 8px',background:'#FCEBEB',color:'#c0392b',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>🗑️</button>
            </td>
          </tr>
        ))}
        {lista.length===0 && <tr><td colSpan={9} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay registros</td></tr>}
      </tbody>
    </table>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh',flexDirection:isMobile?'column':'row'}}>

      {fotoVisor && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setFotoVisor(null)}>
          <img src={fotoVisor} alt="foto" style={{maxWidth:'95vw',maxHeight:'90vh',borderRadius:8,objectFit:'contain'}} />
          <button onClick={() => setFotoVisor(null)} style={{position:'absolute',top:20,right:20,background:'none',border:'none',color:'#fff',fontSize:32,cursor:'pointer'}}>×</button>
        </div>
      )}

      {modalRegistro && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}} onClick={cerrarModal}>
          <div style={{background:'#fff',borderRadius:16,padding:'1.5rem',width:'100%',maxWidth:520,maxHeight:'88vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
              <div>
                <h2 style={{fontSize:17,fontWeight:700,color:'#1a1a2e',marginBottom:2}}>Detalle de visita</h2>
                <p style={{fontSize:13,color:'#888'}}>{modalRegistro.fecha?.toDate().toLocaleDateString('es-CL')}</p>
              </div>
              <button onClick={cerrarModal} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#aaa'}}>×</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:'1rem'}}>
              <div style={{background:'#f7f9fc',borderRadius:10,padding:'10px'}}>
                <div style={{fontSize:11,color:'#aaa',marginBottom:4}}>Técnico</div>
                <div style={{fontSize:13,fontWeight:600,color:'#1a1a2e'}}>{modalRegistro.tecnico}</div>
              </div>
              <div style={{background:'#f7f9fc',borderRadius:10,padding:'10px'}}>
                <div style={{fontSize:11,color:'#aaa',marginBottom:4}}>Centro</div>
                <div style={{fontSize:13,fontWeight:600,color:'#1a1a2e'}}>{modalRegistro.centro}</div>
              </div>
            </div>

            <div style={{marginBottom:'1rem'}}>
              <div style={{fontSize:12,color:'#555',marginBottom:6,fontWeight:500}}>Fecha de la visita</div>
              {editando ? (
                <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)}
                  style={{width:'100%',padding:'9px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13,color:'#222',background:'#fff'}} />
              ) : (
                <div style={{background:'#f7f9fc',borderRadius:8,padding:'10px',fontSize:13,color:'#1a1a2e'}}>
                  {modalRegistro.fecha?.toDate ? modalRegistro.fecha.toDate().toLocaleDateString('es-CL') : '-'}
                </div>
              )}
            </div>

            <div style={{marginBottom:'1rem'}}>
              <div style={{fontSize:12,color:'#555',marginBottom:6,fontWeight:500}}>Número de informe</div>
              {editando ? (
                <input value={editNumeroInforme} onChange={e => setEditNumeroInforme(e.target.value)}
                  placeholder="Ej: 001"
                  style={{width:'100%',padding:'9px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13,color:'#222',background:'#fff'}} />
              ) : (
                <div style={{background:'#f7f9fc',borderRadius:8,padding:'10px',fontSize:13,color:modalRegistro.numeroInforme?'#1a1a2e':'#aaa'}}>
                  {modalRegistro.numeroInforme || 'Sin número de informe'}
                </div>
              )}
            </div>

            <div style={{marginBottom:'1rem'}}>
              <div style={{fontSize:12,color:'#555',marginBottom:6,fontWeight:500}}>Estado</div>
              {editando ? (
                <select value={editEstado} onChange={e => setEditEstado(e.target.value)} style={{width:'100%',padding:'9px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13}}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              ) : <span style={badge(editEstado)}>{editEstado}</span>}
            </div>

            {editando && (
              <div style={{marginBottom:'1rem'}}>
                <div style={{fontSize:12,color:'#555',marginBottom:8,fontWeight:500}}>¿Se utilizaron repuestos?</div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => handleUsaRepuestosChange(true)} style={{flex:1,padding:'9px',border:`2px solid ${editUsaRepuestos?'#2196f3':'#ddd'}`,borderRadius:8,background:editUsaRepuestos?'#e8f4fd':'#fff',color:editUsaRepuestos?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:editUsaRepuestos?600:400}}>✅ Sí</button>
                  <button onClick={() => handleUsaRepuestosChange(false)} style={{flex:1,padding:'9px',border:`2px solid ${!editUsaRepuestos?'#ef5350':'#ddd'}`,borderRadius:8,background:!editUsaRepuestos?'#FCEBEB':'#fff',color:!editUsaRepuestos?'#c0392b':'#666',fontSize:13,cursor:'pointer',fontWeight:!editUsaRepuestos?600:400}}>❌ No</button>
                </div>
              </div>
            )}

            <div style={{marginBottom:'1rem'}}>
              <div style={{fontSize:12,color:'#555',marginBottom:6,fontWeight:500}}>Repuestos utilizados</div>
              {!editando ? (
                modalRegistro.repuestos && modalRegistro.repuestos.length > 0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {parsearRepuestos(modalRegistro.repuestos).map((r,i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f0f7ff',borderRadius:8,padding:'8px 12px'}}>
                        <span style={{fontSize:13}}>{r.nombre}</span>
                        <span style={{fontSize:12,color:'#1a6fa8',fontWeight:600,background:'#d0e8fb',padding:'2px 10px',borderRadius:20}}>x{r.cantidad}</span>
                      </div>
                    ))}
                  </div>
                ) : <div style={{background:'#f7f9fc',borderRadius:8,padding:'10px',fontSize:13,color:'#aaa'}}>Sin repuestos</div>
              ) : editUsaRepuestos ? (
                <div>
                  {editRepuestos.map((r,i) => (
                    <div key={i} style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
                      <input value={r.nombre} onChange={e => { const arr=[...editRepuestos]; arr[i]={...arr[i],nombre:e.target.value}; setEditRepuestos(arr) }}
                        placeholder="Nombre" style={{flex:2,padding:'8px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13,color:'#222',background:'#fff'}} />
                      <input type="number" min={1} value={r.cantidad}
                        onFocus={e => e.target.select()}
                        onChange={e => { const val=e.target.value; const arr=[...editRepuestos]; arr[i]={...arr[i],cantidad:val===''?'':parseInt(val)||1}; setEditRepuestos(arr) }}
                        onBlur={e => { if(e.target.value===''){const arr=[...editRepuestos];arr[i]={...arr[i],cantidad:1};setEditRepuestos(arr)} }}
                        style={{flex:1,padding:'8px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13,color:'#222',background:'#fff'}} />
                      <button onClick={() => setEditRepuestos(editRepuestos.filter((_,idx)=>idx!==i))} style={{width:36,height:36,border:'1px solid #ddd',borderRadius:8,background:'#fff',cursor:'pointer',color:'#888'}}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => setEditRepuestos([...editRepuestos,{nombre:'',cantidad:1}])} style={{fontSize:13,color:'#1a6fa8',background:'none',border:'none',cursor:'pointer'}}>+ Agregar</button>
                </div>
              ) : null}
            </div>

            <div style={{marginBottom:'1rem'}}>
              <div style={{fontSize:12,color:'#555',marginBottom:6,fontWeight:500}}>Observaciones</div>
              {editando ? (
                <textarea value={editObservaciones} onChange={e => setEditObservaciones(e.target.value)} rows={3}
                  style={{width:'100%',padding:'9px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13,resize:'vertical'}} />
              ) : (
                <div style={{background:'#f7f9fc',borderRadius:10,padding:'12px',fontSize:13,color:editObservaciones?'#1a1a2e':'#aaa',minHeight:50}}>
                  {editObservaciones || 'Sin observaciones'}
                </div>
              )}
            </div>

            <div style={{marginBottom:'1.25rem'}}>
              <div style={{fontSize:12,color:'#555',marginBottom:8,fontWeight:500}}>Fotografías</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {(editando ? editFotos : (modalRegistro.fotos || [])).map((url: string, i: number) => (
                  <div key={i} style={{position:'relative'}}>
                    <img src={url} alt={`foto ${i+1}`} onClick={() => setFotoVisor(url)}
                      style={{width:80,height:80,objectFit:'cover',borderRadius:8,cursor:'pointer',border:'2px solid #e0eaf2'}} />
                    {editando && (
                      <button onClick={() => setEditFotos(editFotos.filter((_,idx)=>idx!==i))}
                        style={{position:'absolute',top:-6,right:-6,width:20,height:20,borderRadius:'50%',background:'#ef5350',border:'none',color:'#fff',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                    )}
                  </div>
                ))}
                {editando && (
                  <label style={{width:80,height:80,border:'2px dashed #d0e8f5',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexDirection:'column',gap:4,color:'#1a6fa8',fontSize:11}}>
                    {subiendoFotos ? '⏳' : <>📷<span>Agregar</span></>}
                    <input type="file" accept="image/*" multiple onChange={handleFotosEdit} style={{display:'none'}} disabled={subiendoFotos} />
                  </label>
                )}
                {!editando && (!modalRegistro.fotos || modalRegistro.fotos.length === 0) && (
                  <div style={{fontSize:13,color:'#aaa'}}>Sin fotografías</div>
                )}
              </div>
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'space-between'}}>
              <button onClick={() => eliminarVisita(modalRegistro.id)} style={{padding:'9px 16px',background:'#FCEBEB',color:'#c0392b',border:'1px solid #fce4e4',borderRadius:8,fontSize:13,cursor:'pointer',fontWeight:500}}>
                🗑️ Eliminar
              </button>
              <div style={{display:'flex',gap:10}}>
                {editando ? (
                  <>
                    <button onClick={() => setEditando(false)} style={{padding:'9px 16px',border:'1px solid #ddd',borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer',color:'#666'}}>Cancelar</button>
                    <button onClick={guardarEdicion} disabled={guardandoEdit||subiendoFotos} style={{padding:'9px 16px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                      {guardandoEdit ? 'Guardando...' : '✅ Guardar'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={cerrarModal} style={{padding:'9px 16px',border:'1px solid #ddd',borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer',color:'#666'}}>Cerrar</button>
                    <button onClick={() => setEditando(true)} style={{padding:'9px 16px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>✏️ Editar</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <div style={{width:sidebarOpen?240:64,background:'linear-gradient(180deg, #1a3a6b 0%, #2196f3 100%)',display:'flex',flexDirection:'column',transition:'width 0.3s ease',overflow:'hidden',flexShrink:0}}>
          <div style={{padding:'1rem',borderBottom:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:sidebarOpen?'space-between':'center'}}>
            {sidebarOpen && (
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <img src="/logo.png" alt="SIAC" style={{width:42,height:42,borderRadius:10,objectFit:'contain',mixBlendMode:'screen'}} />
                <div>
                  <div style={{color:'#fff',fontSize:15,fontWeight:700,lineHeight:1}}>SIAC</div>
                  <div style={{color:'rgba(255,255,255,0.6)',fontSize:10}}>INGENIERÍA</div>
                </div>
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',flexDirection:'column',gap:4,alignItems:'center'}}>
              <span style={{display:'block',width:22,height:2,background:'#fff',borderRadius:2}}></span>
              <span style={{display:'block',width:22,height:2,background:'#fff',borderRadius:2}}></span>
              <span style={{display:'block',width:22,height:2,background:'#fff',borderRadius:2}}></span>
            </button>
          </div>

          <div onClick={() => goTab('inicio')} style={navItem(tab==='inicio')}>
            <span style={{fontSize:18,flexShrink:0}}>🏠</span>{sidebarOpen && <span>Inicio</span>}
          </div>

          <div onClick={() => goTab('registro')} style={navItem(tab==='registro')}>
            <span style={{fontSize:18,flexShrink:0}}>➕</span>{sidebarOpen && <span>Registrar visita</span>}
          </div>

          <div onClick={() => { setSubmenuOpen(!submenuOpen); goTab('registros'); setFiltroEstado('') }} style={navItem(tab==='registros')}>
            <span style={{fontSize:18,flexShrink:0}}>🔍</span>
            {sidebarOpen && <><span>Revisiones</span><span style={{marginLeft:'auto',fontSize:11}}>{submenuOpen?'▲':'▼'}</span></>}
          </div>
          {submenuOpen && sidebarOpen && <>
            {[{e:'',icon:'📋',label:'Todos'},{e:'Pendiente',icon:'⏳',label:'Pendientes'},{e:'En revisión',icon:'🔎',label:'En revisión'},{e:'Cobrado',icon:'✅',label:'Cobrados'}].map(item => (
              <div key={item.e} onClick={() => irARevisiones(item.e)} style={subItem(tab==='registros'&&filtroEstado===item.e)}>
                {item.icon} {item.label}
              </div>
            ))}
          </>}

          <div onClick={() => setSubmenuInformesOpen(!submenuInformesOpen)} style={navItem(tab==='informes'||tab==='misinformes'||tab==='todosinformes')}>
            <span style={{fontSize:18,flexShrink:0}}>🧪</span>
            {sidebarOpen && <><span>Informes Desinfección</span><span style={{marginLeft:'auto',fontSize:11}}>{submenuInformesOpen?'▲':'▼'}</span></>}
          </div>
          {submenuInformesOpen && sidebarOpen && <>
            <div onClick={() => goTab('informes')} style={subItem(tab==='informes')}>➕ Registrar informe</div>
            <div onClick={() => goTab('misinformes')} style={subItem(tab==='misinformes')}>📋 Mis informes</div>
            <div onClick={() => goTab('todosinformes')} style={subItem(tab==='todosinformes')}>📊 Todos los informes</div>
          </>}
          <div onClick={() => setSubmenuSemestralOpen(!submenuSemestralOpen)} style={navItem(tab==='semestral'||tab==='missemestrales'||tab==='todossemestrales')}>
        
            <span style={{fontSize:18,flexShrink:0}}>📊</span>
            {sidebarOpen && <><span>Informes Semestrales</span><span style={{marginLeft:'auto',fontSize:11}}>{submenuSemestralOpen?'▲':'▼'}</span></>}
          </div>
          {submenuSemestralOpen && sidebarOpen && <>
            <div onClick={() => goTab('semestral')} style={subItem(tab==='semestral')}>➕ Registrar informe</div>
            <div onClick={() => goTab('missemestrales')} style={subItem(tab==='missemestrales')}>📋 Mis informes</div>
            <div onClick={() => goTab('todossemestrales')} style={subItem(tab==='todossemestrales')}>📊 Todos los informes</div>
          </>}

          <div style={{marginTop:'auto',padding:'1rem',borderTop:'1px solid rgba(255,255,255,0.15)'}}>
            {sidebarOpen && (
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#fff'}}>GO</div>
                <div style={{color:'rgba(255,255,255,0.9)',fontSize:12}}>Jefe de Operaciones</div>
              </div>
            )}
            <button onClick={handleLogout} style={{width:'100%',padding:'7px',background:'transparent',border:'1px solid rgba(255,255,255,0.3)',borderRadius:8,color:'rgba(255,255,255,0.8)',fontSize:12,cursor:'pointer'}}>
              {sidebarOpen ? '← Cerrar sesión' : '←'}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE HEADER */}
      {isMobile && (
        <div style={{background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <img src="/logo.png" alt="SIAC" style={{width:36,height:36,borderRadius:8,objectFit:'contain',mixBlendMode:'screen'}} />
            <div>
              <div style={{color:'#fff',fontSize:14,fontWeight:700}}>SIAC</div>
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:10}}>Jefe de Operaciones</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:8,color:'#fff',fontSize:12,padding:'6px 12px',cursor:'pointer'}}>Salir</button>
        </div>
      )}

      {/* MAIN */}
      <div style={{flex:1,padding:isMobile?'1rem':'1.5rem',background:'#f7f9fc',overflowY:'auto',paddingBottom:isMobile?'80px':'1.5rem'}}>

        {tab === 'inicio' && <>
          <div style={{marginBottom:'1.25rem'}}>
            <h1 style={{fontSize:isMobile?20:26,fontWeight:700,color:'#1a1a2e',marginBottom:2}}>Inicio</h1>
            <p style={{color:'#888',fontSize:14}}>Resumen general de repuestos y visitas</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(5,1fr)',gap:10,marginBottom:'1.25rem'}}>
            {kpis.map((k,i) => (
              <div key={i} onClick={k.onClick} style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5',cursor:k.onClick?'pointer':'default',boxShadow:'0 1px 4px rgba(0,0,0,0.04)',display:'flex',alignItems:'center',gap:12}}>
                <img src={k.icon} alt="" style={{width:isMobile?52:42,height:isMobile?52:42,borderRadius:12,objectFit:'cover',flexShrink:0}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:'#888',marginBottom:4,lineHeight:1.3}}>{k.label}</div>
                  <div style={{fontSize:isMobile?22:26,fontWeight:700,color:'#1a1a2e'}}>{k.value}</div>
                  <div style={{fontSize:11,color:k.subColor,marginTop:2}}>{k.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {!isMobile && (
            <div style={{display:'grid',gridTemplateColumns:'1.5fr 1.5fr 1fr',gap:12,marginBottom:'1rem'}}>
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem'}}>Repuestos últimos 6 meses</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={ultimos6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{fontSize:11}} />
                    <YAxis tick={{fontSize:11}} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="repuestos" stroke="#2196f3" strokeWidth={2} dot={{fill:'#2196f3'}} name="Repuestos" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem'}}>Top 5 centros</div>
                {top5.length===0 ? <p style={{color:'#aaa',textAlign:'center',padding:'2rem 0'}}>Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={top5} layout="vertical">
                      <XAxis type="number" tick={{fontSize:10}} />
                      <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={120} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2196f3" radius={[0,4,4,0]} name="Repuestos" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem'}}>Estado de cobro</div>
                {(pendientes+enRevision+cobrados)===0 ? <p style={{color:'#aaa',textAlign:'center',padding:'2rem 0'}}>Sin datos</p> : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={dataPie} cx="50%" cy="45%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {dataPie.map((e,i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={10} wrapperStyle={{fontSize:11}} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'2fr 1fr',gap:12}}>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',fontSize:14}}>Últimos registros</div>
                <button onClick={() => irARevisiones('')} style={{fontSize:12,color:'#2196f3',background:'none',border:'none',cursor:'pointer'}}>Ver todos →</button>
              </div>
              <TablaRegistros lista={registros.slice(0,5)} />
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Pendientes importantes</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {[
                  {icon:'/icon-pendientes.png',count:pendientes,label:'repuestos pendientes',color:'#c0392b',bg:'#fff9f9',border:'#fce4e4',estado:'Pendiente'},
                  {icon:'/icon-visitas.png',count:enRevision,label:'en revisión',color:'#e67e22',bg:'#fffbf0',border:'#fde8a0',estado:'En revisión'},
                  {icon:'/icon-cobrados.png',count:cobrados,label:'cobrados',color:'#27ae60',bg:'#f0fbf8',border:'#b2dfdb',estado:'Cobrado'},
                ].map((item,i) => (
                  <div key={i} onClick={() => irARevisiones(item.estado)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px',background:item.bg,borderRadius:8,border:`1px solid ${item.border}`,cursor:'pointer'}}>
                    <img src={item.icon} alt="" style={{width:36,height:36,borderRadius:8,objectFit:'cover'}} />
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:item.color}}>{item.count} {item.label}</div>
                      <div style={{fontSize:11,color:'#888'}}>Ver detalle →</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        {tab === 'registro' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Registrar visita</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Se registrará a nombre de Baldomero Urriola</p>
          {exito && <div style={{background:'#EAF3DE',color:'#3B6D11',padding:'12px 16px',borderRadius:8,marginBottom:'1rem',fontWeight:500}}>✅ Registro guardado correctamente</div>}
          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
              <div>
                <label style={labelStyle}>Centro de diálisis</label>
                <select value={centro} onChange={e => setCentro(e.target.value)} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14}}>
                  <option value="">— Seleccionar centro —</option>
                  {CENTROS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha de visita</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14}} />
              </div>
            </div>

            <div style={{marginBottom:'1rem'}}>
              <label style={labelStyle}>Número de informe</label>
              <input type="text" value={numeroInforme} onChange={e => setNumeroInforme(e.target.value)}
                placeholder="Ej: 001"
                style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,color:'#222',background:'#fff'}} />
            </div>

            <div style={{marginBottom:'1rem'}}>
              <label style={labelStyle}>¿Se utilizaron repuestos en esta visita?</label>
              <div style={{display:'flex',gap:10}}>
                <button onClick={() => handleUsaRepuestos(true)} style={{flex:1,padding:'11px',border:`2px solid ${usaRepuestos===true?'#1a6fa8':'#ddd'}`,borderRadius:8,background:usaRepuestos===true?'#e8f4fd':'#fff',color:usaRepuestos===true?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:usaRepuestos===true?600:400}}>✅ Sí, se utilizaron</button>
                <button onClick={() => handleUsaRepuestos(false)} style={{flex:1,padding:'11px',border:`2px solid ${usaRepuestos===false?'#ef5350':'#ddd'}`,borderRadius:8,background:usaRepuestos===false?'#FCEBEB':'#fff',color:usaRepuestos===false?'#c0392b':'#666',fontSize:13,cursor:'pointer',fontWeight:usaRepuestos===false?600:400}}>❌ No se utilizaron</button>
              </div>
            </div>
            {usaRepuestos === true && (
              <div style={{marginBottom:'1rem'}}>
                <label style={labelStyle}>Repuestos utilizados</label>
                {repuestos.map((r,i) => (
                  <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                    <input type="text" value={r.nombre} onChange={e => { const rs=[...repuestos]; rs[i]={...rs[i],nombre:e.target.value}; setRepuestos(rs) }}
                      placeholder="Ej: Membrana RO" style={{flex:2,padding:'11px 10px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,color:'#222',background:'#fff'}} />
                    <input type="number" min={1} value={r.cantidad}
                      onFocus={e => e.target.select()}
                      onChange={e => { const val=e.target.value; const rs=[...repuestos]; rs[i]={...rs[i],cantidad:val===''?'':(parseInt(val)||1)}; setRepuestos(rs) }}
                      onBlur={e => { if(e.target.value===''){const rs=[...repuestos];rs[i]={...rs[i],cantidad:1};setRepuestos(rs)} }}
                      style={{width:80,padding:'11px 8px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,color:'#222',background:'#fff'}} />
                    <button onClick={() => { if(repuestos.length>1) setRepuestos(repuestos.filter((_,idx)=>idx!==i)) }} style={{width:40,height:44,border:'1px solid #ddd',borderRadius:8,background:'#fff',cursor:'pointer',color:'#888',fontSize:18}}>✕</button>
                  </div>
                ))}
                <button onClick={() => setRepuestos([...repuestos,{nombre:'',cantidad:1}])} style={{fontSize:13,color:'#1a6fa8',background:'none',border:'none',cursor:'pointer',padding:'4px 0'}}>+ Agregar otro repuesto</button>
              </div>
            )}
            {usaRepuestos !== null && (
              <div style={{marginBottom:'1rem'}}>
                <label style={labelStyle}>Observaciones</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                  placeholder="Describe el trabajo realizado..." rows={4}
                  style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}
            {usaRepuestos !== null && (
              <div style={{marginBottom:'1.25rem'}}>
                <label style={labelStyle}>📷 Fotografías <span style={{color:'#aaa',fontWeight:400}}>(opcional)</span></label>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:8}}>
                  {fotos.map((url,i) => (
                    <div key={i} style={{position:'relative'}}>
                      <img src={url} alt={`foto ${i+1}`} onClick={() => setFotoVisor(url)}
                        style={{width:80,height:80,objectFit:'cover',borderRadius:8,cursor:'pointer',border:'2px solid #e0eaf2'}} />
                      <button onClick={() => setFotos(fotos.filter((_,idx)=>idx!==i))}
                        style={{position:'absolute',top:-6,right:-6,width:20,height:20,borderRadius:'50%',background:'#ef5350',border:'none',color:'#fff',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                    </div>
                  ))}
                  <label style={{width:80,height:80,border:'2px dashed #d0e8f5',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexDirection:'column',gap:4,color:'#1a6fa8',fontSize:11}}>
                    {subiendoFotos ? '⏳ Subiendo...' : <>📷<span>Agregar foto</span></>}
                    <input type="file" accept="image/*" multiple capture="environment" onChange={handleFotos} style={{display:'none'}} disabled={subiendoFotos} />
                  </label>
                </div>
              </div>
            )}
            {usaRepuestos !== null && (
              <button onClick={handleSubmitNuevaVisita} disabled={guardando||subiendoFotos} style={{width:isMobile?'100%':'auto',padding:'12px 28px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer'}}>
                {guardando ? 'Guardando...' : 'Guardar registro'}
              </button>
            )}
          </div>
        </>}

        {tab === 'registros' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>
            {filtroEstado===''?'Todos los registros':filtroEstado==='Pendiente'?'⏳ Pendientes':filtroEstado==='En revisión'?'🔎 En revisión':'✅ Cobrados'}
          </h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Filtra y gestiona todos los registros</p>
          <div style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr 1fr',gap:10,marginBottom:'1rem'}}>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Técnico</label>
                <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los técnicos</option>
                  {tecnicosUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Centro</label>
                <select value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los centros</option>
                  {centrosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Estado</label>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los estados</option>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Mes de visita</label>
                <select value={filtroMesReg} onChange={e => setFiltroMesReg(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los meses</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={String(i)}>{m}</option>)}
                </select>
              </div>
            </div>
            <div style={{fontSize:13,color:'#888',marginBottom:'1rem'}}>{registrosFiltrados.length} registros encontrados</div>
            <TablaRegistros lista={registrosFiltrados} />
          </div>
        </>}

        {/* TAB REGISTRAR INFORME DESINFECCIÓN */}
        {tab === 'informes' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Registrar Informe de Desinfección</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Se registrará a nombre de Baldomero Urriola</p>
          {exitoInforme && <div style={{background:'#EAF3DE',color:'#3B6D11',padding:'12px 16px',borderRadius:8,marginBottom:'1rem',fontWeight:500}}>✅ Informe generado y enviado por correo correctamente</div>}

          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
            <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos generales</div>
            <div style={{marginBottom:'1rem'}}>
              <label style={labelStyle}>Cliente</label>
              <select value={informe.cliente} onChange={e => setI('cliente', e.target.value)} style={inputStyle}>
                <option value="">— Seleccionar centro —</option>
                {CENTROS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
              <div>
                <label style={labelStyle}>Fecha del Informe</label>
                <div style={{display:'flex',gap:6}}>
                  <select value={informe.fechaInformeDia} onChange={e => setI('fechaInformeDia', e.target.value)} style={{...inputStyle, width:'30%'}}>
                    <option value="">Día</option>
                    {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={informe.fechaInformeMes} onChange={e => setI('fechaInformeMes', e.target.value)} style={{...inputStyle, width:'40%'}}>
                    <option value="">Mes</option>
                    {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                  <select value={informe.fechaInformeAnio} onChange={e => setI('fechaInformeAnio', e.target.value)} style={{...inputStyle, width:'30%'}}>
                    <option value="">Año</option>
                    {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Fecha del Servicio</label>
                <div style={{display:'flex',gap:6}}>
                  <select value={informe.fechaServicioDia} onChange={e => setI('fechaServicioDia', e.target.value)} style={{...inputStyle, width:'30%'}}>
                    <option value="">Día</option>
                    {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select value={informe.fechaServicioMes} onChange={e => setI('fechaServicioMes', e.target.value)} style={{...inputStyle, width:'40%'}}>
                    <option value="">Mes</option>
                    {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                  <select value={informe.fechaServicioAnio} onChange={e => setI('fechaServicioAnio', e.target.value)} style={{...inputStyle, width:'30%'}}>
                    <option value="">Año</option>
                    {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div style={{marginBottom:'1rem'}}>
              <label style={labelStyle}>Lugar de servicio</label>
              <select value={informe.lugarServicio} onChange={e => setI('lugarServicio', e.target.value)} style={inputStyle}>
                <option value="">— Seleccionar —</option>
                {LUGARES_SERVICIO.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
            <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Químico utilizado</div>
            <div style={{display:'flex',gap:10,marginBottom:'1rem'}}>
              <button onClick={() => setI('quimico', 'Cloro comercial')} style={{flex:1,padding:'10px',border:`2px solid ${informe.quimico==='Cloro comercial'?'#1a6fa8':'#ddd'}`,borderRadius:8,background:informe.quimico==='Cloro comercial'?'#e8f4fd':'#fff',color:informe.quimico==='Cloro comercial'?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:informe.quimico==='Cloro comercial'?600:400}}>Cloro comercial</button>
              <button onClick={() => setI('quimico', 'Ácido peracético')} style={{flex:1,padding:'10px',border:`2px solid ${informe.quimico==='Ácido peracético'?'#1a6fa8':'#ddd'}`,borderRadius:8,background:informe.quimico==='Ácido peracético'?'#e8f4fd':'#fff',color:informe.quimico==='Ácido peracético'?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:informe.quimico==='Ácido peracético'?600:400}}>Ácido peracético</button>
            </div>
            {informe.quimico === 'Cloro comercial' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                <div>
                  <label style={labelStyle}>Concentración del cloro (g/l)</label>
                  <input type="number" placeholder="Ej: 50" value={informe.concentracionCloro} onChange={e => setI('concentracionCloro', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fecha de expiración (MM/AAAA)</label>
                  <input type="text" placeholder="Ej: 12/2026" value={informe.fechaExpiracionCloro} onChange={e => setI('fechaExpiracionCloro', e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}
            {informe.quimico === 'Ácido peracético' && (
              <>
                <div style={{background:'#f7f9fc',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#888',marginBottom:'1rem'}}>
                  Referencia: 50 g/l - 5% / 100 g/l - 10% / 150 g/l - 15%
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                  <div>
                    <label style={labelStyle}>Concentración del ácido (g/l)</label>
                    <input type="number" placeholder="Ej: 50" value={informe.concentracionAcido} onChange={e => setI('concentracionAcido', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Lote del ácido</label>
                    <input type="text" value={informe.loteAcido} onChange={e => setI('loteAcido', e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div style={{marginTop:'1rem'}}>
                  <label style={labelStyle}>Fecha de vencimiento (MM/AAAA)</label>
                  <input type="text" placeholder="Ej: 06/2027" value={informe.fechaVencimientoAcido} onChange={e => setI('fechaVencimientoAcido', e.target.value)} style={inputStyle} />
                </div>
              </>
            )}
          </div>

          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
            <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Cintas reactivas</div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem'}}>
              <div>
                <label style={labelStyle}>Cinta Reactiva Presencia</label>
                <select value={informe.cintaPresencia} onChange={e => setI('cintaPresencia', e.target.value)} style={inputStyle}>
                  <option value="">— Seleccionar —</option>
                  {CINTAS_REACTIVAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Cinta Reactiva Ausencia</label>
                <select value={informe.cintaAusencia} onChange={e => setI('cintaAusencia', e.target.value)} style={inputStyle}>
                  <option value="">— Seleccionar —</option>
                  {CINTAS_REACTIVAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
            <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Dilución de trabajo</div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
              <div>
                <label style={labelStyle}>Lt. agua tratada</label>
                <input type="text" placeholder="Ej: 600" value={informe.ltAguaTratada} onChange={e => setI('ltAguaTratada', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Lt. químico utilizado</label>
                <input type="text" placeholder="Ej: 12" value={informe.ltQuimicoUtilizado} onChange={e => setI('ltQuimicoUtilizado', e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{marginBottom:'1rem'}}>
              <label style={labelStyle}>¿Hay segundo estanque?</label>
              <div style={{display:'flex',gap:10}}>
                <button onClick={() => setI('hay2doEstanque', true)} style={{flex:1,padding:'10px',border:`2px solid ${informe.hay2doEstanque===true?'#1a6fa8':'#ddd'}`,borderRadius:8,background:informe.hay2doEstanque===true?'#e8f4fd':'#fff',color:informe.hay2doEstanque===true?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:informe.hay2doEstanque===true?600:400}}>✅ Sí</button>
                <button onClick={() => setI('hay2doEstanque', false)} style={{flex:1,padding:'10px',border:`2px solid ${informe.hay2doEstanque===false?'#ef5350':'#ddd'}`,borderRadius:8,background:informe.hay2doEstanque===false?'#FCEBEB':'#fff',color:informe.hay2doEstanque===false?'#c0392b':'#666',fontSize:13,cursor:'pointer',fontWeight:informe.hay2doEstanque===false?600:400}}>❌ No</button>
              </div>
            </div>
            {informe.hay2doEstanque === true && (
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem'}}>
                <div>
                  <label style={labelStyle}>Lt. agua tratada (2do estanque)</label>
                  <input type="text" value={informe.ltAguaTratada2} onChange={e => setI('ltAguaTratada2', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Lt. químico utilizado (2do estanque)</label>
                  <input type="text" value={informe.ltQuimicoUtilizado2} onChange={e => setI('ltQuimicoUtilizado2', e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}
          </div>

          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
            <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Tiempos del servicio</div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
              <div>
                <label style={labelStyle}>Hora de inicio</label>
                <input type="time" value={informe.horaInicio} onChange={e => setI('horaInicio', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tiempo estadía (min)</label>
                <input type="number" value={informe.tiempoEstadia} onChange={e => setI('tiempoEstadia', e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tiempo enjuague (min)</label>
                <input type="number" value={informe.tiempoEnjuague} onChange={e => setI('tiempoEnjuague', e.target.value)} style={inputStyle} />
              </div>
            </div>
            {informe.horaInicio && informe.tiempoEstadia && informe.tiempoEnjuague && (
              <p style={{fontSize:12,color:'#1a6fa8',marginTop:8}}>Hora de término calculada automáticamente.</p>
            )}
          </div>

          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
            <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Salas de reuso</div>
            <div style={{marginBottom:'1rem'}}>
              <label style={labelStyle}>¿Hay salas de reuso?</label>
              <div style={{display:'flex',gap:10}}>
                <button onClick={() => setI('haySalasReuso', true)} style={{flex:1,padding:'10px',border:`2px solid ${informe.haySalasReuso===true?'#1a6fa8':'#ddd'}`,borderRadius:8,background:informe.haySalasReuso===true?'#e8f4fd':'#fff',color:informe.haySalasReuso===true?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:informe.haySalasReuso===true?600:400}}>✅ Sí</button>
                <button onClick={() => setI('haySalasReuso', false)} style={{flex:1,padding:'10px',border:`2px solid ${informe.haySalasReuso===false?'#ef5350':'#ddd'}`,borderRadius:8,background:informe.haySalasReuso===false?'#FCEBEB':'#fff',color:informe.haySalasReuso===false?'#c0392b':'#666',fontSize:13,cursor:'pointer',fontWeight:informe.haySalasReuso===false?600:400}}>❌ No</button>
              </div>
            </div>
            {informe.haySalasReuso === true && (
              <>
                <div style={{marginBottom:'1rem'}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#1a3a6b',marginBottom:8}}>Puntos de muestreo - Presencia del químico</div>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem'}}>
                    <div>
                      <label style={labelStyle}>Válvulas monitores N° (presencia) — formato x,y,z</label>
                      <input type="text" placeholder="Ej: 1,24" value={informe.monitoresPresencia} onChange={e => setI('monitoresPresencia', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>N° sala de reparación (presencia) — formato x,y,z</label>
                      <input type="text" placeholder="Ej: 1,2" value={informe.salaReparacionPresencia} onChange={e => setI('salaReparacionPresencia', e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'#1a3a6b',marginBottom:8}}>Puntos de muestreo - Ausencia del químico</div>
                  <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem'}}>
                    <div>
                      <label style={labelStyle}>Válvulas monitores N° (ausencia) — formato x,y,z</label>
                      <input type="text" placeholder="Ej: 1,24" value={informe.monitoresAusencia} onChange={e => setI('monitoresAusencia', e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>N° sala de reparación (ausencia) — formato x,y,z</label>
                      <input type="text" placeholder="Ej: 1,2" value={informe.salaReparacionAusencia} onChange={e => setI('salaReparacionAusencia', e.target.value)} style={inputStyle} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <button onClick={handleGenerarInforme} disabled={generandoInforme} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
            {generandoInforme ? '⏳ Generando informe...' : '📄 Generar y enviar informe'}
          </button>
        </>}

        {/* TAB MIS INFORMES GERENCIA */}
        {tab === 'misinformes' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Mis informes</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Informes generados por gerencia</p>
          <div style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5'}}>
            <div style={{fontSize:13,color:'#888',marginBottom:'1rem'}}>{misInformesG.length} informes generados</div>
            {isMobile ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {misInformesG.map(inf => (
                  <div key={inf.id} style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1a1a2e',marginBottom:4}}>{inf.cliente}</div>
                    <div style={{fontSize:12,color:'#888',marginBottom:8}}>{inf.fechaServicio}</div>
                    <div style={{display:'flex',gap:8}}>
                      <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{flex:1,display:'block',textAlign:'center',padding:'7px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:12,textDecoration:'none'}}>📥 Descargar</a>
                      <button onClick={() => eliminarInforme(inf.id)} style={{padding:'7px 12px',background:'#FCEBEB',color:'#c0392b',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>🗑️</button>
                    </div>
                  </div>
                ))}
                {misInformesG.length===0 && <p style={{textAlign:'center',color:'#aaa',padding:'1rem'}}>No hay informes generados aún</p>}
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Cliente','Fecha servicio','Técnico','',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {misInformesG.map(inf => (
                    <tr key={inf.id}>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.cliente}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.fechaServicio}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.tecnicoResponsable}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{padding:'4px 10px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:11,textDecoration:'none'}}>📥 Descargar</a>
                      </td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <button onClick={() => eliminarInforme(inf.id)} style={{padding:'4px 10px',background:'#FCEBEB',color:'#c0392b',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>🗑️ Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {misInformesG.length===0 && <tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay informes generados aún</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>}

        {/* TAB TODOS LOS INFORMES */}
        {tab === 'todosinformes' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Todos los informes</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Informes de desinfección de todos los técnicos</p>
          <div style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:10,marginBottom:'1rem'}}>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Técnico</label>
                <select value={filtroTecnicoInf} onChange={e => setFiltroTecnicoInf(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los técnicos</option>
                  {tecnicosInformesUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Centro</label>
                <select value={filtroCentroInf} onChange={e => setFiltroCentroInf(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los centros</option>
                  {centrosInformesUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Mes</label>
                <select value={filtroMesInf} onChange={e => setFiltroMesInf(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los meses</option>
                  {Array.from({length:12},(_,i) => (
                    <option key={i+1} value={String(i+1).padStart(2,'0')}>{MESES_NOMBRE[i]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{fontSize:13,color:'#888',marginBottom:'1rem'}}>{informesFiltrados.length} informes encontrados</div>
            {isMobile ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {informesFiltrados.map(inf => (
                  <div key={inf.id} style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1a1a2e',marginBottom:4}}>{inf.cliente}</div>
                    <div style={{fontSize:12,color:'#888',marginBottom:8}}>{inf.fechaServicio} · {inf.tecnico}</div>
                    <div style={{display:'flex',gap:8}}>
                      <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{flex:1,display:'block',textAlign:'center',padding:'7px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:12,textDecoration:'none'}}>📥 Descargar</a>
                      <button onClick={() => eliminarInforme(inf.id)} style={{padding:'7px 12px',background:'#FCEBEB',color:'#c0392b',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>🗑️</button>
                    </div>
                  </div>
                ))}
                {informesFiltrados.length===0 && <p style={{textAlign:'center',color:'#aaa',padding:'1rem'}}>No hay informes con esos filtros</p>}
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Cliente','Fecha servicio','Técnico','',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {informesFiltrados.map(inf => (
                    <tr key={inf.id}>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.cliente}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.fechaServicio}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.tecnico}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{padding:'4px 10px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:11,textDecoration:'none'}}>📥 Descargar</a>
                      </td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <button onClick={() => eliminarInforme(inf.id)} style={{padding:'4px 10px',background:'#FCEBEB',color:'#c0392b',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>🗑️ Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {informesFiltrados.length===0 && <tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay informes con esos filtros</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>}
        {/* TAB REGISTRAR INFORME SEMESTRAL */}
        {tab === 'semestral' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Registrar Informe Semestral</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Mantención de membranas · Se registrará a nombre de Baldomero Urriola</p>
          {exitoSemestral && <div style={{background:'#EAF3DE',color:'#3B6D11',padding:'12px 16px',borderRadius:8,marginBottom:'1rem',fontWeight:500}}>✅ Informe semestral generado correctamente</div>}

          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
            <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos generales</div>
            <div style={{marginBottom:'1rem'}}>
              <label style={labelStyle}>Cliente</label>
              <select value={semestral.cliente} onChange={e => setS('cliente', e.target.value)} style={inputStyle}>
                <option value="">— Seleccionar centro —</option>
                {CENTROS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {semestral.cliente && !CENTROS_YA_IMPLEMENTADOS.includes(semestral.cliente) && (
          
              <div style={{background:'#FAEEDA',color:'#854F0B',padding:'12px 16px',borderRadius:8,fontSize:13}}>
                ⚠️ Para este centro no esta permitido generar un informe semestral.
              </div>
            )}
          </div>

          {semestral.cliente === 'CD Vidacare' && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral.diaInforme} onChange={e => setS('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral.mesInforme} onChange={e => setS('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral.anioInforme} onChange={e => setS('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° 1</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div>
                  <label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                  <input type="number" value={semestral.o1CondPre1} onChange={e => setS('o1CondPre1', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                  <input type="number" value={semestral.o1CondPost1} onChange={e => setS('o1CondPost1', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Flujo post lavado (Lpm)</label>
                  <input type="number" value={semestral.o1Flujo1} onChange={e => setS('o1Flujo1', e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° 2</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div>
                  <label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                  <input type="number" value={semestral.o1CondPre2} onChange={e => setS('o1CondPre2', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                  <input type="number" value={semestral.o1CondPost2} onChange={e => setS('o1CondPost2', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Flujo post lavado (Lpm)</label>
                  <input type="number" value={semestral.o1Flujo2} onChange={e => setS('o1Flujo2', e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div>
                  <label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral.cde1} onChange={e => setS('cde1', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral.cds1} onChange={e => setS('cds1', e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div>
                  <label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral.fp1} onChange={e => setS('fp1', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral.fd1} onChange={e => setS('fd1', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral.pd1} onChange={e => setS('pd1', e.target.value)} style={inputStyle} />
                </div>
              </div>

              {rrSemestral !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rrFueraRango?'#FCEBEB':'#EAF3DE',color:rrFueraRango?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR calculado: {(Math.round(rrSemestral*100)/100).toString().replace('.',',')}%
                  {rrFueraRango ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros normales'}
                </div>
              )}
            </div>

            {rrFueraRango && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación <span style={{color:'#aaa',fontWeight:400}}>(el RR está fuera de rango)</span></div>
                <textarea value={semestral.recomendacion} onChange={e => setS('recomendacion', e.target.value)}
                  placeholder="Escribe la recomendación. Si lo dejas vacío, el informe dirá 'Recomendación pendiente.'"
                  rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {semestral.cliente === 'Ctro. Nefro. Puerto Montt' && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral5.diaInforme} onChange={e => setS5('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral5.mesInforme} onChange={e => setS5('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral5.anioInforme} onChange={e => setS5('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (3 membranas)</div>

            {[1,2,3].map(n => (
              <div key={'o1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral5['o1m'+n+'Pre']} onChange={e => setS5('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral5['o1m'+n+'Post']} onChange={e => setS5('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral5['o1m'+n+'Flujo']} onChange={e => setS5('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral5.o1cde} onChange={e => setS5('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral5.o1cds} onChange={e => setS5('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral5.o1fp} onChange={e => setS5('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral5.o1fd} onChange={e => setS5('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral5.o1pd} onChange={e => setS5('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr5o1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr5o1Fuera?'#FCEBEB':'#EAF3DE',color:rr5o1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr5o1*100)/100).toString().replace('.',',')}%{rr5o1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr5o1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral5.o1recomendacion} onChange={e => setS5('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 · agua blanda (3 membranas)</div>

            {[1,2,3].map(n => (
              <div key={'o2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral5['o2m'+n+'Pre']} onChange={e => setS5('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral5['o2m'+n+'Post']} onChange={e => setS5('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral5['o2m'+n+'Flujo']} onChange={e => setS5('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral5.o2cde} onChange={e => setS5('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral5.o2cds} onChange={e => setS5('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral5.o2fp} onChange={e => setS5('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral5.o2fd} onChange={e => setS5('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral5.o2pd} onChange={e => setS5('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr5o2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr5o2Fuera?'#FCEBEB':'#EAF3DE',color:rr5o2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr5o2*100)/100).toString().replace('.',',')}%{rr5o2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr5o2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral5.o2recomendacion} onChange={e => setS5('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral5} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          
          {CENTROS_3S_OTRO.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral4.diaInforme} onChange={e => setS4('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral4.mesInforme} onChange={e => setS4('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral4.anioInforme} onChange={e => setS4('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Membranas (3)</div>

            {[1,2,3].map(n => (
              <div key={'m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral4['m'+n+'Pre']} onChange={e => setS4('m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral4['m'+n+'Post']} onChange={e => setS4('m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral4['m'+n+'Flujo']} onChange={e => setS4('m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Conductividad de entrada</div>
              <div style={{maxWidth:300}}>
                <label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                <input type="number" value={semestral4.cde} onChange={e => setS4('cde', e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Salida · Primer paso</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral4.cds1} onChange={e => setS4('cds1', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral4.fp1} onChange={e => setS4('fp1', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral4.fd1} onChange={e => setS4('fd1', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral4.pd1} onChange={e => setS4('pd1', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr4_1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr4_1Fuera?'#FCEBEB':'#EAF3DE',color:rr4_1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Primer paso: {(Math.round(rr4_1*100)/100).toString().replace('.',',')}%{rr4_1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Salida · Segundo paso (agua blanda)</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral4.cds2} onChange={e => setS4('cds2', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral4.fp2} onChange={e => setS4('fp2', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral4.fd2} onChange={e => setS4('fd2', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral4.pd2} onChange={e => setS4('pd2', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr4_2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:'#EAF3DE',color:'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Segundo paso: {(Math.round(rr4_2*100)/100).toString().replace('.',',')}%
                </div>
              )}
            </div>

            {rr4_1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación <span style={{color:'#aaa',fontWeight:400}}>(RR primer paso fuera de rango)</span></div>
                <textarea value={semestral4.recomendacion} onChange={e => setS4('recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral4} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {semestral.cliente === 'CD Pacifico' && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral2.diaInforme} onChange={e => setS2('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral2.mesInforme} onChange={e => setS2('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral2.anioInforme} onChange={e => setS2('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (2 membranas)</div>

            {[1,2].map(n => (
              <div key={'o1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral2['o1m'+n+'Pre']} onChange={e => setS2('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral2['o1m'+n+'Post']} onChange={e => setS2('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral2['o1m'+n+'Flujo']} onChange={e => setS2('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral2.o1cde} onChange={e => setS2('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral2.o1cds} onChange={e => setS2('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral2.o1fp} onChange={e => setS2('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral2.o1fd} onChange={e => setS2('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral2.o1pd} onChange={e => setS2('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr2o1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr2o1Fuera?'#FCEBEB':'#EAF3DE',color:rr2o1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr2o1*100)/100).toString().replace('.',',')}%{rr2o1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr2o1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral2.o1recomendacion} onChange={e => setS2('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 · agua blanda (4 membranas)</div>

            {[1,2,3,4].map(n => (
              <div key={'o2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral2['o2m'+n+'Pre']} onChange={e => setS2('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral2['o2m'+n+'Post']} onChange={e => setS2('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral2['o2m'+n+'Flujo']} onChange={e => setS2('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral2.o2cde} onChange={e => setS2('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral2.o2cds} onChange={e => setS2('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral2.o2fp} onChange={e => setS2('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral2.o2fd} onChange={e => setS2('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral2.o2pd} onChange={e => setS2('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr2o2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr2o2Fuera?'#FCEBEB':'#EAF3DE',color:rr2o2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr2o2*100)/100).toString().replace('.',',')}%{rr2o2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr2o2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral2.o2recomendacion} onChange={e => setS2('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral2} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_3S1O.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral3.diaInforme} onChange={e => setS3('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral3.mesInforme} onChange={e => setS3('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral3.anioInforme} onChange={e => setS3('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (3 membranas)</div>

            {[1,2,3].map(n => (
              <div key={'m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral3['m'+n+'Pre']} onChange={e => setS3('m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral3['m'+n+'Post']} onChange={e => setS3('m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral3['m'+n+'Flujo']} onChange={e => setS3('m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral3.cde} onChange={e => setS3('cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral3.cds} onChange={e => setS3('cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral3.fp} onChange={e => setS3('fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral3.fd} onChange={e => setS3('fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral3.pd} onChange={e => setS3('pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr3 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr3Fuera?'#FCEBEB':'#EAF3DE',color:rr3Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR calculado: {(Math.round(rr3*100)/100).toString().replace('.',',')}%{rr3Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>

            {rr3Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral3.recomendacion} onChange={e => setS3('recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}
              <div style={{marginBottom:'1rem'}}>
                <label style={labelStyle}>¿Hay observaciones?</label>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={() => setS3('hayObservaciones', true)} style={{flex:1,padding:'10px',border:`2px solid ${semestral3.hayObservaciones===true?'#1a6fa8':'#ddd'}`,borderRadius:8,background:semestral3.hayObservaciones===true?'#e8f4fd':'#fff',color:semestral3.hayObservaciones===true?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:semestral3.hayObservaciones===true?600:400}}>✅ Sí</button>
                  <button onClick={() => { setS3('hayObservaciones', false); setS3('observaciones', '') }} style={{flex:1,padding:'10px',border:`2px solid ${semestral3.hayObservaciones===false?'#ef5350':'#ddd'}`,borderRadius:8,background:semestral3.hayObservaciones===false?'#FCEBEB':'#fff',color:semestral3.hayObservaciones===false?'#c0392b':'#666',fontSize:13,cursor:'pointer',fontWeight:semestral3.hayObservaciones===false?600:400}}>❌ No</button>
                </div>
                {semestral3.hayObservaciones === true && (
                  <textarea
                    value={semestral3.observaciones}
                    onChange={e => setS3('observaciones', e.target.value)}
                    placeholder="Escribe la observación..."
                    rows={3}
                    style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical',marginTop:'0.75rem'}}
                  />
                )}
              </div>
      
            <button onClick={handleGenerarSemestral3} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}

          {CENTROS_3S_2S.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral6.diaInforme} onChange={e => setS6('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral6.mesInforme} onChange={e => setS6('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral6.anioInforme} onChange={e => setS6('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (3 membranas)</div>

            {[1,2,3].map(n => (
              <div key={'s6o1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6['o1m'+n+'Pre']} onChange={e => setS6('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6['o1m'+n+'Post']} onChange={e => setS6('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6['o1m'+n+'Flujo']} onChange={e => setS6('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6.o1cde} onChange={e => setS6('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6.o1cds} onChange={e => setS6('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6.o1fp} onChange={e => setS6('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6.o1fd} onChange={e => setS6('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6.o1pd} onChange={e => setS6('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6o1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6o1Fuera?'#FCEBEB':'#EAF3DE',color:rr6o1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr6o1*100)/100).toString().replace('.',',')}%{rr6o1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6o1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6.o1recomendacion} onChange={e => setS6('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 (2 membranas)</div>

            {[1,2].map(n => (
              <div key={'s6o2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6['o2m'+n+'Pre']} onChange={e => setS6('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6['o2m'+n+'Post']} onChange={e => setS6('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6['o2m'+n+'Flujo']} onChange={e => setS6('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6.o2cde} onChange={e => setS6('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6.o2cds} onChange={e => setS6('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6.o2fp} onChange={e => setS6('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6.o2fd} onChange={e => setS6('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6.o2pd} onChange={e => setS6('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6o2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6o2Fuera?'#FCEBEB':'#EAF3DE',color:rr6o2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr6o2*100)/100).toString().replace('.',',')}%{rr6o2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6o2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6.o2recomendacion} onChange={e => setS6('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral6} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}

        {CENTROS_4S1O.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral7.diaInforme} onChange={e => setS7('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral7.mesInforme} onChange={e => setS7('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral7.anioInforme} onChange={e => setS7('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (4 membranas)</div>

            {[1,2,3,4].map(n => (
              <div key={'s7m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral7['m'+n+'Pre']} onChange={e => setS7('m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral7['m'+n+'Post']} onChange={e => setS7('m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral7['m'+n+'Flujo']} onChange={e => setS7('m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral7.cde} onChange={e => setS7('cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral7.cds} onChange={e => setS7('cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral7.fp} onChange={e => setS7('fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral7.fd} onChange={e => setS7('fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral7.pd} onChange={e => setS7('pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr7 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr7Fuera?'#FCEBEB':'#EAF3DE',color:rr7Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR calculado: {(Math.round(rr7*100)/100).toString().replace('.',',')}%{rr7Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>

            {rr7Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral7.recomendacion} onChange={e => setS7('recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral7} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {semestral.cliente === 'HCUCH Abla. y Panta Estéril' && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral8.diaInforme} onChange={e => setS8('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral8.mesInforme} onChange={e => setS8('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral8.anioInforme} onChange={e => setS8('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (4 membranas)</div>

            {[1,2,3,4].map(n => (
              <div key={'s8o1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral8['o1m'+n+'Pre']} onChange={e => setS8('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral8['o1m'+n+'Post']} onChange={e => setS8('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral8['o1m'+n+'Flujo']} onChange={e => setS8('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral8.o1cde} onChange={e => setS8('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral8.o1cds} onChange={e => setS8('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral8.o1fp} onChange={e => setS8('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral8.o1fd} onChange={e => setS8('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral8.o1pd} onChange={e => setS8('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr8o1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr8o1Fuera?'#FCEBEB':'#EAF3DE',color:rr8o1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr8o1*100)/100).toString().replace('.',',')}%{rr8o1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr8o1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral8.o1recomendacion} onChange={e => setS8('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 (2 membranas)</div>

            {[1,2].map(n => (
              <div key={'s8o2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral8['o2m'+n+'Pre']} onChange={e => setS8('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral8['o2m'+n+'Post']} onChange={e => setS8('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral8['o2m'+n+'Flujo']} onChange={e => setS8('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral8.o2cde} onChange={e => setS8('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral8.o2cds} onChange={e => setS8('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral8.o2fp} onChange={e => setS8('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral8.o2fd} onChange={e => setS8('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral8.o2pd} onChange={e => setS8('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr8o2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr8o2Fuera?'#FCEBEB':'#EAF3DE',color:rr8o2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr8o2*100)/100).toString().replace('.',',')}%{rr8o2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr8o2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral8.o2recomendacion} onChange={e => setS8('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral8} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_4S_3S.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral9.diaInforme} onChange={e => setS9('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral9.mesInforme} onChange={e => setS9('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral9.anioInforme} onChange={e => setS9('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (4 membranas)</div>

            {[1,2,3,4].map(n => (
              <div key={'s9o1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral9['o1m'+n+'Pre']} onChange={e => setS9('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral9['o1m'+n+'Post']} onChange={e => setS9('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral9['o1m'+n+'Flujo']} onChange={e => setS9('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral9.o1cde} onChange={e => setS9('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral9.o1cds} onChange={e => setS9('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral9.o1fp} onChange={e => setS9('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral9.o1fd} onChange={e => setS9('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral9.o1pd} onChange={e => setS9('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr9o1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr9o1Fuera?'#FCEBEB':'#EAF3DE',color:rr9o1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr9o1*100)/100).toString().replace('.',',')}%{rr9o1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr9o1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral9.o1recomendacion} onChange={e => setS9('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 (3 membranas)</div>

            {[1,2,3].map(n => (
              <div key={'s9o2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral9['o2m'+n+'Pre']} onChange={e => setS9('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral9['o2m'+n+'Post']} onChange={e => setS9('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral9['o2m'+n+'Flujo']} onChange={e => setS9('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral9.o2cde} onChange={e => setS9('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral9.o2cds} onChange={e => setS9('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral9.o2fp} onChange={e => setS9('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral9.o2fd} onChange={e => setS9('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral9.o2pd} onChange={e => setS9('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr9o2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr9o2Fuera?'#FCEBEB':'#EAF3DE',color:rr9o2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr9o2*100)/100).toString().replace('.',',')}%{rr9o2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr9o2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral9.o2recomendacion} onChange={e => setS9('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral9} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {semestral.cliente === 'Hosp. Salvador Diálisis' && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral10.diaInforme} onChange={e => setS10('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral10.mesInforme} onChange={e => setS10('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral10.anioInforme} onChange={e => setS10('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (4 membranas)</div>

            {[1,2,3,4].map(n => (
              <div key={'s10o1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral10['o1m'+n+'Pre']} onChange={e => setS10('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral10['o1m'+n+'Post']} onChange={e => setS10('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral10['o1m'+n+'Flujo']} onChange={e => setS10('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral10.o1cde} onChange={e => setS10('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral10.o1cds} onChange={e => setS10('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral10.o1fp} onChange={e => setS10('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral10.o1fd} onChange={e => setS10('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral10.o1pd} onChange={e => setS10('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr10o1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr10o1Fuera?'#FCEBEB':'#EAF3DE',color:rr10o1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr10o1*100)/100).toString().replace('.',',')}%{rr10o1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr10o1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral10.o1recomendacion} onChange={e => setS10('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 (4 membranas)</div>

            {[1,2,3,4].map(n => (
              <div key={'s10o2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral10['o2m'+n+'Pre']} onChange={e => setS10('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral10['o2m'+n+'Post']} onChange={e => setS10('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral10['o2m'+n+'Flujo']} onChange={e => setS10('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral10.o2cde} onChange={e => setS10('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral10.o2cds} onChange={e => setS10('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral10.o2fp} onChange={e => setS10('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral10.o2fd} onChange={e => setS10('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral10.o2pd} onChange={e => setS10('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr10o2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr10o2Fuera?'#FCEBEB':'#EAF3DE',color:rr10o2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr10o2*100)/100).toString().replace('.',',')}%{rr10o2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr10o2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral10.o2recomendacion} onChange={e => setS10('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral10} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_5S1O.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral11.diaInforme} onChange={e => setS11('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral11.mesInforme} onChange={e => setS11('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral11.anioInforme} onChange={e => setS11('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (5 membranas)</div>

            {[1,2,3,4,5].map(n => (
              <div key={'s11m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral11['m'+n+'Pre']} onChange={e => setS11('m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral11['m'+n+'Post']} onChange={e => setS11('m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral11['m'+n+'Flujo']} onChange={e => setS11('m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral11.cde} onChange={e => setS11('cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral11.cds} onChange={e => setS11('cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral11.fp} onChange={e => setS11('fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral11.fd} onChange={e => setS11('fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral11.pd} onChange={e => setS11('pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr11 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr11Fuera?'#FCEBEB':'#EAF3DE',color:rr11Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR calculado: {(Math.round(rr11*100)/100).toString().replace('.',',')}%{rr11Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>

            {rr11Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral11.recomendacion} onChange={e => setS11('recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral11} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_5S_2S_2O.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral12.diaInforme} onChange={e => setS12('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral12.mesInforme} onChange={e => setS12('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral12.anioInforme} onChange={e => setS12('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (5 membranas)</div>

            {[1,2,3,4,5].map(n => (
              <div key={'s12o1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral12['o1m'+n+'Pre']} onChange={e => setS12('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral12['o1m'+n+'Post']} onChange={e => setS12('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral12['o1m'+n+'Flujo']} onChange={e => setS12('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral12.o1cde} onChange={e => setS12('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral12.o1cds} onChange={e => setS12('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral12.o1fp} onChange={e => setS12('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral12.o1fd} onChange={e => setS12('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral12.o1pd} onChange={e => setS12('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr12o1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr12o1Fuera?'#FCEBEB':'#EAF3DE',color:rr12o1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr12o1*100)/100).toString().replace('.',',')}%{rr12o1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr12o1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral12.o1recomendacion} onChange={e => setS12('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 · agua blanda (2 membranas)</div>

            {[1,2].map(n => (
              <div key={'s12o2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral12['o2m'+n+'Pre']} onChange={e => setS12('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral12['o2m'+n+'Post']} onChange={e => setS12('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral12['o2m'+n+'Flujo']} onChange={e => setS12('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral12.o2cde} onChange={e => setS12('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral12.o2cds} onChange={e => setS12('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral12.o2fp} onChange={e => setS12('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral12.o2fd} onChange={e => setS12('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral12.o2pd} onChange={e => setS12('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr12o2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr12o2Fuera?'#FCEBEB':'#EAF3DE',color:rr12o2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr12o2*100)/100).toString().replace('.',',')}%{rr12o2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr12o2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral12.o2recomendacion} onChange={e => setS12('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral12} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_5S_3S_2O.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral13.diaInforme} onChange={e => setS13('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral13.mesInforme} onChange={e => setS13('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral13.anioInforme} onChange={e => setS13('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (5 membranas)</div>

            {[1,2,3,4,5].map(n => (
              <div key={'s13o1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral13['o1m'+n+'Pre']} onChange={e => setS13('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral13['o1m'+n+'Post']} onChange={e => setS13('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral13['o1m'+n+'Flujo']} onChange={e => setS13('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral13.o1cde} onChange={e => setS13('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral13.o1cds} onChange={e => setS13('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral13.o1fp} onChange={e => setS13('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral13.o1fd} onChange={e => setS13('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral13.o1pd} onChange={e => setS13('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr13o1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr13o1Fuera?'#FCEBEB':'#EAF3DE',color:rr13o1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr13o1*100)/100).toString().replace('.',',')}%{rr13o1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr13o1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral13.o1recomendacion} onChange={e => setS13('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 · agua blanda (3 membranas)</div>

            {[1,2,3].map(n => (
              <div key={'s13o2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral13['o2m'+n+'Pre']} onChange={e => setS13('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral13['o2m'+n+'Post']} onChange={e => setS13('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral13['o2m'+n+'Flujo']} onChange={e => setS13('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral13.o2cde} onChange={e => setS13('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral13.o2cds} onChange={e => setS13('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral13.o2fp} onChange={e => setS13('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral13.o2fd} onChange={e => setS13('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral13.o2pd} onChange={e => setS13('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr13o2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr13o2Fuera?'#FCEBEB':'#EAF3DE',color:rr13o2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr13o2*100)/100).toString().replace('.',',')}%{rr13o2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr13o2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral13.o2recomendacion} onChange={e => setS13('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral13} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}

          {CENTROS_5M_4M.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral5m4m.diaInforme} onChange={e => setS5m4m('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral5m4m.mesInforme} onChange={e => setS5m4m('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral5m4m.anioInforme} onChange={e => setS5m4m('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (5 membranas)</div>

            {[1,2,3,4,5].map(n => (
              <div key={'s5m4mo1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral5m4m['o1m'+n+'Pre']} onChange={e => setS5m4m('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral5m4m['o1m'+n+'Post']} onChange={e => setS5m4m('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral5m4m['o1m'+n+'Flujo']} onChange={e => setS5m4m('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral5m4m.o1cde} onChange={e => setS5m4m('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral5m4m.o1cds} onChange={e => setS5m4m('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral5m4m.o1fp} onChange={e => setS5m4m('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral5m4m.o1fd} onChange={e => setS5m4m('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral5m4m.o1pd} onChange={e => setS5m4m('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr5m4mo1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr5m4mo1Fuera?'#FCEBEB':'#EAF3DE',color:rr5m4mo1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr5m4mo1*100)/100).toString().replace('.',',')}%{rr5m4mo1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr5m4mo1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral5m4m.o1recomendacion} onChange={e => setS5m4m('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 (4 membranas)</div>

            {[1,2,3,4].map(n => (
              <div key={'s5m4mo2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral5m4m['o2m'+n+'Pre']} onChange={e => setS5m4m('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral5m4m['o2m'+n+'Post']} onChange={e => setS5m4m('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral5m4m['o2m'+n+'Flujo']} onChange={e => setS5m4m('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral5m4m.o2cde} onChange={e => setS5m4m('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral5m4m.o2cds} onChange={e => setS5m4m('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral5m4m.o2fp} onChange={e => setS5m4m('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral5m4m.o2fd} onChange={e => setS5m4m('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral5m4m.o2pd} onChange={e => setS5m4m('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr5m4mo2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr5m4mo2Fuera?'#FCEBEB':'#EAF3DE',color:rr5m4mo2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr5m4mo2*100)/100).toString().replace('.',',')}%{rr5m4mo2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr5m4mo2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral5m4m.o2recomendacion} onChange={e => setS5m4m('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral5m4m} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_6ot_4M.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral6ot4m.diaInforme} onChange={e => setS6ot4m('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral6ot4m.mesInforme} onChange={e => setS6ot4m('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral6ot4m.anioInforme} onChange={e => setS6ot4m('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (6 membranas)</div>

            {[1,2,3,4,5,6].map(n => (
              <div key={'s6ot4mo1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6ot4m['o1m'+n+'Pre']} onChange={e => setS6ot4m('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6ot4m['o1m'+n+'Post']} onChange={e => setS6ot4m('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6ot4m['o1m'+n+'Flujo']} onChange={e => setS6ot4m('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6ot4m.o1cde} onChange={e => setS6ot4m('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6ot4m.o1cds} onChange={e => setS6ot4m('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6ot4m.o1fp} onChange={e => setS6ot4m('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6ot4m.o1fd} onChange={e => setS6ot4m('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6ot4m.o1pd} onChange={e => setS6ot4m('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6ot4mo1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6ot4mo1Fuera?'#FCEBEB':'#EAF3DE',color:rr6ot4mo1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr6ot4mo1*100)/100).toString().replace('.',',')}%{rr6ot4mo1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6ot4mo1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6ot4m.o1recomendacion} onChange={e => setS6ot4m('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 · agua blanda (4 membranas)</div>

            {[1,2,3,4].map(n => (
              <div key={'s6ot4mo2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6ot4m['o2m'+n+'Pre']} onChange={e => setS6ot4m('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6ot4m['o2m'+n+'Post']} onChange={e => setS6ot4m('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6ot4m['o2m'+n+'Flujo']} onChange={e => setS6ot4m('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6ot4m.o2cde} onChange={e => setS6ot4m('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6ot4m.o2cds} onChange={e => setS6ot4m('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6ot4m.o2fp} onChange={e => setS6ot4m('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6ot4m.o2fd} onChange={e => setS6ot4m('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6ot4m.o2pd} onChange={e => setS6ot4m('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6ot4mo2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6ot4mo2Fuera?'#FCEBEB':'#EAF3DE',color:rr6ot4mo2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr6ot4mo2*100)/100).toString().replace('.',',')}%{rr6ot4mo2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6ot4mo2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6ot4m.o2recomendacion} onChange={e => setS6ot4m('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral6ot4m} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_6M_6M.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral6m6m.diaInforme} onChange={e => setS6m6m('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral6m6m.mesInforme} onChange={e => setS6m6m('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral6m6m.anioInforme} onChange={e => setS6m6m('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 1 (6 membranas)</div>

            {[1,2,3,4,5,6].map(n => (
              <div key={'s6m6mo1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6m6m['o1m'+n+'Pre']} onChange={e => setS6m6m('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6m6m['o1m'+n+'Post']} onChange={e => setS6m6m('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6m6m['o1m'+n+'Flujo']} onChange={e => setS6m6m('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O1 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6m6m.o1cde} onChange={e => setS6m6m('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6m6m.o1cds} onChange={e => setS6m6m('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6m6m.o1fp} onChange={e => setS6m6m('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6m6m.o1fd} onChange={e => setS6m6m('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6m6m.o1pd} onChange={e => setS6m6m('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6m6mo1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6m6mo1Fuera?'#FCEBEB':'#EAF3DE',color:rr6m6mo1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 1: {(Math.round(rr6m6mo1*100)/100).toString().replace('.',',')}%{rr6m6mo1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6m6mo1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6m6m.o1recomendacion} onChange={e => setS6m6m('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Osmosis Reversa 2 (6 membranas)</div>

            {[1,2,3,4,5,6].map(n => (
              <div key={'s6m6mo2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6m6m['o2m'+n+'Pre']} onChange={e => setS6m6m('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6m6m['o2m'+n+'Post']} onChange={e => setS6m6m('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6m6m['o2m'+n+'Flujo']} onChange={e => setS6m6m('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>O2 · Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6m6m.o2cde} onChange={e => setS6m6m('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6m6m.o2cds} onChange={e => setS6m6m('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6m6m.o2fp} onChange={e => setS6m6m('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6m6m.o2fd} onChange={e => setS6m6m('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6m6m.o2pd} onChange={e => setS6m6m('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6m6mo2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6m6mo2Fuera?'#FCEBEB':'#EAF3DE',color:rr6m6mo2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR Osmosis 2: {(Math.round(rr6m6mo2*100)/100).toString().replace('.',',')}%{rr6m6mo2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6m6mo2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación Osmosis 2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6m6m.o2recomendacion} onChange={e => setS6m6m('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral6m6m} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}

          {CENTROS_6M.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral6m.diaInforme} onChange={e => setS6m('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral6m.mesInforme} onChange={e => setS6m('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral6m.anioInforme} onChange={e => setS6m('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Membranas (6)</div>

            {[1,2,3,4,5,6].map(n => (
              <div key={'s6mo1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6m['o1m'+n+'Pre']} onChange={e => setS6m('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6m['o1m'+n+'Post']} onChange={e => setS6m('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6m['o1m'+n+'Flujo']} onChange={e => setS6m('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la osmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6m.o1cde} onChange={e => setS6m('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6m.o1cds} onChange={e => setS6m('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6m.o1fp} onChange={e => setS6m('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6m.o1fd} onChange={e => setS6m('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6m.o1pd} onChange={e => setS6m('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6m !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6mFuera?'#FCEBEB':'#EAF3DE',color:rr6mFuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr6m*100)/100).toString().replace('.',',')}%{rr6mFuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6mFuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6m.o1recomendacion} onChange={e => setS6m('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral6m} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_6T_3S.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral6t3s.diaInforme} onChange={e => setS6t3s('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral6t3s.mesInforme} onChange={e => setS6t3s('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral6t3s.anioInforme} onChange={e => setS6t3s('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Ósmosis 1 — Membranas (6)</div>

            {[1,2,3,4,5,6].map(n => (
              <div key={'s6t3so1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6t3s['o1m'+n+'Pre']} onChange={e => setS6t3s('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6t3s['o1m'+n+'Post']} onChange={e => setS6t3s('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6t3s['o1m'+n+'Flujo']} onChange={e => setS6t3s('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la ósmosis 1</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6t3s.o1cde} onChange={e => setS6t3s('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6t3s.o1cds} onChange={e => setS6t3s('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6t3s.o1fp} onChange={e => setS6t3s('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6t3s.o1fd} onChange={e => setS6t3s('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6t3s.o1pd} onChange={e => setS6t3s('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6t3so1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6t3so1Fuera?'#FCEBEB':'#EAF3DE',color:rr6t3so1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr6t3so1*100)/100).toString().replace('.',',')}%{rr6t3so1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6t3so1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación O1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6t3s.o1recomendacion} onChange={e => setS6t3s('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Ósmosis 2 — Membranas (3, agua blanda)</div>

            {[1,2,3].map(n => (
              <div key={'s6t3so2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6t3s['o2m'+n+'Pre']} onChange={e => setS6t3s('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6t3s['o2m'+n+'Post']} onChange={e => setS6t3s('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6t3s['o2m'+n+'Flujo']} onChange={e => setS6t3s('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la ósmosis 2</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6t3s.o2cde} onChange={e => setS6t3s('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6t3s.o2cds} onChange={e => setS6t3s('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6t3s.o2fp} onChange={e => setS6t3s('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6t3s.o2fd} onChange={e => setS6t3s('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6t3s.o2pd} onChange={e => setS6t3s('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6t3so2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6t3so2Fuera?'#FCEBEB':'#EAF3DE',color:rr6t3so2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr6t3so2*100)/100).toString().replace('.',',')}%{rr6t3so2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6t3so2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación O2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6t3s.o2recomendacion} onChange={e => setS6t3s('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral6t3s} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_6T_4S.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral6t4s.diaInforme} onChange={e => setS6t4s('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral6t4s.mesInforme} onChange={e => setS6t4s('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral6t4s.anioInforme} onChange={e => setS6t4s('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Ósmosis 1 — Membranas (6)</div>

            {[1,2,3,4,5,6].map(n => (
              <div key={'s6t4so1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6t4s['o1m'+n+'Pre']} onChange={e => setS6t4s('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6t4s['o1m'+n+'Post']} onChange={e => setS6t4s('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6t4s['o1m'+n+'Flujo']} onChange={e => setS6t4s('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la ósmosis 1</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6t4s.o1cde} onChange={e => setS6t4s('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6t4s.o1cds} onChange={e => setS6t4s('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6t4s.o1fp} onChange={e => setS6t4s('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6t4s.o1fd} onChange={e => setS6t4s('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6t4s.o1pd} onChange={e => setS6t4s('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6t4so1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6t4so1Fuera?'#FCEBEB':'#EAF3DE',color:rr6t4so1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr6t4so1*100)/100).toString().replace('.',',')}%{rr6t4so1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6t4so1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación O1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6t4s.o1recomendacion} onChange={e => setS6t4s('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Ósmosis 2 — Membranas (4)</div>

            {[1,2,3,4].map(n => (
              <div key={'s6t4so2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6t4s['o2m'+n+'Pre']} onChange={e => setS6t4s('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6t4s['o2m'+n+'Post']} onChange={e => setS6t4s('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6t4s['o2m'+n+'Flujo']} onChange={e => setS6t4s('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la ósmosis 2</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6t4s.o2cde} onChange={e => setS6t4s('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6t4s.o2cds} onChange={e => setS6t4s('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6t4s.o2fp} onChange={e => setS6t4s('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6t4s.o2fd} onChange={e => setS6t4s('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6t4s.o2pd} onChange={e => setS6t4s('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6t4so2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6t4so2Fuera?'#FCEBEB':'#EAF3DE',color:rr6t4so2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr6t4so2*100)/100).toString().replace('.',',')}%{rr6t4so2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6t4so2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación O2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6t4s.o2recomendacion} onChange={e => setS6t4s('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral6t4s} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
                    {CENTROS_7M_4S.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral7m4s.diaInforme} onChange={e => setS7m4s('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral7m4s.mesInforme} onChange={e => setS7m4s('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral7m4s.anioInforme} onChange={e => setS7m4s('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Ósmosis 1 — Membranas (7)</div>

            {[1,2,3,4,5,6,7].map(n => (
              <div key={'s7m4so1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral7m4s['o1m'+n+'Pre']} onChange={e => setS7m4s('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral7m4s['o1m'+n+'Post']} onChange={e => setS7m4s('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral7m4s['o1m'+n+'Flujo']} onChange={e => setS7m4s('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la ósmosis 1</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral7m4s.o1cde} onChange={e => setS7m4s('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral7m4s.o1cds} onChange={e => setS7m4s('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral7m4s.o1fp} onChange={e => setS7m4s('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral7m4s.o1fd} onChange={e => setS7m4s('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral7m4s.o1pd} onChange={e => setS7m4s('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr7m4so1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr7m4so1Fuera?'#FCEBEB':'#EAF3DE',color:rr7m4so1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr7m4so1*100)/100).toString().replace('.',',')}%{rr7m4so1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr7m4so1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación O1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral7m4s.o1recomendacion} onChange={e => setS7m4s('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Ósmosis 2 — Membranas (4)</div>

            {[1,2,3,4].map(n => (
              <div key={'s7m4so2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral7m4s['o2m'+n+'Pre']} onChange={e => setS7m4s('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral7m4s['o2m'+n+'Post']} onChange={e => setS7m4s('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral7m4s['o2m'+n+'Flujo']} onChange={e => setS7m4s('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la ósmosis 2</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral7m4s.o2cde} onChange={e => setS7m4s('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral7m4s.o2cds} onChange={e => setS7m4s('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral7m4s.o2fp} onChange={e => setS7m4s('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral7m4s.o2fd} onChange={e => setS7m4s('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral7m4s.o2pd} onChange={e => setS7m4s('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr7m4so2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr7m4so2Fuera?'#FCEBEB':'#EAF3DE',color:rr7m4so2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr7m4so2*100)/100).toString().replace('.',',')}%{rr7m4so2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr7m4so2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación O2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral7m4s.o2recomendacion} onChange={e => setS7m4s('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral7m4s} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_8M_5S.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral8m5s.diaInforme} onChange={e => setS8m5s('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral8m5s.mesInforme} onChange={e => setS8m5s('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral8m5s.anioInforme} onChange={e => setS8m5s('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Ósmosis 1 — Membranas (8)</div>

            {[1,2,3,4,5,6,7,8].map(n => (
              <div key={'s8m5so1m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral8m5s['o1m'+n+'Pre']} onChange={e => setS8m5s('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral8m5s['o1m'+n+'Post']} onChange={e => setS8m5s('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral8m5s['o1m'+n+'Flujo']} onChange={e => setS8m5s('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la ósmosis 1</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral8m5s.o1cde} onChange={e => setS8m5s('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral8m5s.o1cds} onChange={e => setS8m5s('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral8m5s.o1fp} onChange={e => setS8m5s('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral8m5s.o1fd} onChange={e => setS8m5s('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral8m5s.o1pd} onChange={e => setS8m5s('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr8m5so1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr8m5so1Fuera?'#FCEBEB':'#EAF3DE',color:rr8m5so1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr8m5so1*100)/100).toString().replace('.',',')}%{rr8m5so1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr8m5so1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación O1 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral8m5s.o1recomendacion} onChange={e => setS8m5s('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Ósmosis 2 — Membranas (5)</div>

            {[1,2,3,4,5].map(n => (
              <div key={'s8m5so2m'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral8m5s['o2m'+n+'Pre']} onChange={e => setS8m5s('o2m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral8m5s['o2m'+n+'Post']} onChange={e => setS8m5s('o2m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral8m5s['o2m'+n+'Flujo']} onChange={e => setS8m5s('o2m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la ósmosis 2</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral8m5s.o2cde} onChange={e => setS8m5s('o2cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral8m5s.o2cds} onChange={e => setS8m5s('o2cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral8m5s.o2fp} onChange={e => setS8m5s('o2fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral8m5s.o2fd} onChange={e => setS8m5s('o2fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral8m5s.o2pd} onChange={e => setS8m5s('o2pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr8m5so2 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr8m5so2Fuera?'#FCEBEB':'#EAF3DE',color:rr8m5so2Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr8m5so2*100)/100).toString().replace('.',',')}%{rr8m5so2Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr8m5so2Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación O2 <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral8m5s.o2recomendacion} onChange={e => setS8m5s('o2recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral8m5s} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
          {CENTROS_6sCarmen.includes(semestral.cliente) && <>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Fecha del informe</div>
              <div style={{display:'flex',gap:6,maxWidth:360}}>
                <select value={semestral6sCarmen.diaInforme} onChange={e => setS6sCarmen('diaInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Día</option>
                  {DIAS_DISPONIBLES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={semestral6sCarmen.mesInforme} onChange={e => setS6sCarmen('mesInforme', e.target.value)} style={{...inputStyle, width:'40%'}}>
                  <option value="">Mes</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
                <select value={semestral6sCarmen.anioInforme} onChange={e => setS6sCarmen('anioInforme', e.target.value)} style={{...inputStyle, width:'30%'}}>
                  <option value="">Año</option>
                  {ANIOS_DISPONIBLES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div style={{background:'#e8f4fd',borderRadius:12,padding:'12px 16px',marginBottom:'1rem',fontSize:14,fontWeight:600,color:'#1a3a6b'}}>Ósmosis — Membranas (6)</div>

            {[1,2,3,4,5,6].map(n => (
              <div key={'s6sCarmenm'+n} style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Membrana N° {n}</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                  <div><label style={labelStyle}>Cond. pre lavado (µS/cm)</label>
                    <input type="number" value={semestral6sCarmen['o1m'+n+'Pre']} onChange={e => setS6sCarmen('o1m'+n+'Pre', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Cond. post lavado (µS/cm)</label>
                    <input type="number" value={semestral6sCarmen['o1m'+n+'Post']} onChange={e => setS6sCarmen('o1m'+n+'Post', e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Flujo post lavado (Lpm)</label>
                    <input type="number" value={semestral6sCarmen['o1m'+n+'Flujo']} onChange={e => setS6sCarmen('o1m'+n+'Flujo', e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            ))}

            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Datos de la ósmosis</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                <div><label style={labelStyle}>Conductividad de entrada (µS/cm)</label>
                  <input type="number" value={semestral6sCarmen.o1cde} onChange={e => setS6sCarmen('o1cde', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Conductividad de salida (µS/cm)</label>
                  <input type="number" value={semestral6sCarmen.o1cds} onChange={e => setS6sCarmen('o1cds', e.target.value)} style={inputStyle} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:'1rem'}}>
                <div><label style={labelStyle}>Flujo Producto (lpm)</label>
                  <input type="number" value={semestral6sCarmen.o1fp} onChange={e => setS6sCarmen('o1fp', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Flujo Descarte (lpm)</label>
                  <input type="number" value={semestral6sCarmen.o1fd} onChange={e => setS6sCarmen('o1fd', e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>Presión Descarte (psi)</label>
                  <input type="number" value={semestral6sCarmen.o1pd} onChange={e => setS6sCarmen('o1pd', e.target.value)} style={inputStyle} /></div>
              </div>
              {rr6sCarmenO1 !== null && (
                <div style={{marginTop:'1rem',padding:'12px 16px',borderRadius:8,background:rr6sCarmenO1Fuera?'#FCEBEB':'#EAF3DE',color:rr6sCarmenO1Fuera?'#A32D2D':'#3B6D11',fontWeight:600,fontSize:14}}>
                  RR: {(Math.round(rr6sCarmenO1*100)/100).toString().replace('.',',')}%{rr6sCarmenO1Fuera ? ' — Fuera de rango (menor a 97%)' : ' — Dentro de parámetros'}
                </div>
              )}
            </div>
            {rr6sCarmenO1Fuera && (
              <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem',fontSize:14}}>Recomendación <span style={{color:'#aaa',fontWeight:400}}>(RR fuera de rango)</span></div>
                <textarea value={semestral6sCarmen.o1recomendacion} onChange={e => setS6sCarmen('o1recomendacion', e.target.value)} placeholder="Si lo dejas vacío, dirá 'Recomendación pendiente.'" rows={3} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}

            <button onClick={handleGenerarSemestral6sCarmen} disabled={generandoSemestral} style={{width:isMobile?'100%':'auto',padding:'14px 32px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer',marginBottom:'1.5rem'}}>
              {generandoSemestral ? '⏳ Generando informe...' : '📄 Generar informe'}
            </button>
          </>}
        </>}

        {/* TAB MIS INFORMES SEMESTRALES */}
        {tab === 'missemestrales' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Mis informes semestrales</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Historial de informes de mantención de membranas</p>
          <div style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5'}}>
            <div style={{fontSize:13,color:'#888',marginBottom:'1rem'}}>{semestrales.length} informes generados</div>
            {isMobile ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {semestrales.map(inf => (
                  <div key={inf.id} style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1a1a2e',marginBottom:4}}>{inf.cliente}</div>
                    <div style={{fontSize:12,color:'#888',marginBottom:8}}>{inf.fechaInforme} · {inf.tecnicoResponsable}</div>
                    <div style={{display:'flex',gap:8}}>
                      <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{flex:1,display:'block',textAlign:'center',padding:'7px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:12,textDecoration:'none'}}>📥 Descargar</a>
                      <button onClick={() => eliminarSemestral(inf.id)} style={{padding:'7px 12px',background:'#FCEBEB',color:'#c0392b',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>🗑️</button>
                    </div>
                  </div>
                ))}
                {semestrales.length===0 && <p style={{textAlign:'center',color:'#aaa',padding:'1rem'}}>No hay informes generados aún</p>}
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Cliente','Fecha informe','Técnico','',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {semestrales.map(inf => (
                    <tr key={inf.id}>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.cliente}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.fechaInforme}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.tecnicoResponsable}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{padding:'4px 10px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:11,textDecoration:'none'}}>📥 Descargar</a>
                      </td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <button onClick={() => eliminarSemestral(inf.id)} style={{padding:'4px 10px',background:'#FCEBEB',color:'#c0392b',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>🗑️ Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {semestrales.length===0 && <tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay informes generados aún</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>}

      {/* TAB TODOS LOS INFORMES SEMESTRALES */}
        {tab === 'todossemestrales' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Todos los informes semestrales</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Informes semestrales de todos los técnicos</p>
          <div style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:10,marginBottom:'1rem'}}>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Técnico</label>
                <select value={filtroTecnicoSemestral} onChange={e => setFiltroTecnicoSemestral(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los técnicos</option>
                  {tecnicosSemestralesUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Centro</label>
                <select value={filtroCentroSemestral} onChange={e => setFiltroCentroSemestral(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los centros</option>
                  {centrosSemestralesUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Mes</label>
                <select value={filtroMesSemestral} onChange={e => setFiltroMesSemestral(e.target.value)} style={{width:'100%',padding:'9px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los meses</option>
                  {Array.from({length:12},(_,i) => (
                    <option key={i+1} value={String(i+1).padStart(2,'0')}>{MESES_NOMBRE[i]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{fontSize:13,color:'#888',marginBottom:'1rem'}}>{semestralesFiltrados.length} informes encontrados</div>
            {isMobile ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {semestralesFiltrados.map(inf => (
                  <div key={inf.id} style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1a1a2e',marginBottom:4}}>{inf.cliente}</div>
                    <div style={{fontSize:12,color:'#888',marginBottom:8}}>{inf.fechaInforme} · {inf.tecnicoResponsable}</div>
                    <div style={{display:'flex',gap:8}}>
                      <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{flex:1,display:'block',textAlign:'center',padding:'7px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:12,textDecoration:'none'}}>📥 Descargar</a>
                      <button onClick={() => eliminarSemestral(inf.id)} style={{padding:'7px 12px',background:'#FCEBEB',color:'#c0392b',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>🗑️</button>
                    </div>
                  </div>
                ))}
                {semestralesFiltrados.length===0 && <p style={{textAlign:'center',color:'#aaa',padding:'1rem'}}>No hay informes con esos filtros</p>}
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Cliente','Fecha informe','Técnico','',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {semestralesFiltrados.map(inf => (
                    <tr key={inf.id}>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.cliente}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.fechaInforme}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.tecnicoResponsable}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{padding:'4px 10px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:11,textDecoration:'none'}}>📥 Descargar</a>
                      </td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <button onClick={() => eliminarSemestral(inf.id)} style={{padding:'4px 10px',background:'#FCEBEB',color:'#c0392b',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>🗑️ Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {semestralesFiltrados.length===0 && <tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay informes con esos filtros</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>}
      </div>

            {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <>
          <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'1px solid #eee',display:'flex',zIndex:100,boxShadow:'0 -2px 10px rgba(0,0,0,0.08)'}}>
            <div onClick={() => goTab('inicio')} style={navTab(tab==='inicio')}>
              <span style={{fontSize:18}}>🏠</span><span>Inicio</span>
            </div>
            <div onClick={() => setShowMasServicios(true)} style={navTab(showMasServicios)}>
              <span style={{fontSize:18}}>➕</span><span>Registrar servicio</span>
            </div>
          </div>


        {/* SHEET "Registrar servicio" */}
          {showMasServicios && (
            <div
              onClick={() => setShowMasServicios(false)}
              style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'flex-end'}}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{background:'#fff',width:'100%',borderTopLeftRadius:20,borderTopRightRadius:20,padding:'12px 20px 32px',maxHeight:'80vh',overflowY:'auto'}}
              >
                <div style={{width:40,height:5,background:'#ddd',borderRadius:3,margin:'0 auto 20px'}} />
                <h2 style={{fontSize:22,fontWeight:700,marginBottom:16}}>Registrar servicio</h2>

                <div style={sheetSectionLabel}>VISITAS</div>
                <div onClick={() => { goTab('registro'); setShowMasServicios(false) }} style={sheetItem}>
                  <span style={{fontSize:20}}>➕</span><span>Nueva visita</span>
                </div>
                <div onClick={() => { goTab('registros'); setFiltroEstado(''); setShowMasServicios(false) }} style={sheetItem}>
                  <span style={{fontSize:20}}>📋</span><span>Mis Visitas</span>
                </div>
                <div onClick={() => { goTab('TODAS_LAS_VISITAS_TAB'); setShowMasServicios(false) }} style={sheetItem}>
                  <span style={{fontSize:20}}>🗂️</span><span>Todas las visitas</span>
                </div>

                <div style={sheetSectionLabel}>INFORMES DESINFECCIÓN</div>
                <div onClick={() => { goTab('informes'); setShowMasServicios(false) }} style={sheetItem}>
                  <span style={{fontSize:20}}>🧪</span><span>Registrar informe de desinfección</span>
                </div>
                <div onClick={() => { goTab('MIS_INFORMES_DESINFECCION_TAB'); setShowMasServicios(false) }} style={sheetItem}>
                  <span style={{fontSize:20}}>📄</span><span>Mis informes de desinfección</span>
                </div>
                <div onClick={() => { goTab('TODOS_INFORMES_DESINFECCION_TAB'); setShowMasServicios(false) }} style={sheetItem}>
                  <span style={{fontSize:20}}>🗂️</span><span>Todos los informes de desinfección</span>
                </div>

                <div style={sheetSectionLabel}>INFORMES SEMESTRALES</div>
                <div onClick={() => { goTab('todosinformes'); setShowMasServicios(false) }} style={sheetItem}>
                  <span style={{fontSize:20}}>📊</span><span>Registrar informe semestral</span>
                </div>
                <div onClick={() => { goTab('MIS_INFORMES_SEMESTRALES_TAB'); setShowMasServicios(false) }} style={sheetItem}>
                  <span style={{fontSize:20}}>📄</span><span>Mis informes semestrales</span>
                </div>
                <div onClick={() => { goTab('TODOS_INFORMES_SEMESTRALES_TAB'); setShowMasServicios(false) }} style={sheetItem}>
                  <span style={{fontSize:20}}>🗂️</span><span>Todos los informes semestrales</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}