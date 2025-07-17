/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_DEFAULT_MODEL: string
  readonly VITE_MAX_TOKENS: string
  readonly VITE_TEMPERATURE: string
  readonly VITE_TOP_P: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 