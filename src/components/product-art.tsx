import type { ReactElement, ReactNode } from 'react'
import type { ProductArt as ProductArtKey } from '@/data/menu'

const ink = 'var(--ink)'
const card = 'var(--card)'
const butter = 'var(--butter)'
const red = 'var(--green)'
const sage = 'var(--sage)'
const mint = 'var(--mint)'
const lemon = 'var(--lemon)'
const cocoa = 'var(--cocoa)'
const cocoaSoft = 'var(--cocoa-soft)'

const stroke = { stroke: ink, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }

function Cup() {
  return (
    <>
      <ellipse cx="100" cy="158" rx="56" ry="11" fill={butter} stroke={ink} strokeWidth="5" />
      <path d="M58 82h84l-9 54c-2 9-9 15-18 15H85c-9 0-16-6-18-15Z" fill={card} {...stroke} />
      <path d="M141 90h9c12 0 18 8 18 17s-7 17-19 17h-10" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="100" cy="84" rx="42" ry="10" fill={ink} stroke={ink} strokeWidth="5" />
      <ellipse cx="100" cy="83" rx="27" ry="5.5" fill="none" stroke={butter} strokeWidth="3" opacity=".5" />
      <path d="M88 56c-8-10 8-16 0-26M112 54c-8-10 8-16 0-26" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".4" />
    </>
  )
}

function Cortado() {
  return (
    <>
      <ellipse cx="100" cy="158" rx="56" ry="11" fill={butter} stroke={ink} strokeWidth="5" />
      <path d="M58 82h84l-9 54c-2 9-9 15-18 15H85c-9 0-16-6-18-15Z" fill={card} {...stroke} />
      <path d="M141 90h9c12 0 18 8 18 17s-7 17-19 17h-10" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="100" cy="84" rx="42" ry="10" fill={ink} stroke={ink} strokeWidth="5" />
      <path d="M70 82c8-4 19-6 30-6s22 2 30 6c-8 6-19 9-30 9s-22-3-30-9Z" fill={card} />
      <path d="M86 86c5 2 10 3 14 3s9-1 14-3" fill="none" stroke={butter} strokeWidth="3" strokeLinecap="round" opacity=".65" />
      <path d="M88 56c-8-10 8-16 0-26M112 54c-8-10 8-16 0-26" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".4" />
    </>
  )
}

function Latte() {
  return (
    <>
      <ellipse cx="100" cy="164" rx="52" ry="10" fill={butter} stroke={ink} strokeWidth="5" />
      <path d="M66 74h68l-8 66c-1 9-9 16-18 16h-16c-9 0-17-7-18-16Z" fill={card} {...stroke} />
      <path d="M133 84h7c13 0 20 8 20 18s-8 18-20 18h-8" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="100" cy="76" rx="34" ry="9" fill={card} stroke={ink} strokeWidth="5" />
      <path d="M100 75c-2-4-9-4-9 2 0 5 9 9 9 9s9-4 9-9c0-6-7-6-9-2Z" fill={red} stroke={ink} strokeWidth="2.5" />
      <path d="M86 50c-8-10 8-16 0-26M114 48c-8-10 8-16 0-26" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" opacity=".4" />
    </>
  )
}

const glassBody = 'M73 48h54l-9 112c-.7 7-7 12-14 12h-8c-7 0-13.3-5-14-12Z'
const glassInner = 'M77 82h46l-7 76c-.5 6-5.5 10-11.5 10h-8c-6 0-11-4-11.5-10Z'

function GlassFrame({ children, straw = red }: { children: ReactNode; straw?: string }) {
  return (
    <>
      <path d={glassBody} fill={card} stroke={ink} strokeWidth="5" strokeLinejoin="round" />
      {children}
      <path d={glassBody} fill="none" stroke={ink} strokeWidth="5" strokeLinejoin="round" />
      <path d="M86 60l-3 44" stroke={card} strokeWidth="4" strokeLinecap="round" opacity=".65" />
      <path d="M116 22l16 48" stroke={ink} strokeWidth="13" strokeLinecap="round" />
      <path d="M116 22l16 48" stroke={straw} strokeWidth="7" strokeLinecap="round" />
    </>
  )
}

