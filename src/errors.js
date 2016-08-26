import { now } from './common'

export function VIEW_FAILED (error, search) {
  return {
    level: 'error',
    message: `npm view failed for ${search}`,
    time: now(),
    error
  }
}

export function LOAD_FAILED (error) {
  return {
    level: 'error',
    message: 'npm load failed',
    time: now(),
    error
  }
}

export default {
  VIEW_FAILED,
  LOAD_FAILED
}