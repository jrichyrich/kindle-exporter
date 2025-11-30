/**
 * Readline utilities for interactive CLI prompts
 */

import readline from 'readline/promises'
import { stdin as input, stdout as output } from 'process'
import chalk from 'chalk'

/**
 * Wait for user to press Enter before continuing
 */
export async function waitForEnter(message: string): Promise<void> {
  const rl = readline.createInterface({ input, output })

  try {
    await rl.question(chalk.cyan(message))
  } finally {
    rl.close()
  }
}

/**
 * Ask user a yes/no question
 */
export async function confirm(
  message: string,
  defaultYes = false
): Promise<boolean> {
  const rl = readline.createInterface({ input, output })

  try {
    const suffix = defaultYes ? ' [Y/n]: ' : ' [y/N]: '
    const response = await rl.question(chalk.cyan(message + suffix))
    const trimmed = response.trim().toLowerCase()

    if (!trimmed) {
      return defaultYes
    }

    return /^y(es)?$/i.test(trimmed)
  } finally {
    rl.close()
  }
}

/**
 * Ask user for text input
 */
export async function prompt(
  message: string,
  defaultValue?: string
): Promise<string> {
  const rl = readline.createInterface({ input, output })

  try {
    const suffix = defaultValue ? ` (default: ${defaultValue}): ` : ': '
    const response = await rl.question(chalk.cyan(message + suffix))
    const trimmed = response.trim()

    return trimmed || defaultValue || ''
  } finally {
    rl.close()
  }
}
