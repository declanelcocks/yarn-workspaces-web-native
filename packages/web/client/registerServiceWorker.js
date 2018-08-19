/**
 * `offline-plugin` is used to generate and register the SW. The SW config
 * is handled inside `internal/webpack`.
 *
 * NOTE: We only enable the SW for non-development environments.
 */

import config from '../config'

if (process.env.BUILD_FLAG_IS_DEV === 'false') {
  // Check the SW has been enabled.
  if (config('serviceWorker.enabled')) {
    // eslint-disable-next-line global-require
    // Ensure that the offline-plugin runtime is installed. This ensures
    // that the SW can be executed.
    const OfflinePluginRuntime = require('offline-plugin/runtime')

    // Install & run offline-plugin.
    OfflinePluginRuntime.install({
      onUpdating: () => undefined,
      // When an update is ready we tell the new SW to update straight away.
      onUpdateReady: () => OfflinePluginRuntime.applyUpdate(),
      // After the new SW update, reload the page to ensure the user has
      // the latest assets. This only runs if there were updates available for
      // the cached assets.
      onUpdated: () => window.location.reload(),
      onUpdateFailed: () => undefined,
    })
  }
}
