import appRootDir from 'app-root-dir'
import AssetsPlugin from 'assets-webpack-plugin'
import ExtractTextPlugin from 'extract-text-webpack-plugin'
import UglifyJsPlugin from 'uglifyjs-webpack-plugin'
import nodeExternals from 'webpack-node-externals'
import path from 'path'
import webpack from 'webpack'

import { happyPackPlugin, log } from '../utils'
import { ifElse } from '../../shared/utils/logic'
import { mergeDeep } from '../../shared/utils/objects'
import { removeNil } from '../../shared/utils/arrays'
import withServiceWorker from './withServiceWorker'
import config from '../../config'

/**
 * Generates a webpack config
 *
 * This function has been configured to support one client/web bundle, and any
 * number of additional node bundles (e.g. the server).
 *
 * @param  {Object} buildOptions - The build options.
 * @param  {target} buildOptions.target - The bundle target (e.g 'client' || 'server').
 * @param  {target} buildOptions.optimize - Build an optimised version of the bundle?
 *
 * @return {Object} The webpack config
 */
export default function webpackConfigFactory(buildOptions) {
  const { target, optimize = false } = buildOptions

  const isProd = optimize
  const isDev = !isProd
  const isClient = target === 'client'
  const isServer = target === 'server'
  const isNode = !isClient

  const ifDev = ifElse(isDev)
  const ifProd = ifElse(isProd)
  const ifNode = ifElse(isNode)
  const ifClient = ifElse(isClient)
  const ifDevClient = ifElse(isDev && isClient)
  const ifProdClient = ifElse(isProd && isClient)

  log({
    level: 'info',
    title: 'Webpack',
    message: `Creating ${
      isProd ? 'an optimised' : 'a development'
    } bundle configuration for the "${target}"`,
  })

  const bundleConfig =
    isServer || isClient
      ? // Client or server bundle
        config(['bundles', target])
      : // Additional node bundle
        config(['additionalNodeBundles', target])

  if (!bundleConfig) {
    throw new Error('No bundle configuration exists for target:', target)
  }

  let webpackConfig = {
    // Webpack Mode
    mode: ifDev('development', 'production'),
    // Define entry chunks for the bundle.
    entry: {
      index: removeNil([
        // We are using polyfill.io instead of babel-polyfillas it's much lighter.
        // This means we need to add `regenerator-runtime` as polyfill.io
        // doesn't cover generator/async functions.
        ifClient('regenerator-runtime/runtime'),
        // Extends hot reloading with the ability to hot patch React Components.
        // This should always be at the top of the entries list, only below the
        // polyfills.
        ifDevClient('react-hot-loader/patch'),
        // Required to support client hot reloading.
        ifDevClient(
          () =>
            `webpack-hot-middleware/client?reload=true&path=http://${config(
              'host',
            )}:${config('clientDevServerPort')}/__webpack_hmr`,
        ),

        // The source entry file for the bundle. For `client`, this would be
        // getting the file path from `config.values.js` @ `bundles.client.srcEntryFile`
        // which will be `./client/index.js`.
        path.resolve(appRootDir.get(), bundleConfig.srcEntryFile),
      ]),
    },

    // Bundle output configuration.
    output: {
      // The source entry file for the bundle. For `client`, this would be
      // getting the file path from `config.values.js` @ `bundles.client.srcEntryFile`
      // which will be `./build/client`.
      path: path.resolve(appRootDir.get(), bundleConfig.outputPath),
      filename: ifProdClient(
        // For production, include a hash in the filename so we don't hit any
        // browser caching issues.
        '[name]-[chunkhash].js',
        '[name].js',
      ),
      chunkFilename: '[name]-[chunkhash].js',
      // Webpack 4 will overwrite the index file path in assets.json with HMRs chunk
      // path. The assets-plugin detects HMR chunks with a RegExp based on
      // `config.output.hotUpdateChunkFilename`. In Webpack 4, this seems to be
      // `undefined`.
      hotUpdateChunkFilename: '[hash].hot-update.js',
      // When targetting node, output our bundle as a commonjs2 module.
      libraryTarget: ifNode('commonjs2', 'var'),
      // This is the web path under which our webpack bundled client should
      // be considered as being served from.
      publicPath: ifDev(
        // As we run a seperate development server for our client and server
        // bundles we need to use an absolute http path for the public path.
        `http://${config('host')}:${config('clientDevServerPort')}${config(
          'bundles.client.webPath',
        )}`,
        // Otherwise we expect our bundled client to be served from this path.
        // If we create a build, `webPath` would be `/client/` which points it
        // to `build/client/index.js`
        bundleConfig.webPath,
      ),
    },

    // Set runtime target
    target: isClient ? 'web' : 'node',

    // Ensure that webpack polyfills the following node features for use
    // within any bundle that's targetting node as a runtime. This will be
    // ignored otherwise.
    node: {
      __dirname: true,
      __filename: true,
    },

    // Source map settings.
    devtool: ifElse(
      // Include source maps for ANY node bundles. This will provide nice
      // stack traces for errors.
      isNode ||
        // Always include source maps in development.
        isDev ||
        // The following flag can be used to force source maps even for
        // production builds.
        config('includeSourceMapsForOptimisedClientBundle'),
    )('source-map', 'hidden-source-map'),

    // For the production client bundle, we will output warnings if the bundle
    // sizes are too large.
    performance: ifProdClient({ hints: 'warning' }, false),

    // Webpack 4 automatically runs UglifyPlugin and other processes.
    optimization: {
      minimizer: ifProdClient([
        new UglifyJsPlugin({
          uglifyOptions: {
            ecma: 8,
            compress: {
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
            },
            mangle: {
              safari10: true,
            },
            output: {
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
          // Use multi-process parallel running to improve the build speed
          // Default number of concurrent runs: os.cpus().length - 1
          parallel: true,
          // Enable file caching
          cache: true,
          sourceMap: config('includeSourceMapsForOptimisedClientBundle'),
        }),
      ]),
    },

    resolve: {
      // These extensions are tried when resolving a file.
      extensions: config('bundleSrcTypes').map(ext => `.${ext}`),

      // This is required for the modernizr-loader
      // @see https://github.com/peerigon/modernizr-loader
      alias: {
        modernizr$: path.resolve(appRootDir.get(), './.modernizrrc.json'),
      },
    },

    // If node, we don't want `node_modules` to be included in our bundles, so
    // we extract those modules out using `webpack-node-externals`.
    externals: removeNil([
      ifNode(() =>
        nodeExternals(
          // Some node_modules contain files that depend on webpack loaders,
          // e.g. CSS or SASS. For these, make sure they are being picked up
          // by `nodeExternalsFileTypeWhitelist` below.
          {
            whitelist: removeNil(['source-map-support/register'])
              // And any items that have been whitelisted in the config need
              // to be included in the bundling process too. By default, files
              // caught here will be any kind of "asset" files.
              .concat(config('nodeExternalsFileTypeWhitelist') || []),
          },
        ),
      ),
    ]),

    plugins: removeNil([
      // Use BannerPlugin to make sure all of chunks get the source map support
      // installed.
      ifNode(
        () =>
          new webpack.BannerPlugin({
            banner: 'require("source-map-support").install()',
            raw: true,
            entryOnly: false,
          }),
      ),

      // When using `process.env` flags throughout our code, UglifyJSPlugin will
      // take care of removing any unreachable code.
      //
      // For example, if we have `if (process.env.FOO === 'true')`, then it will
      // be replaces with `if ('false' === 'true')`, and subsequently be removed
      // by UglifyJSPlugin.
      new webpack.EnvironmentPlugin({
        // Use NODE_ENV=production to make sure optimised versions of some
        // node_modules are used, such as React.
        NODE_ENV: isProd ? 'production' : 'development',
        BUILD_FLAG_IS_CLIENT: JSON.stringify(isClient),
        BUILD_FLAG_IS_SERVER: JSON.stringify(isServer),
        BUILD_FLAG_IS_NODE: JSON.stringify(isNode),
        BUILD_FLAG_IS_DEV: JSON.stringify(isDev),
      }),

      // Generates a JSON file containing a map of all the output files for
      // the webpack bundle. A necessisty for the server rendering process
      // as we need to interogate these files in order to know what JS/CSS
      // we need to inject into our HTML. We only need to know the assets for
      // our client bundle.
      ifClient(
        () =>
          new AssetsPlugin({
            filename: config('bundleAssetsFileName'),
            path: path.resolve(appRootDir.get(), bundleConfig.outputPath),
          }),
      ),

      // Ignore Webpack errors in development as it will kill the dev server
      ifDev(() => new webpack.NoEmitOnErrorsPlugin()),

      // Enable hot reloading of the client.
      ifDevClient(() => new webpack.HotModuleReplacementPlugin()),

      // For production, extract CSS into CSS files
      ifProdClient(
        () =>
          new ExtractTextPlugin({
            filename: '[name]-[contenthash].css',
            allChunks: true,
          }),
      ),

      // -----------------------------------------------------------------------
      // HAPPY PACK PLUGINS
      // HappyPack is used to introduce threads to execute our builds. This means
      // we can get parallel execution of our loaders, improving build and reload
      // times.
      happyPackPlugin({
        name: 'happypack-javascript',
        // Use babel to do all JS processing.
        loaders: [
          {
            path: 'babel-loader',
            // `plugins.babelConfig` will hold any additional setup we want to add
            // to babel.
            query: config('plugins.babelConfig')(
              // Our "standard" babel config holding all default settings.
              {
                // Ensures that the babelrc doesn't get interpretted. F the current
                // config this would mean it would kill our webpack treeshaking feature
                // as modules transpilation has not been disabled within it.
                babelrc: false,

                presets: [
                  'react',
                  // Add anything lower than stage 3 at your own risk.
                  'stage-3',
                  // For client bundles, transpile into ES5, safe for browsers. We exclude
                  // module transilation as webpack takes care of this, doing tree shaking
                  // in the process.
                  ifClient(['env', { es2015: { modules: false } }]),
                  // For node, make sure babel-preset-env is set to node
                  ifNode(['env', { targets: { node: true } }]),
                ].filter(x => x != null),

                plugins: [
                  ifDevClient('react-hot-loader/babel'),
                  // Decorates JSX elements with  `__self` prop. React will use these to
                  // generate some runtime warnings.
                  ifDev('transform-react-jsx-self'),
                  // Give us the component's path in React Dev Tools.
                  ifDev('transform-react-jsx-source'),
                  // Replaces `React.createElement` with an optimized, production friendly
                  // function. `Symbol` needs to be polyfilled for this to work, so make
                  // sure it is in the `polyfill.io` config.
                  ifProd('transform-react-inline-elements'),
                  // Hoists element creation to top level for subtrees that are fully static.
                  // This will reduce the number of `React.createElement` calls and helps
                  // React to skip the reconciling process as often as possible.
                  ifProd('transform-react-constant-elements'),
                  'transform-class-properties',
                  'syntax-dynamic-import',
                  [
                    'babel-plugin-styled-components',
                    {
                      ssr: true,
                    },
                  ],
                ].filter(x => x != null),
              },
              buildOptions,
            ),
          },
        ],
      }),

      // HappyPack 'css' instance for development client.
      ifDevClient(() =>
        happyPackPlugin({
          name: 'happypack-devclient-css',
          loaders: [
            'style-loader',
            {
              path: 'css-loader',
              query: { sourceMap: true },
            },
          ],
        }),
      ),

      // END: HAPPY PACK PLUGINS
      // -----------------------------------------------------------------------
    ]),
    module: {
      // Use `strictExportPresence` so that a missing export becomes a compile error.
      strictExportPresence: true,
      rules: [
        {
          // "oneOf" will traverse all imports with "one of" these loaders until one
          // matches it. When no loader matches it will fallback to the `file-loader`.
          oneOf: removeNil([
            // JAVASCRIPT
            {
              test: /\.jsx?$/,
              // Defer JS processing to the happypack plugin "happypack-javascript".
              // See plugin within the `plugins` section for full details.
              loader: 'happypack/loader?id=happypack-javascript',
              include: removeNil([
                ...bundleConfig.srcPaths.map(srcPath =>
                  path.resolve(appRootDir.get(), srcPath),
                ),
                ifProdClient(path.resolve(appRootDir.get(), 'src/html')),
              ]),
            },

            // CSS
            // This is bound to our server/client bundles as we only expect to be
            // serving the client bundle as an SPA through the server.
            ifElse(isClient || isServer)(
              mergeDeep(
                {
                  test: /\.css$/,
                },
                // For development clients, defer all css processing to
                // "happypack-devclient-css". See plugin within the plugins section for full
                // details.
                ifDevClient({
                  loaders: ['happypack/loader?id=happypack-devclient-css'],
                }),
                // For production clients, build the CSS using ExtractTextPlugin. We don't
                // use happypack here as there some issues between happypack and the plugin.
                ifProdClient(() => ({
                  loader: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: ['css-loader'],
                  }),
                })),
                // For the server, use `css-loader/locals` as we don't need any CSS files
                // on the server.
                ifNode({
                  loaders: ['css-loader/locals'],
                }),
              ),
            ),

            // Use modernizr to allow feature detection within the client.
            ifClient({
              test: /\.modernizrrc.js$/,
              loader: 'modernizr-loader',
            }),

            // ASSETS (Images/Fonts/etc)
            // This is bound to our server/client bundles as we only expect to be
            // serving the client bundle as an SPA through the server.
            ifElse(isClient || isServer)(() => ({
              loader: 'file-loader',
              exclude: [/\.js$/, /\.html$/, /\.json$/],
              query: {
                // Set the web path where the client bundle will be served from.
                // The same value has to be used on both server/client to ensure
                // that SSR and the browser use the same paths.
                publicPath: isDev
                  ? `http://${config('host')}:${config(
                      'clientDevServerPort',
                    )}${config('bundles.client.webPath')}`
                  : // Otherwise use the configured `webPath` for the client.
                    config('bundles.client.webPath'),
                // Only emit files when building a web bundle, for the server
                // bundle we only care about the file loader being able to create
                // the correct asset URLs.
                emitFile: isClient,
              },
            })),

            // Do not add any loader after file loader (fallback loader).
          ]),
        },
      ],
    },
  }

  if (isProd && isClient) {
    webpackConfig = withServiceWorker(webpackConfig, bundleConfig)
  }

  // Apply the configuration middleware.
  return config('plugins.webpackConfig')(webpackConfig, buildOptions)
}
