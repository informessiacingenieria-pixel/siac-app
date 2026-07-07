'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '../../../lib/firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { generarPdfBlob } from '../../../lib/InformePDF'
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
  'Hemodiálisis Curicó','Hosp. Calbuco','Hosp. La Florida Esterelizacion',
  'Hosp. La Florida Farmacia y Laboratorio','Hosp. La Florida Anatomia Patologica',
  'Hosp. La Florida Odontologia','Hosp. La Florida SEDILE','Hosp. Curacautin','Hosp. Lautaro Antiguo',
  'Hosp. Lautaro Nuevo','Hosp. Luis Calvo Mackenna Diálisis','Hosp. Luis Calvo Mackenna Estéril',
  'Hosp. Maipú','Hosp. Nueva Imperial','Hosp. Osorno Diálisis','Hosp. Osorno Esterelización',
  'Hosp. Puerto Montt','Hosp. Purranque','Hosp. Salvador Diálisis','Hosp. Salvador Estéril',
  'Hosp. San Camilo','Hosp. San Jose','Hosp. Valdivia','Nefrodial Linares','Nefrodial Molina',
  'Nefrodial San Javier','Municipalidad Puerto Montt','Premio Nobel','Red Dialisis','UPC Hospital Nueva Imperial'
]

const TECNICOS: Record<string,string> = {
  'cfuentes@siac-ingenieria.cl': 'Claudio Fuentes',
  'mpoloni@siac-ingenieria.cl': 'Mauro Poloni',
  'mlazo@siac-ingenieria.cl': 'Matias Lazo',
  'imiranda@siac-ingenieria.cl': 'Isaias Miranda',
  'mmeza@siac-ingenieria.cl': 'Marcelo Meza',
  'jfigueroa@siac-ingenieria.cl': 'Jaime Figueroa',
  'gf.cuvertino@gmail.com': 'Gian Cuvertino',
}

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

