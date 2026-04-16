import { createBm25EncoderForDocument } from './bm25Encoder.service.js'
import { splitIntoChunks } from './chunker.service.js'
import { enrichChunks } from './contextEnrichment.service.js'
import { embedTexts } from './embedder.service.js'
import { extractText } from './extractor.service.js'
import { pineconeService } from './pinecone.service.js'
import { publishDocumentIndexed, publishDocumentIndexingFailed } from '../events/publisher.js'
import { AppError } from '../lib/errors.js'
import { downloadFromS3, uploadToS3 } from '../lib/s3.js'
import { updateDocumentStatus } from '../db/queries/ragDocuments.queries.js'
import { pineconeNamespaceForUser, updateNamespaceStats } from '../db/queries/ragNamespaces.queries.js'

export interface IngestJobData {
  docId: string
  userId: string
  s3Key: string
  filename: string
  fileType: string
  contentHash: string
}

function mimeFromFileType(fileType: string): string {
  switch (fileType) {
    case 'pdf':
      return 'application/pdf'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'txt':
      return 'text/plain'
    case 'md':
      return 'text/markdown'
    default:
      return 'application/octet-stream'
  }
}

export function classifyIngestError(err: unknown): string {
  if (err instanceof AppError) {
    switch (err.code) {
      case 'EXTRACTION_EMPTY':
        return 'Document appears to be empty or image-only.'
      case 'EXTRACTION_FAILED':
        return 'Failed to read document contents.'
      case 'UNSUPPORTED_FILE_TYPE':
        return 'File type not supported.'
      case 'EMBEDDING_RATE_LIMIT':
        return 'Embedding service rate limited. Will retry.'
      case 'EMBEDDING_SERVICE_UNAVAILABLE':
        return 'Embedding service unavailable. Will retry.'
      case 'PINECONE_UNAVAILABLE':
        return 'Vector storage unavailable. Will retry.'
      case 'CHUNKING_FAILED':
        return 'Document could not be split into chunks.'
      default:
        return err.message
    }
  }
  return 'An unexpected error occurred during document processing.'
}

export async function runIngestionPipeline(job: IngestJobData): Promise<void> {
  const mimeType = mimeFromFileType(job.fileType)

  try {
    await updateDocumentStatus(job.docId, { status: 'processing' })

    const buffer = await downloadFromS3(job.s3Key)

    const extractResult = await extractText(buffer, mimeType, job.filename)

    await uploadToS3(`${job.s3Key}.extracted.txt`, extractResult.text, 'text/plain')

    const chunkResult = splitIntoChunks(extractResult.text)
    if (chunkResult.chunkCount === 0) {
      throw new AppError('CHUNKING_FAILED', 'No chunks produced from document', 422)
    }

    const enrichResult = await enrichChunks(extractResult.text, chunkResult.chunks, {
      filename: job.filename,
      fileType: job.fileType,
      userId: job.userId,
    })

    const enrichedTexts = enrichResult.enrichedChunks.map((c) => c.enrichedText)
    const embeddingResult = await embedTexts(enrichedTexts)

    const bm25 = createBm25EncoderForDocument()
    let sparseVectors = await bm25.fitAndEncode(enrichedTexts)
    if (sparseVectors.length !== enrichedTexts.length) {
      sparseVectors = enrichedTexts.map(() => ({ indices: [], values: [] }))
    }

    const namespace = pineconeNamespaceForUser(job.userId)
    const vectors = enrichResult.enrichedChunks.map((chunk, i) => ({
      id: `${job.docId}_chunk_${chunk.chunkIndex}`,
      values: embeddingResult.embeddings[i] ?? [],
      sparseValues: sparseVectors[i] ?? { indices: [], values: [] },
      metadata: {
        docId: job.docId,
        userId: job.userId,
        filename: job.filename,
        chunkIndex: chunk.chunkIndex,
        contextualPrefix: chunk.contextualPrefix,
        originalText: chunk.originalText,
        enrichedText: chunk.enrichedText,
        tokenCount: chunk.tokenCount,
        fileType: job.fileType,
        indexedAt: new Date().toISOString(),
      },
    }))

    await pineconeService.upsertVectors({ namespace, vectors })

    await updateDocumentStatus(job.docId, {
      status: 'indexed',
      chunkCount: enrichResult.enrichedChunks.length,
      indexedAt: new Date(),
    })

    await updateNamespaceStats(job.userId, {
      docCountDelta: 1,
      chunkCountDelta: enrichResult.enrichedChunks.length,
    })

    await publishDocumentIndexed({
      userId: job.userId,
      docId: job.docId,
      chunkCount: enrichResult.enrichedChunks.length,
      namespace,
    })
  } catch (err) {
    await updateDocumentStatus(job.docId, {
      status: 'failed',
      errorMessage: classifyIngestError(err),
    })
    await publishDocumentIndexingFailed({
      userId: job.userId,
      docId: job.docId,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
