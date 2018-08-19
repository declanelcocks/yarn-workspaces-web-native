/* eslint-disable no-console */
import Modernizr from 'modernizr'
import '../../shared/polyfills'

/**
 * This file is used to polyfill any web APIs that you want to support.
 *
 * For example, below we are checking if the client supports the "picture"
 * element. If it doesn't support it, we can polyfill it.
 *
 * This file will be imported by `client/index.js` and ran when the app
 * is client loads the app.
 */
if (!Modernizr.picture) {
  console.log('Client does not support "picture", polyfilling it...')
  // require('picturefill')
  // require('picturefill/dist/plugins/mutation/pf.mutation')
} else {
  console.log('Client has support for "picture".')
}