function Glass() {
  return (
    <GlassFrame>
      <path d={glassInner} fill={ink} />
      <rect x="86" y="92" width="18" height="18" rx="4" fill={sage} stroke={ink} strokeWidth="3" transform="rotate(-14 95 101)" />
      <rect x="106" y="118" width="17" height="17" rx="4" fill={sage} stroke={ink} strokeWidth="3" transform="rotate(12 114 126)" />
      <rect x="88" y="138" width="15" height="15" rx="4" fill={sage} stroke={ink} strokeWidth="3" transform="rotate(-8 95 145)" />
    </GlassFrame>
  )
}

function Iced() {
  return (
    <GlassFrame straw="var(--terra)">
      <path d={glassInner} fill={card} />
      <path d="M77 82h46l-4 38c-8 5-14-2-21 1s-13 0-18-3Z" fill={ink} />
      <rect x="84" y="96" width="17" height="17" rx="4" fill={sage} stroke={ink} strokeWidth="3" transform="rotate(-16 92 104)" />
      <rect x="105" y="124" width="16" height="16" rx="4" fill={sage} stroke={ink} strokeWidth="3" transform="rotate(14 113 132)" />
    </GlassFrame>
  )
}

function Lemonade() {
  return (
    <GlassFrame straw="var(--terra)">
      <path d={glassInner} fill={lemon} />
      <rect x="88" y="100" width="17" height="17" rx="4" fill={sage} stroke={ink} strokeWidth="3" transform="rotate(-10 96 108)" />
      <rect x="104" y="132" width="16" height="16" rx="4" fill={sage} stroke={ink} strokeWidth="3" transform="rotate(10 112 140)" />
      <circle cx="120" cy="70" r="16" fill={butter} stroke={ink} strokeWidth="4" />
      <path d="M120 54v32M104 70h32M109 59l22 22M131 59l-22 22" stroke={lemon} strokeWidth="3" />
      <path d="M72 60c-9-2-14-9-14-16 9-1 16 4 18 12M78 52c-1-9 4-16 11-19 2 9-2 17-9 21" fill={mint} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
    </GlassFrame>
  )
}

function Pastry() {
  return (
    <>
      <path
        d="M27 136c-4-34 18-66 51-76 11-4 18-2 22 2 4-4 11-6 22-2 33 10 55 42 51 76 1 10-8 15-16 11l-25-13c-5-3-5-10 1-12l8-3c-8-15-23-24-41-24s-33 9-41 24l8 3c6 2 6 9 1 12l-25 13c-8 4-17-1-16-11Z"
        fill={butter}
        {...stroke}
      />
      <path d="M69 77c-9 8-15 18-17 29M100 65v30M131 77c9 8 15 18 17 29" fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" opacity=".45" />
      <path d="M62 122c26 10 50 10 76 0" fill="none" stroke={ink} strokeWidth="3" opacity=".25" />
    </>
  )
}

function Roll() {
  return (
    <>
      <circle cx="100" cy="106" r="58" fill={butter} {...stroke} />
      <path
        d="M100 106c0-9 12-12 16-4 5 10-6 22-18 19-15-4-19-24-7-34 14-12 37-7 43 10"
        fill="none"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M57 84c10-7 16 2 26-2s12-9 22-5 13 9 22 5 9-6 12-4" fill="none" stroke={card} strokeWidth="8" strokeLinecap="round" />
      <path d="M48 134c14 8 30 11 52 11s38-3 52-11" fill="none" stroke={ink} strokeWidth="3" opacity=".2" />
    </>
  )
}

