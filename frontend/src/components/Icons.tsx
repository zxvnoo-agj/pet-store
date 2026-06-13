import React from 'react'
import { Image } from '@tarojs/components'

interface IconProps {
  size?: number
  className?: string
  color?: string
}

interface PetTypeIconProps extends IconProps {
  type: string
}

interface ScenarioIconProps extends IconProps {
  id: string
}

interface CategoryIconProps extends IconProps {
  name: string
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

const AiAssistantSvg = (fillColor: string) => `<path d="M20 10c0-3.31-3.58-6-8-6S4 6.69 4 10c0 1.89 1.08 3.56 2.78 4.66L6 20l3.87-2.71c.66.13 1.34.2 2.03.21.34 0 .67-.02 1-.06"/><path d="M17.5 14l.5-1.5.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5z"/><path d="M8 4.5L6.5 2"/><path d="M10 4.2L9.5 1.5"/><path d="M14 4.2L14.5 1.5"/><path d="M16 4.5L17.5 2"/><circle cx="9" cy="10" r=".8" fill="${fillColor}" stroke="none"/><circle cx="15" cy="10" r=".8" fill="${fillColor}" stroke="none"/><path d="M9.5 12.5c.6.5 1.4.8 2.25.8s1.65-.3 2.25-.8"/>`

export const AiAssistantIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => {
  return <Image src={dataUri(AiAssistantSvg(color), size, color)} className={className} style={{ width: size, height: size }} />
}

const SearchSvg = `<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>`
export const SearchIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(SearchSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

const PawSvg = `<path d="M8.5 10.5c1.1 0 2-.95 2-2.1s-.9-2.1-2-2.1-2 .95-2 2.1.9 2.1 2 2.1z"/><path d="M15.5 10.5c1.1 0 2-.95 2-2.1s-.9-2.1-2-2.1-2 .95-2 2.1.9 2.1 2 2.1z"/><path d="M5.7 14.3c.9 0 1.6-.78 1.6-1.75S6.6 10.8 5.7 10.8s-1.6.78-1.6 1.75.7 1.75 1.6 1.75z"/><path d="M18.3 14.3c.9 0 1.6-.78 1.6-1.75s-.7-1.75-1.6-1.75-1.6.78-1.6 1.75.7 1.75 1.6 1.75z"/><path d="M8.2 16.2c.85-1.35 1.7-2.2 3.8-2.2s2.95.85 3.8 2.2c.95 1.48.15 3.3-1.55 3.3-.85 0-1.35-.35-2.25-.35s-1.4.35-2.25.35c-1.7 0-2.5-1.82-1.55-3.3z"/>`
export const PawIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(PawSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

const PackageSvg = `<path d="M21 8.5l-9-5-9 5 9 5 9-5z"/><path d="M3 8.5v7l9 5 9-5v-7"/><path d="M12 13.5v7"/><path d="M7.5 6l9 5"/>`
export const PackageIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(PackageSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

const SparkleSvg = `<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z"/><path d="M5 16l.7 2.3L8 19l-2.3.7L5 22l-.7-2.3L2 19l2.3-.7L5 16z"/><path d="M19 2l.6 1.9L21.5 4.5l-1.9.6L19 7l-.6-1.9-1.9-.6 1.9-.6L19 2z"/>`
export const SparkleIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(SparkleSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

const ArrowRightSvg = `<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>`
export const ArrowRightIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(ArrowRightSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

const SendSvg = `<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4 18-7z"/>`
export const SendIcon: React.FC<IconProps> = ({ size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(SendSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

const petTypeSvgs: Record<string, string> = {
  cat: `<path d="M5.5 10.5V6l3 2 3.5-1 3.5 1 3-2v4.5c0 4-2.7 7-6.5 7s-6.5-3-6.5-7z"/><path d="M8.5 12h.01"/><path d="M15.5 12h.01"/><path d="M10 15c1.2.7 2.8.7 4 0"/><path d="M4 13h3"/><path d="M17 13h3"/>`,
  dog: `<path d="M7 9.5V7c0-1.3 1-2.5 2.4-2.5h5.2C16 4.5 17 5.7 17 7v2.5"/><path d="M7 9.5l-2-1.3c-.9-.6-2 .1-2 1.2v2.1c0 1.1.9 2 2 2h2"/><path d="M17 9.5l2-1.3c.9-.6 2 .1 2 1.2v2.1c0 1.1-.9 2-2 2h-2"/><path d="M7 10.5v3.2c0 3 2.1 5.3 5 5.3s5-2.3 5-5.3v-3.2"/><path d="M10 12h.01"/><path d="M14 12h.01"/><path d="M11 15h2"/>`,
  bird: `<path d="M5 13c1.5-4 5.5-7 10-6.5 2.5.3 4.2 1.6 5 3.5-2.8-.4-5.6.6-7.5 2.8"/><path d="M12.5 12.8c-1 3.7-3.8 5.9-7.5 6.2.3-2.6 1-4.5 2.1-5.8"/><path d="M15 8.5h.01"/><path d="M19.5 10l2 1-2 1"/>`,
  fish: `<path d="M3 12s3.2-5 8-5c3.2 0 5.7 1.8 7 5-1.3 3.2-3.8 5-7 5-4.8 0-8-5-8-5z"/><path d="M18 12l3.5-3.5v7L18 12z"/><path d="M8 12h.01"/><path d="M12 8.5c.8 1.8.8 5.2 0 7"/>`,
  reptile: `<path d="M5 14c2.5-5 7.5-7 13-4"/><path d="M18 10l2-3"/><path d="M18 10l3 1.5"/><path d="M7 14c1.8 3.2 5.2 4.2 9 2"/><path d="M9 13l-2.5-2"/><path d="M12 16l-1 3"/><path d="M15 11h.01"/>`,
  small_pet: PawSvg,
  other: PawSvg,
}

export const PetTypeIcon: React.FC<PetTypeIconProps> = ({ type, size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(petTypeSvgs[type] || PawSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

const scenarioSvgs: Record<string, string> = {
  'coat-health': SparkleSvg,
  'digestive-care': `<path d="M10 4c-2 1.5-3 3.2-3 5.2 0 1.8 1.2 3 3 3h2.2c1.5 0 2.8 1.2 2.8 2.8s-1.2 3-3 3H8"/><path d="M14 4c2.2 1.6 3.5 3.8 3.5 6.4 0 4.4-3.2 7.6-7.3 7.6"/><path d="M10 8h4"/><path d="M11 12h2"/>`,
  'kitten-growth': `<path d="M12 20V9"/><path d="M12 9c-2.7 0-4.5-1.5-5-4 2.8-.2 4.4 1 5 4z"/><path d="M12 11c2.7 0 4.5-1.5 5-4-2.8-.2-4.4 1-5 4z"/><path d="M7 20h10"/><path d="M9 16h6"/>`,
  'stock-up': PackageSvg,
  'picky-eater': `<path d="M5 12h14"/><path d="M7 12c0 3 2.2 5.5 5 5.5s5-2.5 5-5.5"/><path d="M8 9c1.2-1 2.5-1.5 4-1.5s2.8.5 4 1.5"/><path d="M12 5v2.5"/><path d="M8 4l1.2 2"/><path d="M16 4l-1.2 2"/>`,
  'seasonal-care': `<path d="M19 4c-7 0-11 3.5-11 9 0 3.2 2.3 5 5 5 5.5 0 7-6 6-14z"/><path d="M8 19c1.5-4.5 4.5-7.5 9-9"/><path d="M5 16c-1.5-1.4-2-3.2-1.2-5.2 2.2.5 3.4 1.7 3.8 3.8"/>`,
}

export const ScenarioIcon: React.FC<ScenarioIconProps> = ({ id, size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(scenarioSvgs[id] || SparkleSvg, size, color)} className={className} style={{ width: size, height: size }} />
)

function getCategorySvg(name: string): string {
  if (/砂|厕所|清洁/.test(name)) {
    return `<path d="M5 10h14l-1 8H6l-1-8z"/><path d="M8 10V7c0-1.2 1-2 2.2-2h3.6C15 5 16 5.8 16 7v3"/><path d="M8.5 14h7"/><path d="M9 17h6"/>`
  }
  if (/玩具|逗|球/.test(name)) {
    return `<circle cx="12" cy="12" r="7"/><path d="M7 10c3 0 5-2 5-5"/><path d="M12 19c0-3 2-5 7-5"/><path d="M8.5 15.5l7-7"/>`
  }
  if (/粮|食|罐|零食|冻干/.test(name)) {
    return `<path d="M5 12h14"/><path d="M7 12c0 3 2.2 5.5 5 5.5s5-2.5 5-5.5"/><path d="M8 9c1.2-1 2.5-1.5 4-1.5s2.8.5 4 1.5"/><path d="M10 14h4"/>`
  }
  if (/护理|梳|洗|美毛/.test(name)) {
    return `<path d="M6 19l12-12"/><path d="M14 5l5 5"/><path d="M5 12l7 7"/><path d="M8 9l7 7"/>`
  }
  return PackageSvg
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, size = 24, className = '', color = '#6B7280' }) => (
  <Image src={dataUri(getCategorySvg(name), size, color)} className={className} style={{ width: size, height: size }} />
)
