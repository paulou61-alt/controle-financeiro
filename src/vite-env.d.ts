/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRIPE_LINK_MENSAL?: string
  readonly VITE_STRIPE_LINK_SEMESTRAL?: string
  readonly VITE_STRIPE_LINK_ANUAL?: string
  readonly VITE_STRIPE_LINK_VITALICIO?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_TURNSTILE_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
