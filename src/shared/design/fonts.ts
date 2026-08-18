import localFont from 'next/font/local'

export const display = localFont({
  variable: '--font-display',
  display: 'swap',
  src: [
    { path: '../../../public/fonts/cormorant-garamond-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-500.woff2', weight: '500', style: 'normal' },
    { path: '../../../public/fonts/cormorant-garamond-600.woff2', weight: '600', style: 'normal' },
  ],
})

export const sans = localFont({
  variable: '--font-sans',
  display: 'swap',
  src: [
    { path: '../../../public/fonts/jost-200.woff2', weight: '200', style: 'normal' },
    { path: '../../../public/fonts/jost-300.woff2', weight: '300', style: 'normal' },
    { path: '../../../public/fonts/jost-400.woff2', weight: '400', style: 'normal' },
    { path: '../../../public/fonts/jost-500.woff2', weight: '500', style: 'normal' },
  ],
})
