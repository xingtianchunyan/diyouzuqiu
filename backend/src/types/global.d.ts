declare module '@mozilla/readability' {
  export class Readability {
    constructor(doc: Document, options?: any)
    parse(): {
      title: string
      content: string
      textContent: string
      length: number
      excerpt: string
      byline: string
      dir: string
      siteName: string
      lang: string
    } | null
  }
}

declare module 'jsdom' {
  export class JSDOM {
    constructor(html: string | Buffer | Buffer, options?: any)
    window: {
      document: Document
    }
  }
}

declare module 'pdf-parse-new' {
  const pdfParse: any
  export default pdfParse
}
