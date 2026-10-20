import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  // Aceita também SUPABASE_URL / SUPABASE_ANON_KEY (nomes criados pela integração Supabase da Vercel).
  // Só essas (e a chave pública do captcha) são repassadas ao navegador: nunca a service role nem chaves do Stripe.
  const publica = (nome: string) => JSON.stringify(env[`VITE_${nome}`] || env[nome] || '')
  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': publica('SUPABASE_URL'),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': publica('SUPABASE_ANON_KEY'),
      'import.meta.env.VITE_TURNSTILE_SITE_KEY': publica('TURNSTILE_SITE_KEY'),
    },
  }
})
