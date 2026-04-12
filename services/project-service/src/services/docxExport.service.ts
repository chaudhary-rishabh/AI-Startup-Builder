import type {
  Phase1Output,
  Phase2Output,
  Phase3Output,
  Phase4Output,
  Phase5Output,
} from '@repo/types'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'

import * as canvasQueries from '../db/queries/designCanvas.queries.js'
import * as phaseOutputsQueries from '../db/queries/phaseOutputs.queries.js'
import * as projectFilesQueries from '../db/queries/projectFiles.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'

import type { PhaseOutput } from '../db/schema.js'

type DocBlock = Paragraph

function pt(text: string, heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({ text, heading })
}

function phaseOutput<T>(row: PhaseOutput | undefined): T | undefined {
  return row?.outputData as T | undefined
}

function addPhase1Section(children: DocBlock[], o: Phase1Output | undefined): void {
  children.push(pt('Phase 1 — Discovery', HeadingLevel.HEADING_1))
  if (!o) {
    children.push(pt('No Phase 1 output available.'))
    return
  }
  children.push(pt(`Problem: ${o.problem}`))
  children.push(pt(`Solution: ${o.solution}`))
  children.push(pt(`ICP: ${o.icp}`))
  children.push(pt(`Market gap: ${o.marketGap}`))
  children.push(pt(`Demand score: ${o.demandScore}`))
  children.push(pt(`Verdict: ${o.verdict}`))
  if (o.competitors?.length) {
    children.push(pt('Competitors', HeadingLevel.HEADING_2))
    for (const c of o.competitors) {
      children.push(pt(`${c.name} — ${c.features} | ${c.pricing} | weakness: ${c.weakness}`))
    }
  }
  if (o.risks?.length) {
    children.push(pt('Risk analysis', HeadingLevel.HEADING_2))
    for (const r of o.risks) {
      children.push(pt(`(${r.severity}) ${r.description}`))
    }
  }
}

function addPhase2Section(children: DocBlock[], o: Phase2Output | undefined): void {
  children.push(pt('Phase 2 — Plan', HeadingLevel.HEADING_1))
  if (!o) {
    children.push(pt('No Phase 2 output available.'))
    return
  }
  children.push(
    pt(
      `Tech stack — Frontend: ${o.frontendStack}; Backend: ${o.backendStack}; Database: ${o.dbChoice}`,
    ),
  )
  if (o.features?.length) {
    children.push(pt('Features (MoSCoW)', HeadingLevel.HEADING_2))
    for (const f of o.features) {
      children.push(pt(`${f.priority.toUpperCase()}: ${f.name} — ${f.description}`))
    }
  }
  if (o.userStories?.length) {
    children.push(pt('User stories', HeadingLevel.HEADING_2))
    for (const us of o.userStories) {
      children.push(
        pt(
          `As ${us.role}, I want ${us.want} so that ${us.soThat}. Acceptance: ${us.acceptance?.join('; ') ?? ''}`,
        ),
      )
    }
  }
  children.push(pt('API structure', HeadingLevel.HEADING_2))
  children.push(pt('See phase-2 JSON in ZIP export for full API details.'))
}

function addPhase3Section(
  children: DocBlock[],
  o: Phase3Output | undefined,
  canvasPages: unknown,
  canvasDataLen: number,
): void {
  children.push(pt('Phase 3 — Design', HeadingLevel.HEADING_1))
  const pages = o?.pages ?? (Array.isArray(canvasPages) ? canvasPages : [])
  const names = Array.isArray(pages)
    ? pages.map((x: { name?: string }) => (typeof x?.name === 'string' ? x.name : 'Untitled'))
    : []
  const elCount = Array.isArray(o?.canvasData) ? o.canvasData.length : canvasDataLen
  children.push(pt(`Wireframe pages: ${names.length ? names.join(', ') : 'None listed'}`))
  children.push(pt(`Canvas element count: ${elCount}`))
}

