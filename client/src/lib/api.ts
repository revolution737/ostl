/**
 * Base URL for all API requests.
 * In production, reads from VITE_API_URL env var; falls back to '' (same origin).
 * In development, always '' (Vite proxy handles routing).
 */
export const apiBase: string = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '')
  : '';

/**
 * Fallback game ID used when no specific game context is available.
 */
export const FALLBACK_GAME_ID = 'dummy-game';
