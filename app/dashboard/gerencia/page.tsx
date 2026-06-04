'use client'
import { useState, useEffect } from 'react'
import { auth, db } from '../../../lib/firebase'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, Tooltip, Legend, LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts'

const ESTADOS = ['Pendiente', 'En revisión', 'Cobrado']
const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function GerenciaPage() {
  const [user, setUser] = useState<any>(null)
  const [tab, setTab] = useState('inicio')
  const [registros, setRegistros] = useState<any[]>([])
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTecnico, setFiltroTecnico] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('')
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const [modalRegistro, setModalRegistro] = useState<any>(null)
  const [editando, setEditando] = useState(false)
  const [editRepuestos, setEditRepuestos] = useState<{nombre:string,cantidad:number}[]>([])
  const [editObservaciones, setEditObservaciones] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editUsaRepuestos, setEditUsaRepuestos] = useState(true)
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const router = useRouter()

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

  const handleLogout = async () => { await signOut(auth); router.push('/') }

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    await updateDoc(doc(db, 'visitas', id), { estado: nuevoEstado })
  }

  const irARevisiones = (estado: string) => {
    setFiltroEstado(estado); setFiltroTecnico(''); setFiltroCentro('')
    setTab('registros'); setSubmenuOpen(true)
  }

  // Parsear repuestos — pueden ser string[] o {nombre,cantidad}[]
  const parsearRepuestos = (repuestos: any[]): {nombre:string,cantidad:number}[] => {
    if (!repuestos || repuestos.length === 0) return []
    if (typeof repuestos[0] === 'string') return repuestos.map(r => ({nombre:r, cantidad:1}))
    return repuestos
  }

  const abrirModal = (r: any) => {
    setModalRegistro(r)
    const parsed = parsearRepuestos(r.repuestos || [])
    setEditRepuestos(parsed.length > 0 ? parsed : [{nombre:'',cantidad:1}])
    setEditObservaciones(r.observaciones || '')
    setEditEstado(r.estado || 'Pendiente')
    setEditUsaRepuestos(r.repuestos && r.repuestos.length > 0)
    setEditando(false)
  }

  const cerrarModal = () => { setModalRegistro(null); setEditando(false) }

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
    const repuestosGuardar = editUsaRepuestos
      ? editRepuestos.filter(r => r.nombre.trim()).map(r => ({nombre:r.nombre, cantidad:r.cantidad}))
      : []
    await updateDoc(doc(db, 'visitas', modalRegistro.id), {
      repuestos: repuestosGuardar,
      observaciones: editObservaciones,
      estado: editEstado,
      usaRepuestos: editUsaRepuestos,
    })
    setGuardandoEdit(false)
    setEditando(false)
    setModalRegistro({...modalRegistro, repuestos: repuestosGuardar, observaciones: editObservaciones, estado: editEstado})
  }

  const registrosFiltrados = registros.filter(r => {
    if (filtroTecnico && r.tecnico !== filtroTecnico) return false
    if (filtroCentro && r.centro !== filtroCentro) return false
    if (filtroEstado && r.estado !== filtroEstado) return false
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
  const totalRepuestos = registros.reduce((acc, r) => {
    if (!r.repuestos) return acc
    return acc + r.repuestos.reduce((a:number, rep:any) => a + (typeof rep === 'object' ? (rep.cantidad||1) : 1), 0)
  }, 0)

  const centroCount: Record<string,number> = {}
  registros.forEach(r => {
    if (r.repuestos) centroCount[r.centro] = (centroCount[r.centro] || 0) + r.repuestos.length
  })
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

  const badge = (estado: string) => ({
    display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,
    background:estado==='Pendiente'?'#FCEBEB':estado==='Cobrado'?'#EAF3DE':'#FAEEDA',
    color:estado==='Pendiente'?'#c0392b':estado==='Cobrado'?'#27ae60':'#e67e22'
  })

  const navItem = (active: boolean) => ({
    display:'flex',alignItems:'center',gap:10,padding:'12px 1rem',
    color:active?'#fff':'rgba(255,255,255,0.8)',fontSize:14,cursor:'pointer',
    background:active?'rgba(255,255,255,0.18)':'transparent',
    borderLeft:active?'3px solid #fff':'3px solid transparent'
  })
  const subItem = (active: boolean) => ({
    display:'flex',alignItems:'center',gap:8,padding:'9px 1rem 9px 2.5rem',
    color:active?'#fff':'rgba(255,255,255,0.65)',fontSize:13,cursor:'pointer',
    background:active?'rgba(255,255,255,0.12)':'transparent',
    borderLeft:active?'3px solid #fff':'3px solid transparent'
  })

  const kpis = [
    {label:'Repuestos utilizados este mes', value:totalRepuestos, sub:'+15% vs mes anterior', subColor:'#27ae60', icon:'/icon-repuestos.png', cursor:false, onClick:undefined},
    {label:'Visitas con repuestos este mes', value:registrosMesConRepuestos.length, sub:'Solo visitas con repuestos', subColor:'#2196f3', icon:'/icon-visitas.png', cursor:false, onClick:undefined},
    {label:'Pendientes de cobro', value:pendientes, sub:'Ver pendientes →', subColor:'#ef5350', icon:'/icon-pendientes.png', cursor:true, onClick:() => irARevisiones('Pendiente')},
    {label:'Repuestos cobrados este mes', value:cobrados, sub:'Ver cobrados →', subColor:'#27ae60', icon:'/icon-cobrados.png', cursor:true, onClick:() => irARevisiones('Cobrado')},
    {label:'Centros visitados este mes', value:[...new Set(registrosMes.map((r:any)=>r.centro))].length, sub:'Todas las visitas del mes', subColor:'#2196f3', icon:'/icon-centros.png', cursor:false, onClick:undefined},
  ]

  // Formatear repuestos para mostrar en tabla
  const formatRepuestos = (repuestos: any[]) => {
    if (!repuestos || repuestos.length === 0) return 'Sin repuestos'
    return repuestos.map(r => typeof r === 'object' ? `${r.nombre} (x${r.cantidad})` : r).join(', ')
  }

  const TablaRegistros = ({lista}: {lista:any[]}) => (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
      <thead><tr>{['Fecha','Centro','Técnico','Repuesto(s)','Estado','Cambiar',''].map(h => (
        <th key={h} style={{textAlign:'left',padding:'8px',color:'#aaa',borderBottom:'1px solid #f0f0f0',fontWeight:500}}>{h}</th>
      ))}</tr></thead>
      <tbody>
        {lista.map(r => (
          <tr key={r.id}>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',whiteSpace:'nowrap'}}>{r.fecha?.toDate().toLocaleDateString('es-CL')}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.centro}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>{r.tecnico}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8',maxWidth:180}}>{formatRepuestos(r.repuestos)}</td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}><span style={badge(r.estado)}>{r.estado}</span></td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
              <select value={r.estado} onChange={e => cambiarEstado(r.id, e.target.value)} style={{padding:'3px 6px',border:'1px solid #ddd',borderRadius:6,fontSize:11,cursor:'pointer'}}>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </td>
            <td style={{padding:'9px 8px',borderBottom:'1px solid #f8f8f8'}}>
              <button onClick={() => abrirModal(r)} style={{padding:'4px 10px',background:'#1a6fa8',color:'#fff',border:'none',borderRadius:6,fontSize:11,cursor:'pointer'}}>
                Ver detalle
              </button>
            </td>
          </tr>
        ))}
        {lista.length===0 && <tr><td colSpan={7} style={{padding:'2rem',textAlign:'center',color:'#aaa'}}>No hay registros</td></tr>}
      </tbody>
    </table>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh'}}>

      {/* MODAL */}
      {modalRegistro && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={cerrarModal}>
          <div style={{background:'#fff',borderRadius:16,padding:'2rem',width:540,maxWidth:'90vw',maxHeight:'88vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}} onClick={e => e.stopPropagation()}>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
              <div>
                <h2 style={{fontSize:18,fontWeight:700,color:'#1a1a2e',marginBottom:2}}>Detalle de visita</h2>
                <p style={{fontSize:13,color:'#888'}}>{modalRegistro.fecha?.toDate().toLocaleDateString('es-CL')}</p>
              </div>
              <button onClick={cerrarModal} style={{background:'none',border:'none',fontSize:24,cursor:'pointer',color:'#aaa'}}>×</button>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:'1.25rem'}}>
              <div style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
                <div style={{fontSize:11,color:'#aaa',marginBottom:4}}>Técnico</div>
                <div style={{fontSize:14,fontWeight:600,color:'#1a1a2e'}}>{modalRegistro.tecnico}</div>
              </div>
              <div style={{background:'#f7f9fc',borderRadius:10,padding:'12px'}}>
                <div style={{fontSize:11,color:'#aaa',marginBottom:4}}>Centro</div>
                <div style={{fontSize:14,fontWeight:600,color:'#1a1a2e'}}>{modalRegistro.centro}</div>
              </div>
            </div>

            {/* Estado */}
            <div style={{marginBottom:'1.25rem'}}>
              <div style={{fontSize:12,color:'#555',marginBottom:6,fontWeight:500}}>Estado</div>
              {editando ? (
                <select value={editEstado} onChange={e => setEditEstado(e.target.value)} style={{width:'100%',padding:'9px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13}}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              ) : (
                <span style={badge(editEstado)}>{editEstado}</span>
              )}
            </div>

            {/* ¿Se usaron repuestos? */}
            {editando && (
              <div style={{marginBottom:'1.25rem'}}>
                <div style={{fontSize:12,color:'#555',marginBottom:8,fontWeight:500}}>¿Se utilizaron repuestos?</div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={() => handleUsaRepuestosChange(true)} style={{flex:1,padding:'9px',border:`2px solid ${editUsaRepuestos?'#2196f3':'#ddd'}`,borderRadius:8,background:editUsaRepuestos?'#e8f4fd':'#fff',color:editUsaRepuestos?'#1a6fa8':'#666',fontSize:13,cursor:'pointer',fontWeight:editUsaRepuestos?600:400}}>
                    ✅ Sí, se utilizaron
                  </button>
                  <button onClick={() => handleUsaRepuestosChange(false)} style={{flex:1,padding:'9px',border:`2px solid ${!editUsaRepuestos?'#ef5350':'#ddd'}`,borderRadius:8,background:!editUsaRepuestos?'#FCEBEB':'#fff',color:!editUsaRepuestos?'#c0392b':'#666',fontSize:13,cursor:'pointer',fontWeight:!editUsaRepuestos?600:400}}>
                    ❌ No se utilizaron
                  </button>
                </div>
              </div>
            )}

            {/* Repuestos */}
            {!editando && (
              <div style={{marginBottom:'1.25rem'}}>
                <div style={{fontSize:12,color:'#555',marginBottom:6,fontWeight:500}}>Repuestos utilizados</div>
                {modalRegistro.repuestos && modalRegistro.repuestos.length > 0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {parsearRepuestos(modalRegistro.repuestos).map((r,i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f0f7ff',borderRadius:8,padding:'8px 12px'}}>
                        <span style={{fontSize:13,color:'#1a1a2e'}}>{r.nombre}</span>
                        <span style={{fontSize:12,color:'#1a6fa8',fontWeight:600,background:'#d0e8fb',padding:'2px 10px',borderRadius:20}}>x{r.cantidad}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{background:'#f7f9fc',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#aaa'}}>Sin repuestos utilizados</div>
                )}
              </div>
            )}

            {editando && editUsaRepuestos && (
              <div style={{marginBottom:'1.25rem'}}>
                <div style={{fontSize:12,color:'#555',marginBottom:6,fontWeight:500}}>Repuestos utilizados</div>
                {editRepuestos.map((r,i) => (
                  <div key={i} style={{display:'flex',gap:8,marginBottom:6,alignItems:'center'}}>
                    <input value={r.nombre} onChange={e => { const arr=[...editRepuestos]; arr[i]={...arr[i],nombre:e.target.value}; setEditRepuestos(arr) }}
                      placeholder="Nombre del repuesto"
                      style={{flex:2,padding:'8px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13}} />
                    <input type="number" min={1} value={r.cantidad} onChange={e => { const arr=[...editRepuestos]; arr[i]={...arr[i],cantidad:parseInt(e.target.value)||1}; setEditRepuestos(arr) }}
                      placeholder="Cant."
                      style={{flex:1,padding:'8px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13}} />
                    <button onClick={() => setEditRepuestos(editRepuestos.filter((_,idx)=>idx!==i))}
                      style={{padding:'8px 12px',border:'1px solid #ddd',borderRadius:8,background:'#fff',cursor:'pointer',color:'#888'}}>✕</button>
                  </div>
                ))}
                <button onClick={() => setEditRepuestos([...editRepuestos,{nombre:'',cantidad:1}])}
                  style={{fontSize:13,color:'#1a6fa8',background:'none',border:'none',cursor:'pointer',padding:'4px 0'}}>+ Agregar repuesto</button>
              </div>
            )}

            {/* Observaciones */}
            <div style={{marginBottom:'1.5rem'}}>
              <div style={{fontSize:12,color:'#555',marginBottom:6,fontWeight:500}}>Observaciones</div>
              {editando ? (
                <textarea value={editObservaciones} onChange={e => setEditObservaciones(e.target.value)} rows={3}
                  style={{width:'100%',padding:'9px 10px',border:'1.5px solid #2196f3',borderRadius:8,fontSize:13,resize:'vertical'}} />
              ) : (
                <div style={{background:'#f7f9fc',borderRadius:10,padding:'12px',fontSize:13,color:editObservaciones?'#1a1a2e':'#aaa',minHeight:60}}>
                  {editObservaciones || 'Sin observaciones'}
                </div>
              )}
            </div>

            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              {editando ? (
                <>
                  <button onClick={() => setEditando(false)} style={{padding:'9px 20px',border:'1px solid #ddd',borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer',color:'#666'}}>Cancelar</button>
                  <button onClick={guardarEdicion} disabled={guardandoEdit} style={{padding:'9px 20px',background:'#1a6fa8',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                    {guardandoEdit ? 'Guardando...' : '✅ Guardar cambios'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={cerrarModal} style={{padding:'9px 20px',border:'1px solid #ddd',borderRadius:8,background:'#fff',fontSize:13,cursor:'pointer',color:'#666'}}>Cerrar</button>
                  <button onClick={() => setEditando(true)} style={{padding:'9px 20px',background:'#1a6fa8',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>✏️ Editar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div style={{width:220,background:'linear-gradient(180deg, #1a3a6b 0%, #2196f3 100%)',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'1rem',borderBottom:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',gap:10}}>
          <img src="/logo.png" alt="SIAC" style={{width:42,height:42,borderRadius:10,background:'#fff',padding:3,objectFit:'contain'}} />
          <div>
            <div style={{color:'#fff',fontSize:15,fontWeight:700,lineHeight:1}}>SIAC</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:10}}>INGENIERÍA</div>
          </div>
        </div>
        <div style={navItem(tab==='inicio')} onClick={() => setTab('inicio')}>🏠 Inicio</div>
        <div style={navItem(tab==='registros')} onClick={() => { setSubmenuOpen(!submenuOpen); setTab('registros'); setFiltroEstado('') }}>
          🔍 Revisiones <span style={{marginLeft:'auto',fontSize:11}}>{submenuOpen?'▲':'▼'}</span>
        </div>
        {submenuOpen && <>
          <div style={subItem(tab==='registros'&&filtroEstado==='')} onClick={() => irARevisiones('')}>📋 Todos</div>
          <div style={subItem(tab==='registros'&&filtroEstado==='Pendiente')} onClick={() => irARevisiones('Pendiente')}>⏳ Pendientes</div>
          <div style={subItem(tab==='registros'&&filtroEstado==='En revisión')} onClick={() => irARevisiones('En revisión')}>🔎 En revisión</div>
          <div style={subItem(tab==='registros'&&filtroEstado==='Cobrado')} onClick={() => irARevisiones('Cobrado')}>✅ Cobrados</div>
        </>}
        <div style={{marginTop:'auto',padding:'1rem',borderTop:'1px solid rgba(255,255,255,0.15)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#fff'}}>GO</div>
            <div style={{color:'rgba(255,255,255,0.9)',fontSize:12}}>Jefe de Operaciones</div>
          </div>
          <button onClick={handleLogout} style={{width:'100%',padding:'7px',background:'transparent',border:'1px solid rgba(255,255,255,0.3)',borderRadius:8,color:'rgba(255,255,255,0.8)',fontSize:12,cursor:'pointer'}}>
            ← Cerrar sesión
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,padding:'1.5rem',background:'#f7f9fc',overflowY:'auto'}}>
        {tab === 'inicio' && <>
          <div style={{marginBottom:'1.5rem'}}>
            <h1 style={{fontSize:26,fontWeight:700,color:'#1a1a2e',marginBottom:2}}>Inicio</h1>
            <p style={{color:'#888',fontSize:14}}>Resumen general de repuestos y visitas</p>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:'1.5rem'}}>
            {kpis.map((k,i) => (
              <div key={i} onClick={k.onClick} style={{background:'#fff',borderRadius:12,padding:'1rem',border:'1px solid #eef0f5',cursor:k.cursor?'pointer':'default',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <img src={k.icon} alt="" style={{width:60,height:60,borderRadius:10,objectFit:'cover'}} />
                  <div style={{fontSize:12,color:'#888',lineHeight:1.3}}>{k.label}</div>
                </div>
                <div style={{fontSize:28,fontWeight:700,color:'#1a1a2e',marginBottom:2}}>{k.value}</div>
                <div style={{fontSize:11,color:k.subColor}}>{k.sub}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1.5fr 1fr',gap:12,marginBottom:'1rem'}}>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem'}}>Repuestos utilizados últimos 6 meses</div>
              <ResponsiveContainer width="100%" height={200}>
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
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem'}}>Top 5 centros con más repuestos</div>
              {top5.length===0 ? <p style={{color:'#aaa',textAlign:'center',padding:'2rem 0'}}>Sin datos aún</p> : (
                <ResponsiveContainer width="100%" height={200}>
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
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={dataPie} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {dataPie.map((e,i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{fontSize:11}} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12}}>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <div style={{fontWeight:600,color:'#1a1a2e'}}>Últimos registros con repuestos</div>
                <button onClick={() => irARevisiones('')} style={{fontSize:12,color:'#2196f3',background:'none',border:'none',cursor:'pointer'}}>Ver todos →</button>
              </div>
              <TablaRegistros lista={registros.slice(0,5)} />
            </div>
            <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
              <div style={{fontWeight:600,color:'#1a1a2e',marginBottom:'1rem'}}>Pendientes importantes</div>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div onClick={() => irARevisiones('Pendiente')} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px',background:'#fff9f9',borderRadius:8,border:'1px solid #fce4e4',cursor:'pointer'}}>
                  <img src="/icon-pendientes.png" alt="" style={{width:60,height:60,borderRadius:8,objectFit:'cover'}} />
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#c0392b'}}>{pendientes} repuestos pendientes</div>
                    <div style={{fontSize:11,color:'#888'}}>Requieren atención</div>
                  </div>
                </div>
                <div onClick={() => irARevisiones('En revisión')} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px',background:'#fffbf0',borderRadius:8,border:'1px solid #fde8a0',cursor:'pointer'}}>
                  <img src="/icon-visitas.png" alt="" style={{width:60,height:60,borderRadius:8,objectFit:'cover'}} />
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#e67e22'}}>{enRevision} en revisión</div>
                    <div style={{fontSize:11,color:'#888'}}>Revisar detalle</div>
                  </div>
                </div>
                <div onClick={() => irARevisiones('Cobrado')} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px',background:'#f0fbf8',borderRadius:8,border:'1px solid #b2dfdb',cursor:'pointer'}}>
                  <img src="/icon-cobrados.png" alt="" style={{width:60,height:60,borderRadius:8,objectFit:'cover'}} />
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'#27ae60'}}>{cobrados} cobrados</div>
                    <div style={{fontSize:11,color:'#888'}}>Todo en orden</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>}

        {tab === 'registros' && <>
          <h1 style={{fontSize:22,fontWeight:700,marginBottom:4,color:'#1a1a2e'}}>
            {filtroEstado===''?'Todos los registros':filtroEstado==='Pendiente'?'⏳ Pendientes de cobro':filtroEstado==='En revisión'?'🔎 En revisión':'✅ Cobrados'}
          </h1>
          <p style={{color:'#888',marginBottom:'1.5rem',fontSize:14}}>Filtra y gestiona todos los registros</p>
          <div style={{background:'#fff',borderRadius:12,padding:'1.25rem',border:'1px solid #eef0f5'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:'1rem'}}>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Técnico</label>
                <select value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} style={{width:'100%',padding:'8px 10px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los técnicos</option>
                  {tecnicosUnicos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Centro</label>
                <select value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)} style={{width:'100%',padding:'8px 10px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los centros</option>
                  {centrosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:'#888',display:'block',marginBottom:4}}>Estado</label>
                <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{width:'100%',padding:'8px 10px',border:'1px solid #ddd',borderRadius:8,fontSize:13}}>
                  <option value="">Todos los estados</option>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div style={{fontSize:13,color:'#888',marginBottom:'1rem'}}>{registrosFiltrados.length} registros encontrados</div>
            <TablaRegistros lista={registrosFiltrados} />
          </div>
        </>}
      </div>
    </div>
  )
}