function addPhase4Section(children: DocBlock[], o: Phase4Output | undefined, paths: string[]): void {
  children.push(pt('Phase 4 — Build', HeadingLevel.HEADING_1))
  children.push(pt('File tree (paths only)', HeadingLevel.HEADING_2))
  const list = o?.files?.map((f) => f.path) ?? paths
  for (const path of list) {
    children.push(pt(path))
  }
}

function addPhase5Section(children: DocBlock[], o: Phase5Output | undefined): void {
  children.push(pt('Phase 5 — Deploy', HeadingLevel.HEADING_1))
  if (!o) {
    children.push(pt('No Phase 5 output available.'))
    return
  }
  children.push(pt(`Test summary: ${o.testFiles?.length ?? 0} test file(s).`))
  const yaml =
    typeof o.cicdYaml === 'string' && o.cicdYaml.length > 2000
      ? `${o.cicdYaml.slice(0, 2000)}…`
      : String(o.cicdYaml ?? '')
  children.push(pt('CI/CD pipeline description', HeadingLevel.HEADING_2))
  children.push(pt(yaml || '(none)'))
}

function addPhase6Section(children: DocBlock[], raw: Record<string, unknown> | undefined): void {
  children.push(pt('Phase 6 — Growth', HeadingLevel.HEADING_1))
  if (!raw || Object.keys(raw).length === 0) {
    children.push(pt('No Phase 6 output available.'))
    return
  }
  children.push(pt('KPI recommendations & growth strategy summary', HeadingLevel.HEADING_2))
  children.push(pt(JSON.stringify(raw, null, 2)))
}

export async function generateDocx(projectId: string, includePhases: number[]): Promise<Buffer> {
  const project = await projectsQueries.findProjectById(projectId)
  if (!project) throw new Error('Project not found')

  const allOutputs = await phaseOutputsQueries.findAllPhaseOutputs(projectId)
  const byPhase = new Map<number, PhaseOutput>()
  for (const o of allOutputs) {
    if (includePhases.includes(o.phase)) byPhase.set(o.phase, o)
  }

  const canvas = await canvasQueries.findCanvasByProjectId(projectId)
  const canvasPages = canvas?.pages ?? []
  const canvasDataLen = Array.isArray(canvas?.canvasData) ? canvas.canvasData.length : 0

  const fileRows = await projectFilesQueries.findFilesByProject(projectId)
  const filePaths = fileRows.map((f) => f.path)

  const children: DocBlock[] = []

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({ text: `${project.emoji} ${project.name}`, bold: true, size: 48 }),
      ],
    }),
  )
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun(`Generated ${new Date().toISOString()}`)],
    }),
  )
  children.push(pt('Table of contents', HeadingLevel.HEADING_1))
  children.push(pt('Phases included follow as headings below.'))

  if (includePhases.includes(1)) {
    addPhase1Section(children, phaseOutput<Phase1Output>(byPhase.get(1)))
  }
  if (includePhases.includes(2)) {
    addPhase2Section(children, phaseOutput<Phase2Output>(byPhase.get(2)))
  }
  if (includePhases.includes(3)) {
    addPhase3Section(
      children,
      phaseOutput<Phase3Output>(byPhase.get(3)),
      canvasPages,
      canvasDataLen,
    )
  }
  if (includePhases.includes(4)) {
    addPhase4Section(children, phaseOutput<Phase4Output>(byPhase.get(4)), filePaths)
  }
  if (includePhases.includes(5)) {
    addPhase5Section(children, phaseOutput<Phase5Output>(byPhase.get(5)))
  }
  if (includePhases.includes(6)) {
    const row = byPhase.get(6)
    addPhase6Section(
      children,
      row?.outputData && typeof row.outputData === 'object'
        ? (row.outputData as Record<string, unknown>)
        : undefined,
    )
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Packer.toBuffer(doc)
}
