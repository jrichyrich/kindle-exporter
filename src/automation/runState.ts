/**
 * Run State Management
 * Manages export progress and enables resume capability
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { RunState, OcrEngine, CaptureMode } from '../types.js'

/**
 * Create initial run state
 */
export function createRunState(
  bookTitle: string,
  asin: string | undefined,
  captureMode: CaptureMode,
  ocrProvider: OcrEngine
): RunState {
  return {
    version: '0.1.0',
    bookTitle,
    asin,
    startTime: new Date().toISOString(),
    status: 'in-progress',
    lastPage: 0,
    exportedPages: 0,
    captureMode,
    ocrProvider,
    ocrFailures: 0
  }
}

/**
 * Update run state
 */
export function updateRunState(
  state: RunState,
  updates: Partial<RunState>
): RunState {
  return {
    ...state,
    ...updates
  }
}

/**
 * Mark run state as completed
 */
export function completeRunState(state: RunState): RunState {
  return {
    ...state,
    status: 'completed',
    endTime: new Date().toISOString()
  }
}

/**
 * Mark run state as failed
 */
export function failRunState(state: RunState, reason: string): RunState {
  return {
    ...state,
    status: 'failed',
    endTime: new Date().toISOString(),
    stopReason: reason
  }
}

/**
 * Get run state file path
 */
export function getRunStatePath(outputDir: string, bookTitle: string): string {
  return join(outputDir, sanitizeFolderName(bookTitle), 'run-state.json')
}

/**
 * Save run state to file
 */
export async function saveRunState(
  state: RunState,
  outputDir: string
): Promise<void> {
  const filePath = getRunStatePath(outputDir, state.bookTitle)
  const dirPath = join(outputDir, sanitizeFolderName(state.bookTitle))

  // Ensure directory exists
  await mkdir(dirPath, { recursive: true })

  // Write state
  await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8')
}

/**
 * Load run state from file
 */
export async function loadRunState(
  outputDir: string,
  bookTitle: string
): Promise<RunState | null> {
  const filePath = getRunStatePath(outputDir, bookTitle)

  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = await readFile(filePath, 'utf-8')
    return JSON.parse(content) as RunState
  } catch (error) {
    console.warn('Failed to load run state:', error)
    return null
  }
}

/**
 * Check if export can be resumed
 */
export async function canResume(
  outputDir: string,
  bookTitle: string
): Promise<boolean> {
  const state = await loadRunState(outputDir, bookTitle)
  return state !== null && state.status === 'in-progress' && state.lastPage > 0
}

/**
 * Get resume page number
 */
export async function getResumePage(
  outputDir: string,
  bookTitle: string
): Promise<number> {
  const state = await loadRunState(outputDir, bookTitle)
  return state?.lastPage || 0
}

/**
 * Calculate export statistics
 */
export function calculateStats(state: RunState): RunState['stats'] {
  if (!state.startTime) {
    return undefined
  }

  const startTime = new Date(state.startTime).getTime()
  const endTime = state.endTime ? new Date(state.endTime).getTime() : Date.now()

  const totalTime = endTime - startTime
  const avgTimePerPage =
    state.exportedPages > 0 ? totalTime / state.exportedPages : 0

  return {
    screenshotTime: 0, // Would be tracked during capture
    ocrTime: 0, // Would be tracked during OCR
    totalTime,
    avgTimePerPage
  }
}

/**
 * Update run state with statistics
 */
export function updateRunStateStats(state: RunState): RunState {
  return {
    ...state,
    stats: calculateStats(state)
  }
}

/**
 * Sanitize folder name
 */
function sanitizeFolderName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 200)
}