export default function TecnicoPage() {
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState('inicio')
  const [registros, setRegistros] = useState<any[]>([])
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
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroCentroH, setFiltroCentroH] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [modalRegistro, setModalRegistro] = useState<any>(null)
  const [editando, setEditando] = useState(false)
  const [editRepuestos, setEditRepuestos] = useState<any[]>([])
  const [editObservaciones, setEditObservaciones] = useState('')
  const [editUsaRepuestos, setEditUsaRepuestos] = useState(true)
  const [editFotos, setEditFotos] = useState<string[]>([])
  const [editNumeroInforme, setEditNumeroInforme] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [fotoVisor, setFotoVisor] = useState<string|null>(null)

  const [informe, setInforme] = useState<any>(informeVacio)
  const [generandoInforme, setGenerandoInforme] = useState(false)
  const [exitoInforme, setExitoInforme] = useState(false)
  const [misInformes, setMisInformes] = useState<any[]>([])

  const [submenuVisitasOpen, setSubmenuVisitasOpen] = useState(false)
  const [submenuInformesOpen, setSubmenuInformesOpen] = useState(false)

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
      if (u.email === 'informessiacingenieria@gmail.com') { router.push('/dashboard/gerencia'); return }
      setUser(u)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'visitas'), where('uid', '==', user.uid), orderBy('fecha', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setRegistros(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [user])

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'informes'), where('uid', '==', user.uid), orderBy('creadoEn', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setMisInformes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [user])

  const handleLogout = async () => { await signOut(auth); router.push('/') }

  const subirFoto = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    return data.secure_url
  }

  const subirPdf = async (blob: Blob): Promise<string> => {
    const formData = new FormData()
    formData.append('file', blob, 'informe.pdf')
    formData.append('upload_preset', CLOUDINARY_PRESET)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!data.secure_url) throw new Error('No se pudo subir el PDF a Cloudinary: ' + JSON.stringify(data))
    return data.secure_url
  }

  const handleFotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setSubiendoFotos(true)
    try {
      const archivos = Array.from(e.target.files)
      const urls = await Promise.all(archivos.map(f => subirFoto(f)))
      setFotos(prev => [...prev, ...urls])
    } catch (err) {
      alert('Error al subir fotos, intenta de nuevo')
    } finally {
      setSubiendoFotos(false)
    }
  }

  const handleFotosEdit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setSubiendoFotos(true)
    try {
      const archivos = Array.from(e.target.files)
      const urls = await Promise.all(archivos.map(f => subirFoto(f)))
      setEditFotos(prev => [...prev, ...urls])
    } catch (err) {
      alert('Error al subir fotos')
    } finally {
      setSubiendoFotos(false)
    }
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

  const addRepuesto = () => setRepuestos([...repuestos, {nombre:'',cantidad:1}])
  const removeRepuesto = (i: number) => { if (repuestos.length > 1) setRepuestos(repuestos.filter((_,idx) => idx !== i)) }
  const updateRepuesto = (i: number, field: string, val: any) => {
    const r = [...repuestos]; r[i] = {...r[i],[field]:val}; setRepuestos(r)
  }

  const handleSubmit = async () => {
    if (!centro) { alert('Por favor selecciona un centro'); return }
    if (usaRepuestos === null) { alert('Por favor indica si se utilizaron repuestos'); return }
    if (usaRepuestos && repuestos.filter(r => r.nombre.trim()).length === 0) { alert('Por favor agrega al menos un repuesto'); return }
    setGuardando(true)
    try {
      const repuestosFinal = repuestos
        .filter(r => r.nombre.trim())
        .map(r => ({ nombre: r.nombre, cantidad: parseInt(String(r.cantidad)) || 1 }))
      await addDoc(collection(db, 'visitas'), {
        uid: user.uid, tecnico: TECNICOS[user.email] || user.email, email: user.email, centro,
        fecha: Timestamp.fromDate(new Date(fecha + 'T12:00:00')),
        numeroInforme,
        repuestos: usaRepuestos ? repuestosFinal : [],
        usaRepuestos, observaciones, fotos, estado: 'Pendiente', creadoEn: Timestamp.now()
      })
      setExito(true)
      setCentro(''); setRepuestos([{nombre:'',cantidad:1}]); setObservaciones('')
      setFecha(new Date().toISOString().split('T')[0]); setUsaRepuestos(null); setFotos([])
      setNumeroInforme('')
      setTimeout(() => { setExito(false); setTab('historial') }, 1500)
    } catch (e) {
      alert('Error al guardar, intenta de nuevo')
    } finally {
      setGuardando(false)
    }
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
    setEditUsaRepuestos(r.repuestos && r.repuestos.length > 0)
    setEditFotos(r.fotos || [])
    setEditNumeroInforme(r.numeroInforme || '')
    setEditando(false)
  }

  const cerrarModal = () => { setModalRegistro(null); setEditando(false); setFotoVisor(null) }

  const handleEditUsaRepuestos = (usa: boolean) => {
    setEditUsaRepuestos(usa)
    if (!usa) {
      setEditRepuestos([])
      setEditObservaciones(prev => prev || 'No se utilizaron repuestos en esta visita')
    } else {
      setEditRepuestos([{nombre:'',cantidad:1}])
      if (editObservaciones === 'No se utilizaron repuestos en esta visita') setEditObservaciones('')
    }
  }

  const guardarEdicion = async () => {
    if (!modalRegistro) return
    setGuardandoEdit(true)
    const repsGuardar = editUsaRepuestos
      ? editRepuestos.filter(r => r.nombre.trim()).map(r => ({ nombre: r.nombre, cantidad: parseInt(String(r.cantidad)) || 1 }))
      : []
    await updateDoc(doc(db, 'visitas', modalRegistro.id), {
      repuestos: repsGuardar, observaciones: editObservaciones,
      usaRepuestos: editUsaRepuestos, fotos: editFotos,
      numeroInforme: editNumeroInforme,
    })
    setGuardandoEdit(false); setEditando(false)
    setModalRegistro({...modalRegistro, repuestos: repsGuardar, observaciones: editObservaciones, fotos: editFotos, numeroInforme: editNumeroInforme})
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
        tecnicoResponsable: nombreTecnico,
        puntosPresencia: { monitores: informe.monitoresPresencia, salaReparacion: informe.salaReparacionPresencia },
        puntosAusencia: { monitores: informe.monitoresAusencia, salaReparacion: informe.salaReparacionAusencia },
      }
      const blob = await generarPdfBlob(datosPdf)
      pasoActual = 'subiendo PDF a Cloudinary'
      const pdfUrl = await subirPdf(blob)
      const fechaServicioTexto = `${String(informe.fechaServicioDia).padStart(2,'0')}/${String(informe.fechaServicioMes).padStart(2,'0')}/${informe.fechaServicioAnio}`
      pasoActual = 'guardando en Firestore'
      await addDoc(collection(db, 'informes'), {
        uid: user.uid, tecnico: nombreTecnico, email: user.email,
        cliente: informe.cliente, fechaServicio: fechaServicioTexto,
        tecnicoResponsable: nombreTecnico, pdfUrl, creadoEn: Timestamp.now(),
      })
      pasoActual = 'enviando correo'
      const respCorreo = await fetch('/api/enviar-informe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfUrl, tecnicoEmail: user.email, tecnicoNombre: nombreTecnico,
          cliente: informe.cliente, fechaServicio: fechaServicioTexto,
        }),
      })
      const dataCorreo = await respCorreo.json()
      if (!respCorreo.ok || dataCorreo.error) {
        alert('⚠️ El informe se generó y guardó correctamente, pero hubo un problema al enviar el correo: ' + (dataCorreo.error || 'Error desconocido') + '\n\nPuedes descargar el PDF desde la pestaña "Mis informes".')
      } else {
        setExitoInforme(true)
        setTimeout(() => setExitoInforme(false), 4000)
      }
      setInforme(informeVacio)
    } catch (e: any) {
      alert('Error en el paso "' + pasoActual + '": ' + (e?.message || 'Error desconocido'))
    } finally {
      setGenerandoInforme(false)
    }
  }

  const nombreTecnico = user ? (TECNICOS[user.email] || user.email) : ''
  const iniciales = nombreTecnico.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()
  const mesActual = new Date().getMonth()
  const mesYear = new Date().getFullYear()
  const registrosMes = registros.filter(r => { const fd = r.fecha?.toDate(); return fd && fd.getMonth()===mesActual && fd.getFullYear()===mesYear })
  const registrosMesConRepuestos = registrosMes.filter(r => r.repuestos && r.repuestos.length > 0)
  const totalRepuestosMes = registrosMesConRepuestos.reduce((acc, r) =>
    acc + r.repuestos.reduce((a: number, rep: any) => a + (typeof rep === 'object' ? (rep.cantidad || 1) : 1), 0), 0)
  const registrosFiltrados = registros.filter(r => {
    if (filtroMes !== '' && new Date(r.fecha?.toDate()).getMonth() !== parseInt(filtroMes)) return false
    if (filtroCentroH && r.centro !== filtroCentroH) return false
    return true
  })
  const centrosUnicos = [...new Set(registros.map(r => r.centro))].filter(Boolean)

  const formatRepuestos = (reps: any[]) => {
    if (!reps || reps.length === 0) return 'Sin repuestos'
    return reps.map(r => typeof r === 'object' ? `${r.nombre} (x${r.cantidad})` : r).join(', ')
  }

  const badge = (estado: string) => ({
    display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:500,
    background:estado==='Pendiente'?'#FCEBEB':estado==='Cobrado'?'#EAF3DE':'#FAEEDA',
    color:estado==='Pendiente'?'#A32D2D':estado==='Cobrado'?'#3B6D11':'#854F0B'
  })

  const navTab = (active: boolean) => ({
    flex:1, display:'flex', flexDirection:'column' as const, alignItems:'center', justifyContent:'center',
    padding:'8px 4px', cursor:'pointer', borderTop: active?'2px solid #2196f3':'2px solid transparent',
    background: active?'#f0f7ff':'transparent', color: active?'#1a3a6b':'#888', fontSize:10, gap:2
  })

  const goTab = (t: string) => { setTab(t); if(isMobile) setSidebarOpen(false) }

  const kpis = [
    {icon:'/icon-repuestos.png', label:'Repuestos este mes', value: totalRepuestosMes, sub:'Suma de cantidades'},
    {icon:'/icon-visitas.png', label:'Visitas con repuestos este mes', value: registrosMesConRepuestos.length, sub:'Con repuestos utilizados'},
    {icon:'/icon-centros.png', label:'Total registros', value: registros.length, sub:'Con y sin repuestos'},
  ]

  const inputStyle = {width:'100%',padding:'10px',border:'1.5px solid #ddd',borderRadius:8,fontSize:13,color:'#222',background:'#fff'}
  const labelStyle = {fontSize:13,color:'#555',display:'block' as const,marginBottom:4,fontWeight:500}

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
                <div style={{fontSize:11,color:'#aaa',marginBottom:4}}>Centro</div>
                <div style={{fontSize:13,fontWeight:600,color:'#1a1a2e'}}>{modalRegistro.centro}</div>
              </div>
              <div style={{background:'#f7f9fc',borderRadius:10,padding:'10px'}}>
                <div style={{fontSize:11,color:'#aaa',marginBottom:4}}>Estado</div>
                <span style={badge(modalRegistro.estado)}>{modalRegistro.estado}</span>
              </div>
            </div>

            {/* Número de informe en modal */}
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

            {editando && (
              <div style={{marginBottom:'1rem'}}>
                <div style={{fontSize:12,color:'#555',marginBottom:8,fontWeight:500}}>¿Se utilizaron repuestos?</div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => handleEditUsaRepuestos(true)} style={{flex:1,padding:'9px',border:`2px solid ${editUsaRepuestos?'#2196f3':'#ddd'}`,borderRadius:8,background:editUsaRepuestos?'#e8f4fd':'#fff',color:editUsaRepuestos?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:editUsaRepuestos?600:400}}>✅ Sí</button>
                  <button onClick={() => handleEditUsaRepuestos(false)} style={{flex:1,padding:'9px',border:`2px solid ${!editUsaRepuestos?'#ef5350':'#ddd'}`,borderRadius:8,background:!editUsaRepuestos?'#FCEBEB':'#fff',color:!editUsaRepuestos?'#c0392b':'#666',fontSize:13,cursor:'pointer',fontWeight:!editUsaRepuestos?600:400}}>❌ No</button>
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
                        placeholder="Nombre" style={{flex:2,padding:'8px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13,color:'#222',background:'#fff'}} />
                      <input type="number" min={1} value={r.cantidad}
                        onFocus={e => e.target.select()}
                        onChange={e => { const val = e.target.value; const arr = [...editRepuestos]; arr[i] = { ...arr[i], cantidad: val === '' ? '' : parseInt(val) || 1 }; setEditRepuestos(arr) }}
                        onBlur={e => { if (e.target.value === '') { const arr = [...editRepuestos]; arr[i] = { ...arr[i], cantidad: 1 }; setEditRepuestos(arr) } }}
                        style={{flex:1,padding:'8px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13,color:'#222',background:'#fff'}} />
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
                  style={{width:'100%',padding:'9px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13,resize:'vertical'}} />
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
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
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
      )}

      {/* DESKTOP SIDEBAR */}
      {!isMobile && (
        <div style={{width:sidebarOpen?230:64,background:'linear-gradient(180deg, #1a3a6b 0%, #2196f3 100%)',display:'flex',flexDirection:'column',transition:'width 0.3s ease',overflow:'hidden',flexShrink:0}}>
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
          <div onClick={() => setSubmenuVisitasOpen(!submenuVisitasOpen)} style={navItem(tab==='registro'||tab==='historial')}>
            <span style={{fontSize:18,flexShrink:0}}>🔧</span>
            {sidebarOpen && <><span>Visitas</span><span style={{marginLeft:'auto',fontSize:11}}>{submenuVisitasOpen?'▲':'▼'}</span></>}
          </div>
          {submenuVisitasOpen && sidebarOpen && <>
            <div onClick={() => goTab('registro')} style={subItem(tab==='registro')}>➕ Registrar visita</div>
            <div onClick={() => goTab('historial')} style={subItem(tab==='historial')}>📋 Mis registros</div>
          </>}
          <div onClick={() => setSubmenuInformesOpen(!submenuInformesOpen)} style={navItem(tab==='informes'||tab==='misinformes')}>
            <span style={{fontSize:18,flexShrink:0}}>🧪</span>
            {sidebarOpen && <><span>Informes Desinfección</span><span style={{marginLeft:'auto',fontSize:11}}>{submenuInformesOpen?'▲':'▼'}</span></>}
          </div>
          {submenuInformesOpen && sidebarOpen && <>
            <div onClick={() => goTab('informes')} style={subItem(tab==='informes')}>➕ Registrar informe</div>
            <div onClick={() => goTab('misinformes')} style={subItem(tab==='misinformes')}>📋 Mis informes</div>
          </>}
          <div style={{marginTop:'auto',padding:'1rem',borderTop:'1px solid rgba(255,255,255,0.15)'}}>
            {sidebarOpen && (
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#fff'}}>{iniciales}</div>
                <div style={{color:'rgba(255,255,255,0.9)',fontSize:12}}>{nombreTecnico}</div>
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
              <div style={{color:'rgba(255,255,255,0.6)',fontSize:10}}>{nombreTecnico}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:8,color:'#fff',fontSize:12,padding:'6px 12px',cursor:'pointer'}}>Salir</button>
        </div>
      )}

      {/* MAIN */}
      <div style={{flex:1,padding:isMobile?'1rem':'1.5rem',background:'#f7f9fc',overflowY:'auto',paddingBottom:isMobile?'80px':'1.5rem'}}>

        {tab === 'inicio' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Bienvenido, {nombreTecnico.split(' ')[0]}</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Resumen de tus visitas y repuestos</p>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:10,marginBottom:'1.25rem'}}>
            {kpis.map((k,i) => (
              <div key={i} onClick={() => goTab('historial')} style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5',boxShadow:'0 1px 4px rgba(0,0,0,0.04)',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
                <img src={k.icon} alt="" style={{width:isMobile?52:42,height:isMobile?52:42,borderRadius:12,objectFit:'cover',flexShrink:0}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:'#888',marginBottom:4}}>{k.label}</div>
                  <div style={{fontSize:isMobile?22:24,fontWeight:700,color:'#1a1a2e'}}>{k.value}</div>
                  <div style={{fontSize:11,color:'#2196f3',marginTop:2}}>{k.sub} →</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',fontSize:14}}>Últimos registros</div>
              <button onClick={() => goTab('registro')} style={{padding:'7px 14px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:500}}>+ Nueva visita</button>
            </div>
            {isMobile ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {registros.slice(0,5).map(r => (
                  <div key={r.id} style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:600,color:'#1a1a2e'}}>{r.centro}</span>
                      <span style={badge(r.estado)}>{r.estado}</span>
                    </div>
                    <div style={{fontSize:12,color:'#888',marginBottom:4}}>{r.fecha?.toDate().toLocaleDateString('es-CL')}</div>
                    <div style={{fontSize:12,color:'#555',marginBottom:8}}>{formatRepuestos(r.repuestos)}</div>
                    <button onClick={() => abrirModal(r)} style={{width:'100%',padding:'7px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>Ver detalle</button>
                  </div>
                ))}
                {registros.length===0 && <p style={{textAlign:'center',color:'#aaa',padding:'1rem'}}>No hay registros aún</p>}
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Fecha','Centro','N° Informe','Repuestos','Estado',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {registros.slice(0,5).map(r => (
                    <tr key={r.id}>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.fecha?.toDate().toLocaleDateString('es-CL')}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.centro}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',color:'#1a6fa8',fontWeight:500}}>{r.numeroInforme || '-'}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{formatRepuestos(r.repuestos)}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}><span style={badge(r.estado)}>{r.estado}</span></td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <button onClick={() => abrirModal(r)} style={{padding:'4px 10px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>Ver detalle</button>
                      </td>
                    </tr>
                  ))}
                  {registros.length===0 && <tr><td colSpan={6} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay registros aún</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>}

        {tab === 'registro' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Registrar visita</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Ingresa los datos de la visita</p>
          {exito && <div style={{background:'#EAF3DE',color:'#3B6D11',padding:'12px 16px',borderRadius:8,marginBottom:'1rem',fontWeight:500}}>✅ Registro guardado correctamente</div>}
          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
              <div>
                <label style={{fontSize:13,color:'#555',display:'block',marginBottom:4,fontWeight:500}}>Centro de diálisis</label>
                <select value={centro} onChange={e => setCentro(e.target.value)} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14}}>
                  <option value="">— Seleccionar centro —</option>
                  {CENTROS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:13,color:'#555',display:'block',marginBottom:4,fontWeight:500}}>Fecha de visita</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14}} />
              </div>
            </div>

            {/* Campo número de informe */}
            <div style={{marginBottom:'1rem'}}>
              <label style={{fontSize:13,color:'#555',display:'block',marginBottom:4,fontWeight:500}}>Número de informe</label>
              <input
                type="text"
                value={numeroInforme}
                onChange={e => setNumeroInforme(e.target.value)}
                placeholder="Ej: 001"
                style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,color:'#222',background:'#fff'}}
              />
            </div>

            <div style={{marginBottom:'1rem'}}>
              <label style={{fontSize:13,color:'#555',display:'block',marginBottom:8,fontWeight:500}}>¿Se utilizaron repuestos en esta visita?</label>
              <div style={{display:'flex',gap:10}}>
                <button onClick={() => handleUsaRepuestos(true)} style={{flex:1,padding:'11px',border:`2px solid ${usaRepuestos===true?'#1a6fa8':'#ddd'}`,borderRadius:8,background:usaRepuestos===true?'#e8f4fd':'#fff',color:usaRepuestos===true?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:usaRepuestos===true?600:400}}>
                  ✅ Sí, se utilizaron
                </button>
                <button onClick={() => handleUsaRepuestos(false)} style={{flex:1,padding:'11px',border:`2px solid ${usaRepuestos===false?'#ef5350':'#ddd'}`,borderRadius:8,background:usaRepuestos===false?'#FCEBEB':'#fff',color:usaRepuestos===false?'#c0392b':'#666',fontSize:13,cursor:'pointer',fontWeight:usaRepuestos===false?600:400}}>
                  ❌ No se utilizaron
                </button>
              </div>
            </div>
            {usaRepuestos === true && (
              <div style={{marginBottom:'1rem'}}>
                <label style={{fontSize:13,color:'#555',display:'block',marginBottom:8,fontWeight:500}}>Repuestos utilizados</label>
                <div style={{display:'flex',gap:8,marginBottom:6}}>
                  <span style={{flex:2,fontSize:11,color:'#aaa'}}>Nombre del repuesto</span>
                  <span style={{width:80,fontSize:11,color:'#aaa'}}>Cantidad</span>
                  <span style={{width:40}}></span>
                </div>
                {repuestos.map((r,i) => (
                  <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                    <input type="text" value={r.nombre} onChange={e => updateRepuesto(i,'nombre',e.target.value)} placeholder="Ej: Membrana RO"
                      style={{flex:2,padding:'11px 10px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,color:'#222',background:'#fff'}} />
                    <input type="number" min={1} value={r.cantidad}
                      onFocus={e => e.target.select()}
                      onChange={e => { const val = e.target.value; updateRepuesto(i, 'cantidad', val === '' ? '' : (parseInt(val) || 1)) }}
                      onBlur={e => { if (e.target.value === '') updateRepuesto(i, 'cantidad', 1) }}
                      style={{width:80,padding:'11px 8px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,color:'#222',background:'#fff'}} />
                    <button onClick={() => removeRepuesto(i)} style={{width:40,height:44,border:'1px solid #ddd',borderRadius:8,background:'#fff',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>✕</button>
                  </div>
                ))}
                <button onClick={addRepuesto} style={{fontSize:13,color:'#1a6fa8',background:'none',border:'none',cursor:'pointer',padding:'4px 0'}}>+ Agregar otro repuesto</button>
              </div>
            )}
            {usaRepuestos !== null && (
              <div style={{marginBottom:'1rem'}}>
                <label style={{fontSize:13,color:'#555',display:'block',marginBottom:4,fontWeight:500}}>Observaciones</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                  placeholder="Describe el trabajo realizado, condiciones del equipo, etc."
                  rows={4} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}
            {usaRepuestos !== null && (
              <div style={{marginBottom:'1.25rem'}}>
                <label style={{fontSize:13,color:'#555',display:'block',marginBottom:8,fontWeight:500}}>📷 Fotografías <span style={{color:'#aaa',fontWeight:400}}>(opcional)</span></label>
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
                {subiendoFotos && <p style={{fontSize:12,color:'#1a6fa8'}}>Subiendo fotos...</p>}
              </div>
            )}
            {usaRepuestos !== null && (
              <button onClick={handleSubmit} disabled={guardando||subiendoFotos} style={{width:isMobile?'100%':'auto',padding:'12px 28px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer'}}>
                {guardando ? 'Guardando...' : subiendoFotos ? 'Subiendo fotos...' : 'Guardar registro'}
              </button>
            )}
          </div>
        </>}

        {tab === 'historial' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Mis registros</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Historial completo de tus visitas</p>
          <div style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5'}}>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:10,marginBottom:'1rem'}}>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Filtrar por mes</label>
                <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={{width:'100%',padding:'9px 10px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los meses</option>
                  {MESES_NOMBRE.map((m,i) => <option key={i} value={String(i)}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Filtrar por centro</label>
                <select value={filtroCentroH} onChange={e => setFiltroCentroH(e.target.value)} style={{width:'100%',padding:'9px 10px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los centros</option>
                  {centrosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{fontSize:13,color:'#888',marginBottom:'1rem'}}>{registrosFiltrados.length} registros encontrados</div>
            {isMobile ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {registrosFiltrados.map(r => (
                  <div key={r.id} style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:600,color:'#1a1a2e'}}>{r.centro}</span>
                      <span style={badge(r.estado)}>{r.estado}</span>
                    </div>
                    <div style={{fontSize:12,color:'#888',marginBottom:4}}>{r.fecha?.toDate().toLocaleDateString('es-CL')}</div>
                    {r.numeroInforme && <div style={{fontSize:12,color:'#1a6fa8',marginBottom:4}}>N° Informe: {r.numeroInforme}</div>}
                    <div style={{fontSize:12,color:'#555',marginBottom:4}}>{formatRepuestos(r.repuestos)}</div>
                    {r.fotos && r.fotos.length > 0 && <div style={{fontSize:11,color:'#1a6fa8',marginBottom:6}}>📷 {r.fotos.length} foto(s)</div>}
                    {r.observaciones && <div style={{fontSize:12,color:'#888',marginBottom:8,fontStyle:'italic'}}>{r.observaciones}</div>}
                    <button onClick={() => abrirModal(r)} style={{width:'100%',padding:'7px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>Ver detalle</button>
                  </div>
                ))}
                {registrosFiltrados.length===0 && <p style={{textAlign:'center',color:'#aaa',padding:'1rem'}}>No hay registros con esos filtros</p>}
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Fecha','Centro','N° Informe','Repuestos','Fotos','Estado',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {registrosFiltrados.map(r => (
                    <tr key={r.id}>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',whiteSpace:'nowrap'}}>{r.fecha?.toDate().toLocaleDateString('es-CL')}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.centro}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',color:'#1a6fa8',fontWeight:500}}>{r.numeroInforme || '-'}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{formatRepuestos(r.repuestos)}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',color:'#1a6fa8'}}>{r.fotos?.length > 0 ? `📷 ${r.fotos.length}` : '-'}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}><span style={badge(r.estado)}>{r.estado}</span></td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <button onClick={() => abrirModal(r)} style={{padding:'4px 10px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>Ver detalle</button>
                      </td>
                    </tr>
                  ))}
                  {registrosFiltrados.length===0 && <tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay registros</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>}

        {/* TAB REGISTRAR INFORME */}
        {tab === 'informes' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Registrar Informe de Desinfección</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Técnico responsable: <strong>{nombreTecnico}</strong></p>
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
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
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
            <div style={{marginBottom:'1rem'}}>
              <div style={{display:'flex',gap:10}}>
                <button onClick={() => setI('quimico', 'Cloro comercial')} style={{flex:1,padding:'10px',border:`2px solid ${informe.quimico==='Cloro comercial'?'#1a6fa8':'#ddd'}`,borderRadius:8,background:informe.quimico==='Cloro comercial'?'#e8f4fd':'#fff',color:informe.quimico==='Cloro comercial'?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:informe.quimico==='Cloro comercial'?600:400}}>Cloro comercial</button>
                <button onClick={() => setI('quimico', 'Ácido peracético')} style={{flex:1,padding:'10px',border:`2px solid ${informe.quimico==='Ácido peracético'?'#1a6fa8':'#ddd'}`,borderRadius:8,background:informe.quimico==='Ácido peracético'?'#e8f4fd':'#fff',color:informe.quimico==='Ácido peracético'?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:informe.quimico==='Ácido peracético'?600:400}}>Ácido peracético</button>
              </div>
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
              <p style={{fontSize:12,color:'#1a6fa8',marginTop:8}}>Hora de término calculada automáticamente al generar el informe.</p>
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
                      <label style={labelStyle}>N° sala de reparación monitores (presencia) — formato x,y,z</label>
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
                      <label style={labelStyle}>N° sala de reparación monitores (ausencia) — formato x,y,z</label>
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

        {/* TAB MIS INFORMES */}
        {tab === 'misinformes' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Mis informes</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Historial de informes de desinfección generados</p>
          <div style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5'}}>
            <div style={{fontSize:13,color:'#888',marginBottom:'1rem'}}>{misInformes.length} informes generados</div>
            {isMobile ? (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {misInformes.map(inf => (
                  <div key={inf.id} style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#1a1a2e',marginBottom:4}}>{inf.cliente}</div>
                    <div style={{fontSize:12,color:'#888',marginBottom:8}}>{inf.fechaServicio} · {inf.tecnicoResponsable}</div>
                    <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{display:'block',textAlign:'center',padding:'7px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:12,textDecoration:'none'}}>
                      📥 Descargar PDF
                    </a>
                  </div>
                ))}
                {misInformes.length===0 && <p style={{textAlign:'center',color:'#aaa',padding:'1rem'}}>No hay informes generados aún</p>}
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Cliente','Fecha servicio','Técnico',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {misInformes.map(inf => (
                    <tr key={inf.id}>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.cliente}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.fechaServicio}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{inf.tecnicoResponsable}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <a href={inf.pdfUrl} target="_blank" rel="noopener noreferrer" style={{padding:'4px 10px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',borderRadius:6,fontSize:11,textDecoration:'none'}}>
                          📥 Descargar
                        </a>
                      </td>
                    </tr>
                  ))}
                  {misInformes.length===0 && <tr><td colSpan={4} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay informes generados aún</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>}
      </div>

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'1px solid #eee',display:'flex',zIndex:100,boxShadow:'0 -2px 10px rgba(0,0,0,0.08)'}}>
          <div onClick={() => goTab('inicio')} style={navTab(tab==='inicio')}>
            <span style={{fontSize:18}}>🏠</span><span>Inicio</span>
          </div>
          <div onClick={() => goTab('registro')} style={navTab(tab==='registro')}>
            <span style={{fontSize:18}}>➕</span><span>Visita</span>
          </div>
          <div onClick={() => goTab('historial')} style={navTab(tab==='historial')}>
            <span style={{fontSize:18}}>📋</span><span>Registros</span>
          </div>
          <div onClick={() => goTab('informes')} style={navTab(tab==='informes')}>
            <span style={{fontSize:18}}>🧪</span><span>Informe</span>
          </div>
          <div onClick={() => goTab('misinformes')} style={navTab(tab==='misinformes')}>
            <span style={{fontSize:18}}>📄</span><span>Mis inf.</span>
          </div>
        </div>
      )}
    </div>
  )
}