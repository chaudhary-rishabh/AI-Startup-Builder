/**
 * docx publishes `build/index.mjs` but `index.d.ts` re-exports `./file`, which
 * TypeScript resolves to `file.d.ts` instead of `file/index.d.ts` under NodeNext.
 * Declare the surface we use so imports from `docx` typecheck and resolve to the bundle at runtime.
 */
declare module 'docx' {
  export const AlignmentType: {
    readonly CENTER: string
    readonly LEFT: string
    readonly RIGHT: string
    readonly START: string
    readonly END: string
    readonly BOTH: string
    readonly JUSTIFIED: string
  }

  export const HeadingLevel: {
    readonly HEADING_1: string
    readonly HEADING_2: string
    readonly HEADING_3: string
    readonly TITLE: string
  }

  export const WidthType: {
    readonly PERCENTAGE: string
  }

  export class TextRun {
    constructor(options: string | Record<string, unknown>)
  }

  export class Paragraph {
    constructor(options: string | Record<string, unknown>)
  }

  export class TableCell {
    constructor(options: { children: Paragraph[] })
  }

  export class TableRow {
    constructor(options: { children: TableCell[] })
  }

  export class Table {
    constructor(options: { rows: TableRow[]; width?: { size: number; type: string } })
  }

  export class Document {
    constructor(options: { sections: Array<{ children: (Paragraph | Table)[] }> })
  }

  export class Packer {
    static toBuffer(file: Document, prettify?: boolean): Promise<Buffer>
  }
}
