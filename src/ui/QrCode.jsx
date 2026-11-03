import { useEffect, useState } from 'react'

// A QR code for a web address, drawn as SVG so it stays sharp when printed.
// The QR library is only downloaded when a QR code is actually shown.
export default function QrCode({ text, className }) {
  const [svg, setSvg] = useState(null)

  useEffect(() => {
    let cancelled = false
    import('qrcode')
      .then((QRCode) =>
        QRCode.toString(text, {
          type: 'svg',
          margin: 0, // the white box around it (in CSS) is the quiet edge scanners need
          errorCorrectionLevel: 'M', // still scans with a small scratch or smudge
          color: { dark: '#2b211c', light: '#ffffff' },
        }),
      )
      .then((drawn) => !cancelled && setSvg(drawn))
    return () => {
      cancelled = true
    }
  }, [text])

  // The SVG comes from the QR library, not from anything a person typed, so it's safe to insert.
  return <div className={className} role="img" aria-label={text} dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
}
