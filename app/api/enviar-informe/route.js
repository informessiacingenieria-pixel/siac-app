import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatearFechaLarga(fechaTexto) {
  const partes = fechaTexto.split('/')
  if (partes.length !== 3) return fechaTexto
  const dia = partes[0]
  const mes = MESES[parseInt(partes[1]) - 1] || ''
  const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1)
  const anio = partes[2]
  return `${dia} de ${mesCap} ${anio}`
}

function formatearMesAnio(fechaTexto) {
  const partes = fechaTexto.split('/')
  if (partes.length !== 3) return fechaTexto
  const mes = MESES[parseInt(partes[1]) - 1] || ''
  const anio = partes[2]
  return `${mes} ${anio}`
}

export async function POST(request) {
  try {
    const { pdfUrl, tecnicoEmail, tecnicoNombre, cliente, fechaServicio } = await request.json()

    if (!pdfUrl) {
      return Response.json({ error: 'Falta la URL del PDF' }, { status: 400 })
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

    const destinatarios = ['informessiacingenieria@gmail.com', 'ventas@siac-ingenieria.cl']
    if (tecnicoEmail) destinatarios.push(tecnicoEmail)

    const fechaLarga = formatearFechaLarga(fechaServicio)
    const mesAnio = formatearMesAnio(fechaServicio)
    const asunto = `Informe de Desinfección ${cliente} ${mesAnio}`
    const nombreArchivo = `Informe_Desinfeccion_${cliente.replace(/\s+/g, '_')}_${mesAnio.replace(/\s+/g, '_')}.pdf`

    const { data, error } = await resend.emails.send({
      from: 'SIAC Informes <onboarding@resend.dev>',
      to: destinatarios,
      subject: asunto,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #1a3a6b;">Informe de Desinfección generado</h2>
          <p><strong>Cliente:</strong> ${cliente}</p>
          <p><strong>Fecha del servicio:</strong> ${fechaLarga}</p>
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
    console.error('Error enviando informe:', err)
    return Response.json({ error: err.message || 'Error desconocido en el servidor' }, { status: 500 })
  }
}