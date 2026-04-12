import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

import * as canvasQueries from '../db/queries/designCanvas.queries.js'
import * as phaseOutputsQueries from '../db/queries/phaseOutputs.queries.js'
import * as projectFilesQueries from '../db/queries/projectFiles.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'

import type { PhaseOutput } from '../db/schema.js'

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function textPara(s: string): Paragraph {
  return new Paragraph({ children: [new TextRun(s)] })
}

function heading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel],
): Paragraph {
  return new Paragraph({ text, heading: level } as never)
}

function buildPhase1Blocks(data: Record<string, unknown>): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = []
  const keys = [
    'problemStatement',
    'solution',
    'icp',
    'marketGap',
    'demandScore',
    'riskAnalysis',
    'verdict',
  ]
  for (const k of keys) {
    const v = data[k]
    if (v === undefined || v === null) continue
    blocks.push(heading(k.replace(/([A-Z])/g, ' $1').trim(), HeadingLevel.HEADING_3))
    blocks.push(textPara(typeof v === 'string' ? v : JSON.stringify(v, null, 2)))
  }
  const competitors = data['competitors']
  if (Array.isArray(competitors) && competitors.length > 0) {
    blocks.push(heading('Competitors', HeadingLevel.HEADING_3))
    const rows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Name')] }),
          new TableCell({ children: [new Paragraph('Notes')] }),
        ],
      }),
    ]
    for (const c of competitors.slice(0, 15)) {
      const o = asRecord(c)
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(String(o['name'] ?? '—'))],
            }),
            new TableCell({
              children: [new Paragraph(JSON.stringify(c).slice(0, 200))],
            }),
          ],
        }),
      )
    }
    blocks.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      }),
    )
  }
  return blocks
}

function phase2Blocks(data: Record<string, unknown>): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = []
  const features = data['features']
  if (Array.isArray(features) && features.length > 0) {
    blocks.push(heading('Features (MoSCoW)', HeadingLevel.HEADING_3))
    const rows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph('Feature')] }),
          new TableCell({ children: [new Paragraph('Priority')] }),
        ],
      }),
    ]
    for (const f of features.slice(0, 40)) {
      const o = asRecord(f)
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(String(o['name'] ?? JSON.stringify(f)))],
            }),
            new TableCell({
              children: [
                new Paragraph(String(o['priority'] ?? o['moscow'] ?? '—')),
              ],
            }),
          ],
        }),
      )
    }
    blocks.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }))
  }
  for (const label of ['userStories', 'techStack', 'apiStructure', 'api_structure']) {
    const v = data[label]
    if (v === undefined) continue
    blocks.push(heading(label.replace(/_/g, ' '), HeadingLevel.HEADING_3))
    blocks.push(textPara(typeof v === 'string' ? v : JSON.stringify(v, null, 2)))
  }
  return blocks
}

function phaseBlocks(
  phase: number,
  output: PhaseOutput | undefined,
  extras: (Paragraph | Table)[],
): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [heading(`Phase ${phase}`, HeadingLevel.HEADING_2)]
  if (!output) {
    blocks.push(textPara('No output recorded for this phase.'))
    blocks.push(...extras)
    return blocks
  }
  const data = asRecord(output.outputData)
  if (phase === 1) blocks.push(...buildPhase1Blocks(data))
  else if (phase === 2) blocks.push(...phase2Blocks(data))
  else blocks.push(textPara(JSON.stringify(output.outputData, null, 2)))
  blocks.push(...extras)
  return blocks
}

export async function generateDocx(projectId: string, includePhases: number[]): Promise<Buffer> {
  const project = await projectsQueries.findProjectById(projectId)
  if (!project) throw new Error('Project not found')

  const allOutputs = await phaseOutputsQueries.findAllPhaseOutputs(projectId)
  const byPhase = new Map(allOutputs.map((o) => [o.phase, o]))
  const canvas = await canvasQueries.findCanvasByProjectId(projectId)
  const files = await projectFilesQueries.findFilesByProject(projectId)

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${project.name} ${project.emoji}`, bold: true, size: 56 }),
      ],
    } as never),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`Generated ${new Date().toISOString().slice(0, 10)}`)],
    } as never),
    heading('Table of contents', HeadingLevel.HEADING_1),
    textPara('Cover, then phases in order.'),
  ]

  const sortedPhases = [...includePhases].sort((a, b) => a - b)

  for (const p of sortedPhases) {
    const out = byPhase.get(p)
    if (p === 3) {
      const pages = (canvas?.pages as unknown[] | undefined) ?? []
      const canvasData = (canvas?.canvasData as unknown[] | undefined) ?? []
      const extra: Paragraph[] = [
        heading('Wireframes & canvas', HeadingLevel.HEADING_3),
        textPara(`Canvas pages: ${pages.length}. Elements (approx): ${canvasData.length}.`),
      ]
      children.push(...phaseBlocks(p, out, extra))
      continue
    }
    if (p === 4) {
      const extra: Paragraph[] = [
        heading('Generated files (paths only)', HeadingLevel.HEADING_3),
        textPara(files.map((f) => f.path).join('\n') || 'No files.'),
      ]
      children.push(...phaseBlocks(p, out, extra))
      continue
    }
    if (p === 5) {
      const data = asRecord(out?.outputData)
      const body =
        typeof data['testSummary'] === 'string'
          ? (data['testSummary'] as string)
          : JSON.stringify(data).slice(0, 4000)
      const extra: Paragraph[] = [heading('Tests & CI/CD', HeadingLevel.HEADING_3), textPara(body)]
      children.push(...phaseBlocks(p, out, extra))
      continue
    }
    if (p === 6) {
      const data = asRecord(out?.outputData)
      const body =
        typeof data['kpiRecommendations'] === 'string'
          ? (data['kpiRecommendations'] as string)
          : JSON.stringify(data).slice(0, 4000)
      const extra: Paragraph[] = [heading('Growth & KPIs', HeadingLevel.HEADING_3), textPara(body)]
      children.push(...phaseBlocks(p, out, extra))
      continue
    }
    children.push(...phaseBlocks(p, out, []))
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}
