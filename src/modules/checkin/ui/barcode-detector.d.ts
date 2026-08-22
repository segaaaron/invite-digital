/**
 * `BarcodeDetector` es nativo en Chrome para Android, que es el dispositivo de puerta
 * real, pero todavía no está en lib.dom.d.ts. Se declara aquí lo justo para usarlo sin
 * `any` y sin `@ts-ignore`.
 */
declare global {
  type DetectedBarcode = { rawValue: string; format: string }

  class BarcodeDetector {
    constructor(options?: { formats?: string[] })
    detect(source: CanvasImageSource): Promise<DetectedBarcode[]>
  }

  interface Window {
    BarcodeDetector?: typeof BarcodeDetector
  }
}

export {}
