'use client'
import { useState, useEffect } from 'react'
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recordar, setRecordar] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const savedEmail = localStorage.getItem('siac_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRecordar(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await setPersistence(auth, recordar ? browserLocalPersistence : browserSessionPersistence)
      await signInWithEmailAndPassword(auth, email, password)
      if (recordar) {
        localStorage.setItem('siac_email', email)
      } else {
        localStorage.removeItem('siac_email')
      }
      if (email === 'informessiacingenieria@gmail.com') {
        router.push('/dashboard/gerencia')
      } else {
        router.push('/dashboard/tecnico')
      }
    } catch (err) {
      setError('Correo o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg, #1a6fa8 0%, #1a3a6b 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'#fff',borderRadius:20,padding:'2.5rem 2rem',width:'100%',maxWidth:380,boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <img src="/logo.png" alt="SIAC" style={{width:140,height:'auto',marginBottom:12}} />
          <p style={{fontSize:13,color:'#888',marginTop:4}}>Sistema de gestión de repuestos</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'1rem'}}>
            <label style={{fontSize:13,color:'#555',display:'block',marginBottom:4,fontWeight:500}}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@siac-ingenieria.cl"
              required
              style={{width:'100%',padding:'12px 14px',border:'1.5px solid #d0e8f5',borderRadius:10,fontSize:14,outline:'none',background:'#f7fbff',color:'#222'}}
            />
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={{fontSize:13,color:'#555',display:'block',marginBottom:4,fontWeight:500}}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{width:'100%',padding:'12px 14px',border:'1.5px solid #d0e8f5',borderRadius:10,fontSize:14,outline:'none',background:'#f7fbff',color:'#222'}}
            />
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'1.25rem'}}>
            <input
              type="checkbox"
              id="recordar"
              checked={recordar}
              onChange={e => setRecordar(e.target.checked)}
              style={{width:16,height:16,cursor:'pointer',accentColor:'#1a6fa8'}}
            />
            <label htmlFor="recordar" style={{fontSize:13,color:'#555',cursor:'pointer'}}>Recordar sesión</label>
          </div>
          {error && <p style={{color:'#c0392b',fontSize:13,marginBottom:'0.8rem',textAlign:'center'}}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{width:'100%',padding:13,background:'linear-gradient(135deg, #2196f3 0%, #1a6fa8 100%)',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:600,cursor:'pointer'}}
          >
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}