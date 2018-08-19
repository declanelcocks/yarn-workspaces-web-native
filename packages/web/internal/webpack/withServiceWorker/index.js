import { sync as globSync } from 'glob'
import appRootDir from 'app-root-dir'
import path from 'path'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import OfflinePlugin from 'offline-plugin'

import config from '../../../config'
import ClientConfig from '../../../config/components/ClientConfig'

export default function withServiceWorker(webpackConfig, bundleConfig) {
  if (!config('serviceWorker.enabled')) {
    return webpackConfig
  }

  // Generate the Offline Page.
  //
  // Use HtmlWebpackPlugin to produce an offline HTML page that will be used
  // by the SW to support offline rendering of the app.
  webpackConfig.plugins.push(
    new HtmlWebpackPlugin({
      filename: config('serviceWorker.offlinePageFileName'),
      template: `babel-loader!${path.resolve(
        __dirname,
        './offlinePageTemplate.js',
      )}`,
      production: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeNilAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
      inject: true,
      // Pass config and ClientConfig script component as it will
      // be needed by the offline template.
      custom: {
        config,
        ClientConfig,
      },
    }),
  )

  // Use `offline-plugin` to generate the SW and handle the runtime
  // installation of the SW. The SW will precache all generated client bundle
  // assets and any static "public" folder assets.
  //
  // It will also use the "offline" page generated above to ensure the app is
  // still useable offline.
  //
  // When any static or bundle files change, the user's cache will be updated.
  webpackConfig.plugins.push(
    new OfflinePlugin({
      // This is the path where the assets will be served from. For the client,
      // this will resolve to `build/client/`.
      publicPath: bundleConfig.webPath,
      // When using the publicPath we need to disable the "relativePaths"
      // feature of this plugin.
      relativePaths: false,
      ServiceWorker: {
        // The name of our SW. By default, it would resolve to `sw.js`.
        output: config('serviceWorker.fileName'),
        // Enable events so that we can register updates.
        events: true,
        // By default, SWs will be output from the `publicPath` above, which
        // we don't want. The SW will still live in `/build/client/sw.js`,
        // but by setting `publicPath` here, we make sure any request to `/sw.js`
        // will serve the file from the build folder.
        publicPath: `/${config('serviceWorker.fileName')}`,
        // When offline, this HTML page will be used, which takes care of
        // injected all the necessary assets.
        navigateFallbackURL: `${bundleConfig.webPath}${config(
          'serviceWorker.offlinePageFileName',
        )}`,
      },
      // According to the Mozilla docs, AppCache is considered deprecated.
      // @see https://mzl.la/1pOZ5wF
      AppCache: false,
      // External files to be included with the SW. Add the polyfill script
      // if it is enabled in the config.
      externals: (config('polyfillIO.enabled')
        ? [
            `${config('polyfillIO.url')}?features=${config(
              'polyfillIO.features',
            ).join(',')}`,
          ]
        : []
      )
        // Add any included public folder assets specified in the config.
        .concat(
          config('serviceWorker.includePublicAssets').reduce((acc, cur) => {
            const publicAssetPathGlob = path.resolve(
              appRootDir.get(),
              config('publicAssetsPath'),
              cur,
            )
            const publicFileWebPaths = acc.concat(
              // First get all the matching public folder files.
              globSync(publicAssetPathGlob, { nodir: true })
                // Then map them to relative paths against the public folder.
                // We need to do this as we need the "web" paths for each one.
                .map(publicFile =>
                  path.relative(
                    path.resolve(appRootDir.get(), config('publicAssetsPath')),
                    publicFile,
                  ),
                )
                // Add the leading "/" indicating the file is being hosted
                // off the root of the application.
                .map(relativePath => `/${relativePath}`),
            )
            return publicFileWebPaths
          }, []),
        ),
    }),
  )

  return webpackConfig
}
