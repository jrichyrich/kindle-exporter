/**
 * Automation Module
 * Browser automation, screenshot capture, and workflow orchestration
 */

// Browser session management
export {
  createBrowserSession,
  navigateToKindle,
  waitForPageReady,
  getCurrentPageNumber,
  isLastPage,
  navigateNextPage,
  navigatePrevPage,
  closeBrowserSession,
  type BrowserSessionConfig,
  type BrowserSession
} from './browser.js'

// Screenshot capture
export { capturePage, capturePages, type CaptureOptions } from './capture.js'

// Run state management
export {
  createRunState,
  updateRunState,
  completeRunState,
  failRunState,
  getRunStatePath,
  saveRunState,
  loadRunState,
  canResume,
  getResumePage,
  calculateStats,
  updateRunStateStats
} from './runState.js'

// Re-export types from main types
export type { RunState, RunStatus, PageChunk, ContentChunk } from '../types.js'
