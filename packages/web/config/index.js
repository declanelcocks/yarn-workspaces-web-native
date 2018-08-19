/* eslint-disable no-console */
/* eslint-disable import/global-require */
/* eslint-disable no-underscore-dangle */

/**
 * The config helper allows you to use the same API in accessing config values
 * no matter where the code is being executed (i.e. browser/node).
 *
 * e.g.
 *   import config from '../config'
 *   config('messages.welcome') // => "Hello World!"
 *
 * Why?
 * 1. It's annoying having to create different config setups for each environment
 * 2. We could use Webpack's `DefinePlugin`, but these values are statically bound
 *    during the build process. This means that with `FOO=bar npm run start`, `FOO`
 *    wouldn't be available during the build process.
 *
 * How?
 * Instead, we generate a config object and attach it to `window.__CLIENT_CONFIG__`
 * within the HTML that's sent to the browser. This ensures the client config is
 * correctly exposed to the browser.
 */

let configCache

/**
 * Resolves the correct config based on our environment. For node we use the
 * standard config file. For browsers we use the object bound to `window` by
 * our `reactApplication` middleware.
 *
 * @return {Object} The environment's config object
 */
function resolveConfigForBrowserOrNode() {
  if (configCache) return configCache

  // Running in Node
  if (
    typeof process.env.BUILD_FLAG_IS_NODE === 'undefined' ||
    process.env.BUILD_FLAG_IS_NODE === 'true'
  ) {
    configCache = require('./values').default // eslint-disable-line global-require
    return configCache
  }

  // Running in the browser
  if (
    typeof window !== 'undefined' &&
    typeof window.__CLIENT_CONFIG__ === 'object'
  ) {
    configCache = window.__CLIENT_CONFIG__
  } else {
    // Assume we are running in the browser
    console.warn('No client configuration object was bound to the window.')
    configCache = {}
  }

  return configCache
}

/**
 * Takes care of fetching the required config value. Depending on the environment,
 * it will fetch the config from either `window.__CLIENT_CONFIG__` or
 * `<root>/config/values.js` and try to get the value.
 *
 * If we can't find the value, an error will be thrown informing the user the path
 * cannot be found in the respective config object.
 */
export default function get(path) {
  const parts = typeof path === 'string' ? path.split('.') : path

  // No path passed in
  if (parts.length === 0) {
    throw new Error(
      'You must provide the path to the configuration value you would like to consume.',
    )
  }

  // Fetch the config object according to the environment
  let result = resolveConfigForBrowserOrNode()

  // Resolve the requested path within the config object
  for (let i = 0; i < parts.length; i += 1) {
    if (result === undefined) {
      const errorMessage = `Failed to resolve configuration value at "${parts.join(
        '.',
      )}".`

      // This "if" block gets stripped away by webpack for production builds.
      if (
        process.env.BUILD_FLAG_IS_DEV === 'true' &&
        process.env.BUILD_FLAG_IS_CLIENT === 'true'
      ) {
        throw new Error(
          `${errorMessage} We have noticed that you are trying to access this configuration value from the client bundle (i.e. code that will be executed in a browser). For configuration values to be exposed to the client bundle you must ensure that the path is added to the client configuration filter in the project configuration values file.`,
        )
      }

      throw new Error(errorMessage)
    }

    result = result[parts[i]]
  }

  return result
}
