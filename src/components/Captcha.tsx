import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// Cloudflare Turnstile: verificação contra robôs no cadastro, login e recuperação de senha.
// O Supabase confere o token (Authentication > Attack Protection > Captcha).
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opcoes: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

/** Chave pública (Site Key). Sem ela, o login funciona sem captcha. */
export const CHAVE_CAPTCHA = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim()

let script: Promise<void> | null = null
function carregarScript() {
  if (window.turnstile) return Promise.resolve()
  script ??= new Promise<void>((ok, falha) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => ok()
    s.onerror = () => {
      script = null
      s.remove()
      falha(new Error('Não carregou o captcha'))
    }
    document.head.appendChild(s)
  })
  return script
}

export type CaptchaRef = { reiniciar: () => void }

export const Captcha = forwardRef<CaptchaRef, { onToken: (token: string) => void; onFalha?: () => void }>(function Captcha({ onToken, onFalha }, ref) {
  const caixa = useRef<HTMLDivElement>(null)
  const id = useRef<string>()
  const avisos = useRef({ onToken, onFalha })
  avisos.current = { onToken, onFalha }

  useImperativeHandle(ref, () => ({
    reiniciar: () => {
      avisos.current.onToken('')
      if (id.current) window.turnstile?.reset(id.current)
    },
  }), [])

  useEffect(() => {
    let montado = true
    carregarScript()
      .then(() => {
        if (!montado || !caixa.current || !window.turnstile) return
        id.current = window.turnstile.render(caixa.current, {
          sitekey: CHAVE_CAPTCHA,
          language: 'pt-br',
          theme: 'auto',
          callback: (t: string) => avisos.current.onToken(t),
          'expired-callback': () => avisos.current.onToken(''),
          'error-callback': () => avisos.current.onToken(''),
        })
      })
      .catch(() => montado && avisos.current.onFalha?.())
    return () => {
      montado = false
      if (id.current) window.turnstile?.remove(id.current)
      id.current = undefined
    }
  }, [])

  return <div ref={caixa} className="captcha" />
})
