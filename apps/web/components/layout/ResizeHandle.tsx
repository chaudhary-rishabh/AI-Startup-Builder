'use client'

import { useEffect, useRef, useState } from 'react'

export function ResizeHandle(): JSX.Element {
  const [isDragging, setIsDragging] = useState(false)
  const draggingRef = useRef(false)

  useEffect(() => {
    const onMouseMove = (event: MouseEvent): void => {
      if (!draggingRef.current) {
        return
      }
      const width = Math.max(180, Math.min(320, event.clientX))
      document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
    }

    const stopDragging = (): void => {
      draggingRef.current = false
      setIsDragging(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDragging)
    window.addEventListener('mouseleave', stopDragging)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopDragging)
      window.removeEventListener('mouseleave', stopDragging)
    }
  }, [])

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      className={`hidden w-1 cursor-col-resize transition-colors lg:block ${
        isDragging ? 'bg-brand' : 'bg-transparent hover:bg-brand/40'
      }`}
      onMouseDown={() => {
        draggingRef.current = true
        setIsDragging(true)
      }}
    />
  )
}
