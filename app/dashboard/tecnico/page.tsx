'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '../../../lib/firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

const CENTROS = [
  'CD Cendial Salamanca','CD Chacabuco','CD Dialsur','CD Interdial','CD La Reina',
  'CD Lampa','CD Los Andes','CD Mendoza','CD Nueva Vida Huepil','CD Nueva Vida Los Angeles',
  'CD Ñuñoa','CD Ñuñoa Pudahuel','CD Ñuñoa Quinta Normal','CD Pacifico','CD Padre Hurtado',
  'CD Rancagua Dial','CD San Lucas','CD Tabancura','CD Unidial','CD Urodial San Vicente',
  'CD Vespucio','CD Vidacare','CD Vidadial Collipulli','CD Vidadial Lanco','CD Vidadial Paillaco',
  'Ctro. Nefro. Puerto Montt','DAM Santiago','DAM Quilpué','Davila Cron','Davila UCI','Diamar',
  'HBTL Alimentación','HBTL Diálisis','HBTL Endoscopia','HBTL Esterilización','HBTL Sedile',
  'HBTL UTI 1','HCUCH Abla. y Panta Estéril','HCUCH Calderas','HCUCH DAN','HCUCH Diálisis',
  'Hemodiálisis Curicó','Hosp. Calbuco','Hosp. Curacautin','Hosp. Lautaro Antiguo',
  'Hosp. Lautaro Nuevo','Hosp. Luis Calvo Mackenna Diálisis','Hosp. Luis Calvo Mackenna Estéril',
  'Hosp. Maipú','Hosp. Nueva Imperial','Hosp. Osorno Diálisis','Hosp. Osorno Esterelización',
  'Hosp. Puerto Montt','Hosp. Purranque','Hosp. Salvador Diálisis','Hosp. Salvador Estéril',
  'Hosp. San Camilo','Hosp. San Jose','Hosp. Valdivia','Nefrodial Linares','Nefrodial Molina',
  'Nefrodial San Javier','Municipalidad Puerto Montt','Premio Nobel','Red Dialisis'
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

export default function TecnicoPage() {
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState('inicio')
  const [registros, setRegistros] = useState<any[]>([])
  const [centro, setCentro] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [usaRepuestos, setUsaRepuestos] = useState<boolean|null>(null)
  const [repuestos, setRepuestos] = useState<{nombre:string,cantidad:number}[]>([{nombre:'',cantidad:1}])
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroCentroH, setFiltroCentroH] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [modalRegistro, setModalRegistro] = useState<any>(null)
  const [editando, setEditando] = useState(false)
  const [editRepuestos, setEditRepuestos] = useState<{nombre:string,cantidad:number}[]>([])
  const [editObservaciones, setEditObservaciones] = useState('')
  const [editUsaRepuestos, setEditUsaRepuestos] = useState(true)
  const [guardandoEdit, setGuardandoEdit] = useState(false)
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

  const handleLogout = async () => { await signOut(auth); router.push('/') }

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
  const updateRepuesto = (i: number, field: string, val: string|number) => {
    const r = [...repuestos]; r[i] = {...r[i],[field]:val}; setRepuestos(r)
  }

  const handleSubmit = async () => {
    if (!centro) { alert('Por favor selecciona un centro'); return }
    if (usaRepuestos === null) { alert('Por favor indica si se utilizaron repuestos'); return }
    if (usaRepuestos && repuestos.filter(r => r.nombre.trim()).length === 0) { alert('Por favor agrega al menos un repuesto'); return }
    setGuardando(true)
    try {
      await addDoc(collection(db, 'visitas'), {
        uid: user.uid, tecnico: TECNICOS[user.email] || user.email, email: user.email, centro,
        fecha: Timestamp.fromDate(new Date(fecha + 'T12:00:00')),
        repuestos: usaRepuestos ? repuestos.filter(r => r.nombre.trim()) : [],
        usaRepuestos, observaciones, estado: 'Pendiente', creadoEn: Timestamp.now()
      })
      setExito(true)
      setCentro(''); setRepuestos([{nombre:'',cantidad:1}]); setObservaciones('')
      setFecha(new Date().toISOString().split('T')[0]); setUsaRepuestos(null)
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
    setEditando(false)
  }

  const cerrarModal = () => { setModalRegistro(null); setEditando(false) }

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
    const repsGuardar = editUsaRepuestos ? editRepuestos.filter(r => r.nombre.trim()) : []
    await updateDoc(doc(db, 'visitas', modalRegistro.id), {
      repuestos: repsGuardar, observaciones: editObservaciones, usaRepuestos: editUsaRepuestos,
    })
    setGuardandoEdit(false); setEditando(false)
    setModalRegistro({...modalRegistro, repuestos: repsGuardar, observaciones: editObservaciones})
  }

  const nombreTecnico = user ? (TECNICOS[user.email] || user.email) : ''
  const iniciales = nombreTecnico.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()
  const mesActual = new Date().getMonth()
  const mesYear = new Date().getFullYear()
  const registrosMes = registros.filter(r => { const fd = r.fecha?.toDate(); return fd && fd.getMonth()===mesActual && fd.getFullYear()===mesYear })
  const registrosMesConRepuestos = registrosMes.filter(r => r.repuestos && r.repuestos.length > 0)
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

  return (
    <div style={{display:'flex',minHeight:'100vh',flexDirection: isMobile?'column':'row'}}>

      {/* MODAL */}
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
                        placeholder="Nombre" style={{flex:2,padding:'8px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13}} />
                      <input type="number" min={1} value={r.cantidad} onChange={e => { const arr=[...editRepuestos]; arr[i]={...arr[i],cantidad:parseInt(e.target.value)||1}; setEditRepuestos(arr) }}
                        style={{flex:1,padding:'8px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13}} />
                      <button onClick={() => setEditRepuestos(editRepuestos.filter((_,idx)=>idx!==i))} style={{width:36,height:36,border:'1px solid #ddd',borderRadius:8,background:'#fff',cursor:'pointer',color:'#888'}}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => setEditRepuestos([...editRepuestos,{nombre:'',cantidad:1}])} style={{fontSize:13,color:'#1a6fa8',background:'none',border:'none',cursor:'pointer'}}>+ Agregar</button>
                </div>
              ) : null}
            </div>
            <div style={{marginBottom:'1.25rem'}}>
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
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              {editando ? (
                <>
                  <button onClick={() => setEditando(false)} style={{padding:'9px 16px',border:'1px solid #ddd',borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer',color:'#666'}}>Cancelar</button>
                  <button onClick={guardarEdicion} disabled={guardandoEdit} style={{padding:'9px 16px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
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
        <div style={{width:sidebarOpen?220:64,background:'linear-gradient(180deg, #1a3a6b 0%, #2196f3 100%)',display:'flex',flexDirection:'column',transition:'width 0.3s ease',overflow:'hidden',flexShrink:0}}>
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
          {[{id:'inicio',icon:'🏠',label:'Inicio'},{id:'registro',icon:'➕',label:'Registrar visita'},{id:'historial',icon:'📋',label:'Mis registros'}].map(item => (
            <div key={item.id} onClick={() => goTab(item.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 1rem',color:tab===item.id?'#fff':'rgba(255,255,255,0.8)',fontSize:14,cursor:'pointer',background:tab===item.id?'rgba(255,255,255,0.18)':'transparent',borderLeft:tab===item.id?'3px solid #fff':'3px solid transparent',whiteSpace:'nowrap',overflow:'hidden'}}>
              <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </div>
          ))}
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
          <button onClick={handleLogout} style={{background:'rgba(255,255,255,0.15)',border:'none',borderRadius:8,color:'#fff',fontSize:12,padding:'6px 12px',cursor:'pointer'}}>
            Salir
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{flex:1,padding:isMobile?'1rem':'1.5rem',background:'#f7f9fc',overflowY:'auto',paddingBottom:isMobile?'80px':'1.5rem'}}>

        {tab === 'inicio' && <>
          <h1 style={{fontSize:isMobile?20:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>Bienvenido, {nombreTecnico.split(' ')[0]}</h1>
          <p style={{color:'#888',marginBottom:'1.25rem',fontSize:14}}>Resumen de tus visitas y repuestos</p>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)',gap:10,marginBottom:'1.25rem'}}>
            {[
              {icon:'/icon-repuestos.png', label:'Repuestos este mes', value:registrosMesConRepuestos.reduce((acc,r) => acc+(r.repuestos?.length||0),0), sub:'Solo visitas con repuestos'},
              {icon:'/icon-visitas.png', label:'Visitas con repuestos este mes', value:registrosMesConRepuestos.length, sub:'Con repuestos utilizados'},
              {icon:'/icon-centros.png', label:'Total registros', value:registros.length, sub:'Con y sin repuestos'},
            ].map((k,i) => (
              <div key={i} onClick={() => setTab('historial')} style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5',boxShadow:'0 1px 4px rgba(0,0,0,0.04)',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
                <img src={k.icon} alt="" style={{width:60,height:60,borderRadius:10,objectFit:'cover',flexShrink:0}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:'#888',marginBottom:4}}>{k.label}</div>
                  <div style={{fontSize:24,fontWeight:700,color:'#1a1a2e'}}>{k.value}</div>
                  <div style={{fontSize:11,color:'#2196f3',marginTop:2}}>{k.sub} →</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',fontSize:14}}>Últimos registros</div>
              <button onClick={() => setTab('registro')} style={{padding:'7px 14px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:500}}>+ Nueva visita</button>
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
                <thead><tr>{['Fecha','Centro','Repuestos','Estado',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {registros.slice(0,5).map(r => (
                    <tr key={r.id}>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.fecha?.toDate().toLocaleDateString('es-CL')}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.centro}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{formatRepuestos(r.repuestos)}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}><span style={badge(r.estado)}>{r.estado}</span></td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <button onClick={() => abrirModal(r)} style={{padding:'4px 10px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>Ver detalle</button>
                      </td>
                    </tr>
                  ))}
                  {registros.length===0 && <tr><td colSpan={5} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay registros aún</td></tr>}
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
                {repuestos.map((r,i) => (
                  <div key={i} style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                    <input type="text" value={r.nombre} onChange={e => updateRepuesto(i,'nombre',e.target.value)} placeholder="Nombre del repuesto"
                      style={{flex:2,padding:'11px 10px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14}} />
                    <input type="number" min={1} value={r.cantidad} onChange={e => updateRepuesto(i,'cantidad',parseInt(e.target.value)||1)}
                      style={{width:70,padding:'11px 8px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14}} />
                    <button onClick={() => removeRepuesto(i)} style={{width:40,height:40,border:'1px solid #ddd',borderRadius:8,background:'#fff',cursor:'pointer',color:'#888',fontSize:18,flexShrink:0}}>✕</button>
                  </div>
                ))}
                <button onClick={addRepuesto} style={{fontSize:13,color:'#1a6fa8',background:'none',border:'none',cursor:'pointer',padding:'4px 0'}}>+ Agregar otro repuesto</button>
              </div>
            )}
            {usaRepuestos !== null && (
              <div style={{marginBottom:'1.25rem'}}>
                <label style={{fontSize:13,color:'#555',display:'block',marginBottom:4,fontWeight:500}}>Observaciones</label>
                <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)}
                  placeholder="Describe el trabajo realizado, condiciones del equipo, etc."
                  rows={4} style={{width:'100%',padding:'11px',border:'1.5px solid #ddd',borderRadius:8,fontSize:14,resize:'vertical'}} />
              </div>
            )}
            {usaRepuestos !== null && (
              <button onClick={handleSubmit} disabled={guardando} style={{width:isMobile?'100%':'auto',padding:'12px 28px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer'}}>
                {guardando ? 'Guardando...' : 'Guardar registro'}
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
                    <div style={{fontSize:12,color:'#555',marginBottom:4}}>{formatRepuestos(r.repuestos)}</div>
                    {r.observaciones && <div style={{fontSize:12,color:'#888',marginBottom:8,fontStyle:'italic'}}>{r.observaciones}</div>}
                    <button onClick={() => abrirModal(r)} style={{width:'100%',padding:'7px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:6,fontSize:12,cursor:'pointer'}}>Ver detalle</button>
                  </div>
                ))}
                {registrosFiltrados.length===0 && <p style={{textAlign:'center',color:'#aaa',padding:'1rem'}}>No hay registros con esos filtros</p>}
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Fecha','Centro','Repuestos','Observaciones','Estado',''].map(h => (
                  <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {registrosFiltrados.map(r => (
                    <tr key={r.id}>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',whiteSpace:'nowrap'}}>{r.fecha?.toDate().toLocaleDateString('es-CL')}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.centro}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{formatRepuestos(r.repuestos)}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',color:'#888',maxWidth:180}}>{r.observaciones || '-'}</td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}><span style={badge(r.estado)}>{r.estado}</span></td>
                      <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
                        <button onClick={() => abrirModal(r)} style={{padding:'4px 10px',background:'linear-gradient(135deg, #1a3a6b 0%, #2196f3 100%)',color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>Ver detalle</button>
                      </td>
                    </tr>
                  ))}
                  {registrosFiltrados.length===0 && <tr><td colSpan={6} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay registros</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </>}
      </div>

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',borderTop:'1px solid #eee',display:'flex',zIndex:100,boxShadow:'0 -2px 10px rgba(0,0,0,0.08)'}}>
          {[{id:'inicio',icon:'🏠',label:'Inicio'},{id:'registro',icon:'➕',label:'Registrar'},{id:'historial',icon:'📋',label:'Registros'}].map(item => (
            <div key={item.id} onClick={() => goTab(item.id)} style={navTab(tab===item.id)}>
              <span style={{fontSize:22}}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}