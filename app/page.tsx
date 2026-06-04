'use client'
import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
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
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg, #1a6fa8 0%, #1a3a6b 100%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:20,padding:'2.5rem 2rem',width:380,boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
        <div style={{textAlign:'center',marginBottom:'2rem'}}>
          <img src="/logo.png" alt="SIAC" style={{width:140,height:'auto',marginBottom:12}} />
          <p style={{fontSize:13,color:'#888',marginTop:4}}>Sistema de gestión de repuestos</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{marginBottom:'1rem'}}>
            <label style={{fontSize:13,color:'#555',display:'block',marginBottom:4}}>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@siac-ingenieria.cl"
              required
              style={{width:'100%',padding:'11px 14px',border:'1.5px solid #d0e8f5',borderRadius:10,fontSize:14,outline:'none',background:'#f7fbff',color:'#222'}}
            />
          </div>
          <div style={{marginBottom:'1.2rem'}}>
            <label style={{fontSize:13,color:'#555',display:'block',marginBottom:4}}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{width:'100%',padding:'11px 14px',border:'1.5px solid #d0e8f5',borderRadius:10,fontSize:14,outline:'none',background:'#f7fbff',color:'#222'}}
            />
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
