import React from 'react'
import { Image } from '@tarojs/components'

interface IconProps {
  size?: number
  className?: string
  color?: string
}

function dataUri(svg: string, size: number, color: string): string {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(markup)}`
}

const FavoriteSvg = `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/><path d="M7.5 3L6 1"/><path d="M7.5 3L9 1"/><path d="M16.5 3L15 1"/><path d="M16.5 3L18 1"/>`

export const FavoriteIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(FavoriteSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

export const FavoriteFilledIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/><path d="M7.5 3L6 1" stroke="white" opacity="0.5"/><path d="M7.5 3L9 1" stroke="white" opacity="0.5"/><path d="M16.5 3L15 1" stroke="white" opacity="0.5"/><path d="M16.5 3L18 1" stroke="white" opacity="0.5"/></svg>`
  return <Image src={`data:image/svg+xml,${encodeURIComponent(markup)}`} className={className} style={{ width: size, height: size }} />
}

const ShareSvg = `<circle cx="18" cy="5" r="2.5"/><circle cx="18" cy="19" r="2.5"/><circle cx="5" cy="12" r="2.5"/><line x1="7.2" y1="10.8" x2="15.8" y2="6.2"/><line x1="7.2" y1="13.2" x2="15.8" y2="17.8"/>`

export const ShareIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(ShareSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

const AiAssistantSvg = `<path d="M20 10c0-3.31-3.58-6-8-6S4 6.69 4 10c0 1.89 1.08 3.56 2.78 4.66L6 20l3.87-2.71c.66.13 1.34.2 2.03.21.34 0 .67-.02 1-.06"/><path d="M17.5 14l.5-1.5.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5z"/><path d="M8 4.5L6.5 2"/><path d="M10 4.2L9.5 1.5"/><path d="M14 4.2L14.5 1.5"/><path d="M16 4.5L17.5 2"/><circle cx="9" cy="10" r=".8" fill="${'color'}" stroke="none"/><circle cx="15" cy="10" r=".8" fill="${'color'}" stroke="none"/><path d="M9.5 12.5c.6.5 1.4.8 2.25.8s1.65-.3 2.25-.8"/>`

export const AiAssistantIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => {
  const svg = AiAssistantSvg.replace(/'color'/g, color)
  return <Image src={dataUri(svg, size, color)} className={className} style={{ width: size, height: size }} />
}
