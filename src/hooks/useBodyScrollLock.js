import { useEffect } from 'react'

let locks = 0
let prevOverflow = ''

export default function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined
    const { body } = document
    if (locks === 0) {
      prevOverflow = body.style.overflow
      body.style.overflow = 'hidden'
    }
    locks += 1
    return () => {
      locks = Math.max(0, locks - 1)
      if (locks === 0) {
        body.style.overflow = prevOverflow
      }
    }
  }, [locked])
}
