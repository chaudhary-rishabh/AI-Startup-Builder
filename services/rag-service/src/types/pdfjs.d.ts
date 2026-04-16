declare module 'pdfjs-dist/build/pdf.mjs' {
  export function getDocument(params: { data: Uint8Array }): {
    promise: Promise<{
      numPages: number
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: Array<{ str?: string }> }>
      }>
    }>
  }
}