function Brownie() {
  return (
    <>
      <path d="M54 68c0-6 4-10 10-10h72c6 0 10 4 10 10v68c0 6-4 10-10 10H64c-6 0-10-4-10-10Z" fill={cocoa} {...stroke} />
      <path d="M54 68c0-6 4-10 10-10h72c6 0 10 4 10 10v14H54Z" fill={cocoaSoft} stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M66 98c10-8 18 6 28-2s18 6 28-2 11 4 15 0" fill="none" stroke={card} strokeWidth="5" strokeLinecap="round" />
      <circle cx="80" cy="126" r="6" fill={butter} stroke={ink} strokeWidth="2.5" />
      <circle cx="100" cy="132" r="5" fill={butter} stroke={ink} strokeWidth="2.5" />
      <circle cx="120" cy="124" r="6" fill={butter} stroke={ink} strokeWidth="2.5" />
    </>
  )
}

function Toast() {
  return (
    <>
      <path
        d="M56 78c0-18 12-30 28-30 4-10 16-15 27-10 6-4 15-3 19 3 14-1 24 9 24 24v62c0 16-10 26-25 26H81c-15 0-25-10-25-26Z"
        fill={butter}
        {...stroke}
      />
      <path
        d="M70 84c0-12 8-20 19-20 3-7 11-10 18-7 4-3 10-2 13 2 9-1 16 6 16 15v52c0 11-7 18-18 18H88c-11 0-18-7-18-18Z"
        fill={card}
        stroke={ink}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M79 104c12-6 23-4 33 2 9 5 15 4 20 1v22c-16 6-37 6-53 0Z" fill={mint} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
      <ellipse cx="93" cy="113" rx="12" ry="6.5" fill={mint} stroke={ink} strokeWidth="2.5" transform="rotate(-14 93 113)" />
      <ellipse cx="112" cy="121" rx="10" ry="6" fill={mint} stroke={ink} strokeWidth="2.5" transform="rotate(9 112 121)" />
      <circle cx="121" cy="106" r="5" fill={red} stroke={ink} strokeWidth="2.5" />
      <path d="M86 112c7-3 14-2 20 2M96 124c7-2 13-1 18 2" fill="none" stroke={ink} strokeWidth="2.5" opacity=".3" strokeLinecap="round" />
      <circle cx="84" cy="137" r="1.8" fill={ink} />
      <circle cx="101" cy="141" r="1.8" fill={ink} />
      <circle cx="118" cy="135" r="1.8" fill={ink} />
    </>
  )
}

function Sandwich() {
  return (
    <>
      <path d="M50 88c0-22 22-36 50-36s50 14 50 36c0 7-5 11-11 11H61c-6 0-11-4-11-11Z" fill={butter} {...stroke} />
      <path d="M76 74c4-3 8-3 12 0M100 68c4-3 8-3 12 0M124 74c4-3 8-3 12 0" fill="none" stroke={ink} strokeWidth="2.5" opacity=".35" strokeLinecap="round" />
      <rect x="50" y="99" width="100" height="16" rx="8" fill={red} stroke={ink} strokeWidth="4" />
      <rect x="50" y="115" width="100" height="16" rx="8" fill={card} stroke={ink} strokeWidth="4" />
      <circle cx="100" cy="123" r="7" fill={butter} stroke={ink} strokeWidth="3" />
      <rect x="50" y="131" width="100" height="12" rx="6" fill={mint} stroke={ink} strokeWidth="4" />
      <path d="M50 143h100v8c0 10-8 18-18 18H68c-10 0-18-8-18-18Z" fill={butter} {...stroke} />
    </>
  )
}

const drawings: Record<ProductArtKey, () => ReactElement> = {
  cup: Cup,
  cortado: Cortado,
  latte: Latte,
  glass: Glass,
  iced: Iced,
  lemonade: Lemonade,
  pastry: Pastry,
  roll: Roll,
  brownie: Brownie,
  toast: Toast,
  sandwich: Sandwich,
}

export function ProductArt({ kind }: { kind: ProductArtKey }) {
  const Drawing = drawings[kind]
  return (
    <svg className="art-svg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <Drawing />
    </svg>
  )
}
