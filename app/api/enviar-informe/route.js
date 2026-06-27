import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { pdfUrl, tecnicoEmail, tecnicoNombre, cliente, fechaServicio } = await request.json()

    if (!pdfUrl) {
      return Response.json({ error: 'Falta la URL del PDF' }, { status: 400 })
    }

    // Descargar el PDF desde Cloudinary para adjuntarlo
    const pdfResponse = await fetch(pdfUrl)
    const pdfBuffer = await pdfResponse.arrayBuffer()
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64')

    const destinatarios = [
      'informessiacingenieria@gmail.com',
    ]

    const nombreArchivo = `Informe_Desinfeccion_${cliente.replace(/\s+/g, '_')}_${fechaServicio.replace(/\//g, '-')}.pdf`

    const { data, error } = await resend.emails.send({
      from: 'SIAC Informes <onboarding@resend.dev>',
      to: destinatarios,
      subject: `Informe de Desinfección - ${cliente} - ${fechaServicio}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #1a3a6b;">Informe de Desinfección generado</h2>
          <p><strong>Cliente:</strong> ${cliente}</p>
          <p><strong>Fecha del servicio:</strong> ${fechaServicio}</p>
          <p><strong>Técnico responsable:</strong> ${tecnicoNombre}</p>
          <p>Se adjunta el informe en formato PDF.</p>
          <p style="color: #888; font-size: 12px; margin-top: 2rem;">Este correo fue generado automáticamente por el sistema SIAC.</p>
        </div>
      `,
      attachments: [
        {
          filename: nombreArchivo,
          content: pdfBase64,
        },
      ],
    })

    if (error) {
      console.error('Error Resend:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (err) {
    console.error('Error enviando informe:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}