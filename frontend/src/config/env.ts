declare const __API_BASE_URL__: string | undefined

const DEFAULT_LOCAL_API_BASE_URL = 'http://127.0.0.1:8001/v1'

export const API_BASE_URL =
  typeof __API_BASE_URL__ === 'string' && __API_BASE_URL__
    ? __API_BASE_URL__
    : DEFAULT_LOCAL_API_BASE_URL
