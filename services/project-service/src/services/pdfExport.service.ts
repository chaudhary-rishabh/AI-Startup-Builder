import PDFDocument from 'pdfkit'

import * as canvasQueries from '../db/queries/designCanvas.queries.js'
import * as phaseOutputsQueries from '../db/queries/phaseOutputs.queries.js'
import * as projectFilesQueries from '../db/queries/projectFiles.queries.js'
import * as projectsQueries from '../db/queries/projects.queries.js'

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

export async function generatePdf(projectId: string, includePhases: number[]): Promise<Buffer> {
  const project = await projectsQueries.findProjectById(projectId)
  if (!project) throw new Error('Project not found')

  const allOutputs = await phaseOutputsQueries.findAllPhaseOutputs(projectId)
  const byPhase = new Map(allOutputs.map((o) => [o.phase, o]))
  const canvas = await canvasQueries.findCanvasByProjectId(projectId)
  const files = await projectFilesQueries.findFilesByProject(projectId)

  const chunks: Buffer[] = []
  const doc = new PDFDocument({ margin: 56, size: 'A4' })

  return new Promise((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(22).text(`${project.name} ${project.emoji}`, { align: 'center' })
    doc.moveDown()
    doc.fontSize(11).text(`Generated ${new Date().toISOString().slice(0, 10)}`, { align: 'center' })
    doc.addPage()

    const sorted = [...includePhases].sort((a, b) => a - b)
    for (const p of sorted) {
      doc.fontSize(16).text(`Phase ${p}`, { underline: true })
      doc.moveDown(0.5)
      const out = byPhase.get(p)
      if (!out) {
        doc.fontSize(11).text('No output recorded for this phase.')
      } else if (p === 3) {
        const pages = (canvas?.pages as unknown[] | undefined) ?? []
        const canvasData = (canvas?.canvasData as unknown[] | undefined) ?? []
        doc
          .fontSize(11)
          .text(`Wireframes: ${pages.length} page(s), ~${canvasData.length} canvas element(s).`)
      } else if (p === 4) {
        doc.fontSize(11).text('Generated files (paths only):')
        doc.moveDown(0.3)
        const paths = files.map((f) => f.path).join('\n') || 'No files.'
        doc.fontSize(9).text(paths, { width: 500 })
      } else if (p === 5) {
        const data = asRecord(out.outputData)
        const summary =
          typeof data['testSummary'] === 'string'
            ? (data['testSummary'] as string)
            : JSON.stringify(out.outputData).slice(0, 6000)
        doc.fontSize(11).text('Tests & CI/CD')
        doc.moveDown(0.3)
        doc.fontSize(9).text(summary, { width: 500 })
      } else if (p === 6) {
        const data = asRecord(out.outputData)
        const summary =
          typeof data['kpiRecommendations'] === 'string'
            ? (data['kpiRecommendations'] as string)
            : JSON.stringify(out.outputData).slice(0, 6000)
        doc.fontSize(11).text('Growth & KPIs')
        doc.moveDown(0.3)
        doc.fontSize(9).text(summary, { width: 500 })
      } else {
        doc.fontSize(9).text(JSON.stringify(out.outputData, null, 2).slice(0, 8000), { width: 500 })
      }
      doc.moveDown()
      if (doc.y > 700) doc.addPage()
    }

    doc.end()
  })
}
