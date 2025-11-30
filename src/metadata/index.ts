/**
 * Metadata Module
 * Book metadata extraction, parsing, and utilities
 */

// Extractor functions
export {
  extractBookMetadata,
  addPageToMetadata,
  saveMetadata,
  loadMetadata
} from './extractor.js'

// Parser utilities
export {
  parseToc,
  positionToPage,
  pageToPosition,
  getChapterForPage,
  formatTocAsMarkdown,
  formatTocForPdf,
  calculateProgress,
  estimateReadingTime,
  formatReadingTime
} from './parser.js'

// Re-export metadata types from main types
export type {
  BookMetadata,
  AmazonBookMeta,
  AmazonBookInfo,
  Nav,
  TocItem,
  PageChunk,
  ContentChunk,
  AmazonRenderLocationMap,
  AmazonRenderToc,
  AmazonRenderTocItem
} from '../types.js'
