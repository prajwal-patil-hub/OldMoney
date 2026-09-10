'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Tactile slider: a native range input styled as an inset groove with a
 * raised terracotta thumb. Pseudo-element styling lives in globals.css
 * (`.nm-slider`) since track/thumb can't be reached from utility classes.
 */
export type SliderProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, ...props }, ref) => (
    <input type="range" ref={ref} className={cn('nm-slider w-full', className)} {...props} />
  )
)
Slider.displayName = 'Slider'

export { Slider }
