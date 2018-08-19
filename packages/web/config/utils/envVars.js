/**
 * This helper resolves `.env` files that are supported by the `dotenv` library
 */
import appRootDir from 'app-root-dir'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

import ifElse from '../../shared/utils/logic/ifElse'
import removeNil from '../../shared/utils/arrays/removeNil'
import { log } from '../../internal/utils'

function registerEnvFile() {
  const { DEPLOYMENT } = process.env
  const envFile = '.env'

  // Resolve the environment variables in order of priority
  const envFileResolutionOrder = removeNil([
    // Is there a `.env` file? This always takes preference.
    path.resolve(appRootDir.get(), envFile),

    // Is there a `.env` file for our target environment?
    ifElse(DEPLOYMENT)(
      path.resolve(appRootDir.get(), `${envFile}.${DEPLOYMENT}`),
    ),
  ])

  // Find the first `.env` match.
  const envFilePath = envFileResolutionOrder.find(filePath =>
    fs.existsSync(filePath),
  )

  // If we found a `.env` file, register it with `dotenv`.
  if (envFilePath) {
    // eslint-disable-next-line no-console
    log({
      title: 'server',
      level: 'special',
      message: `Registering environment variables from: ${envFilePath}`,
    })
    dotenv.config({ path: envFilePath })
  }
}

// Run our `.env` resolver to register the environment variables
registerEnvFile()

/**
 * Gets a string environment variable by the given name.
 *
 * @param  {String} name - The name of the environment variable.
 * @param  {String} defaultVal - The default value to use.
 *
 * @return {String} The value.
 */
export function string(name, defaultVal) {
  return process.env[name] || defaultVal
}

/**
 * Gets a number environment variable by the given name.
 *
 * @param  {String} name - The name of the environment variable.
 * @param  {number} defaultVal - The default value to use.
 *
 * @return {number} The value.
 */
export function number(name, defaultVal) {
  return process.env[name] ? parseInt(process.env[name], 10) : defaultVal
}

export function bool(name, defaultVal) {
  return process.env[name]
    ? process.env[name] === 'true' || process.env[name] === '1'
    : defaultVal
}
