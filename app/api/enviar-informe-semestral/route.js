import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const MESES_NOMBRE = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function capitalizar(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

// Acepta mes como número (1-12) o como nombre ya en texto
function nombreMes(mes) {
  const n = parseInt(mes)
  if (!isNaN(n) && n >= 1 && n <= 12) return capitalizar(MESES_NOMBRE[n - 1])
  return capitalizar(String(mes))
}

export async function POST(request) {
  try {
    const { pdfUrl, tecnicoNombre, cliente, diaInforme, mesInforme, anioInforme } = await request.json()

    if (!pdfUrl) {
      return Response.json({ error: 'Falta la URL del PDF' }, { status: 400 })
    }
    if (!cliente || !mesInforme || !anioInforme) {
      return Response.json({ error: 'Faltan datos del informe (cliente, mes o año)' }, { status: 400 })
    }

    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      return Response.json({ error: `No se pudo descargar el PDF desde Cloudinary (status ${pdfResponse.status})` }, { status: 500 })
    }
    const pdfBuffer = await pdfResponse.arrayBuffer()
    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      return Response.json({ error: 'El PDF descargado está vacío' }, { status: 500 })
    }
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    const destinatarios = ['informessiacingenieria@gmail.com']

    const mesTexto = nombreMes(mesInforme)
    const clienteLimpio = cliente.replace(/\s+/g, '_')
    const asunto = `Informe Semestral ${cliente} ${mesTexto} ${anioInforme}`
    const nombreArchivo = `Informe_Semestral_${clienteLimpio}_${mesTexto}_${anioInforme}.pdf`
    const fechaLarga = diaInforme ? `${diaInforme} de ${mesTexto} ${anioInforme}` : `${mesTexto} ${anioInforme}`

    const { data, error } = await resend.emails.send({
      from: 'SIAC Informes <onboarding@resend.dev>',
      to: destinatarios,
      subject: asunto,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #1a3a6b;">Informe Semestral generado</h2>
          <p><strong>Cliente:</strong> ${cliente}</p>
          <p><strong>Fecha del informe:</strong> ${fechaLarga}</p>
          <p><strong>Técnico responsable:</strong> ${tecnicoNombre}</p>
          <p>Se adjunta el informe en formato PDF.</p>
          <p style="color: #888; font-size: 12px; margin-top: 2rem;">Este correo fue generado automáticamente por el sistema SIAC.</p>
        </div>
      `,
      attachments: [
        {
          filename: nombreArchivo,
          content: pdfBase64,
          contentType: 'application/pdf',
        },
      ],
    })

    if (error) {
      console.error('Error Resend:', error)
      return Response.json({ error: error.message || JSON.stringify(error) }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (err) {
    console.error('Error enviando informe semestral:', err)
    return Response.json({ error: err.message || 'Error desconocido en el servidor' }, { status: 500 })
  }
}