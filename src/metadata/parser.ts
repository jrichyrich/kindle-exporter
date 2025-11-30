/**
 * Metadata Parser
 * Utilities for parsing TOC, location maps, and position data
 */

import type {
  TocItem,
  AmazonRenderToc,
  AmazonRenderTocItem,
  AmazonRenderLocationMap
} from '../types.js'

/**
 * Parse Amazon TOC format into flat list with depth
 * @param toc - Raw TOC from Amazon
 * @param locationMap - Location map for position-to-page conversion
 * @returns Flattened TOC with page numbers
 */
export function parseToc(
  toc: AmazonRenderToc,
  locationMap?: AmazonRenderLocationMap
): TocItem[] {
  const flatToc: TocItem[] = []

  function traverse(items: AmazonRenderTocItem[], depth: number): void {
    for (const item of items) {
      const tocItem: TocItem = {
        label: item.label,
        positionId: item.tocPositionId,
        depth
      }

      // Convert position to page number if we have a location map
      if (locationMap) {
        tocItem.page = positionToPage(item.tocPositionId, locationMap)
        tocItem.location = item.tocPositionId
      }

      flatToc.push(tocItem)

      // Recursively process children
      if (item.entries && item.entries.length > 0) {
        traverse(item.entries, depth + 1)
      }
    }
  }

  traverse(toc, 0)
  return flatToc
}

/**
 * Convert Kindle position/location to page number
 * @param position - Kindle position ID
 * @param locationMap - Location map
 * @returns Page number (1-indexed)
 */
export function positionToPage(
  position: number,
  locationMap: AmazonRenderLocationMap
): number {
  if (!locationMap.navigationUnit || locationMap.navigationUnit.length === 0) {
    return 1
  }

  // Find the navigation unit that contains this position
  for (let i = 0; i < locationMap.navigationUnit.length; i++) {
    const unit = locationMap.navigationUnit[i]
    if (!unit) continue

    // Check if this position is in or before this unit
    if (position <= unit.startPosition) {
      return Math.max(1, unit.page)
    }

    // Check if this is the last unit
    if (i === locationMap.navigationUnit.length - 1) {
      return unit.page
    }

    // Check if position is between this unit and the next
    const nextUnit = locationMap.navigationUnit[i + 1]
    if (
      nextUnit &&
      position >= unit.startPosition &&
      position < nextUnit.startPosition
    ) {
      return unit.page
    }
  }

  // Fallback to last page
  return (
    locationMap.navigationUnit[locationMap.navigationUnit.length - 1]?.page || 1
  )
}

/**
 * Convert page number to Kindle position
 * @param page - Page number (1-indexed)
 * @param locationMap - Location map
 * @returns Kindle position ID
 */
export function pageToPosition(
  page: number,
  locationMap: AmazonRenderLocationMap
): number {
  if (!locationMap.navigationUnit || locationMap.navigationUnit.length === 0) {
    return 0
  }

  // Find the navigation unit for this page
  const unit = locationMap.navigationUnit.find((u) => u.page === page)
  if (unit) {
    return unit.startPosition
  }

  // If exact page not found, find the closest
  for (let i = 0; i < locationMap.navigationUnit.length; i++) {
    const currentUnit = locationMap.navigationUnit[i]
    if (!currentUnit) continue

    const nextUnit = locationMap.navigationUnit[i + 1]

    if (!nextUnit) {
      return currentUnit.startPosition
    }

    if (page >= currentUnit.page && page < nextUnit.page) {
      return currentUnit.startPosition
    }
  }

  return 0
}

/**
 * Get chapter for a given page
 * @param page - Page number
 * @param toc - Table of contents
 * @returns Chapter title or null
 */
export function getChapterForPage(
  page: number,
  toc: TocItem[]
): TocItem | null {
  if (toc.length === 0) {
    return null
  }

  // Find the last TOC entry that starts before or at this page
  let currentChapter: TocItem | null = null

  for (const item of toc) {
    if (item.page && item.page <= page) {
      // Only consider top-level chapters (depth 0) or immediate children (depth 1)
      if (item.depth <= 1) {
        currentChapter = item
      }
    } else {
      // We've passed the current page
      break
    }
  }

  return currentChapter
}

/**
 * Format TOC as markdown list
 * @param toc - Table of contents
 * @returns Markdown formatted TOC
 */
export function formatTocAsMarkdown(toc: TocItem[]): string {
  const lines: string[] = ['# Table of Contents\n']

  for (const item of toc) {
    const indent = '  '.repeat(item.depth)
    const pageInfo = item.page ? ` (Page ${item.page})` : ''
    lines.push(`${indent}- ${item.label}${pageInfo}`)
  }

  return lines.join('\n')
}

/**
 * Format TOC for PDF bookmark generation
 * @param toc - Table of contents
 * @returns Array of bookmark entries
 */
export function formatTocForPdf(
  toc: TocItem[]
): Array<{ title: string; page: number; level: number }> {
  return toc
    .filter((item) => item.page !== undefined)
    .map((item) => ({
      title: item.label,
      page: item.page!,
      level: item.depth
    }))
}

/**
 * Calculate reading progress
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @returns Progress percentage (0-100)
 */
export function calculateProgress(
  currentPage: number,
  totalPages: number
): number {
  if (totalPages === 0) {
    return 0
  }
  return Math.round((currentPage / totalPages) * 100)
}

/**
 * Estimate reading time remaining
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param wordsPerPage - Average words per page
 * @param readingSpeed - Reading speed (words per minute)
 * @returns Estimated minutes remaining
 */
export function estimateReadingTime(
  currentPage: number,
  totalPages: number,
  wordsPerPage: number = 300,
  readingSpeed: number = 250
): number {
  const pagesRemaining = Math.max(0, totalPages - currentPage)
  const wordsRemaining = pagesRemaining * wordsPerPage
  return Math.round(wordsRemaining / readingSpeed)
}

/**
 * Format reading time in human-readable format
 * @param minutes - Minutes
 * @returns Formatted string (e.g., "2h 15m")
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${remainingMinutes}m`
}
