/**
 * This is used by HtmlWebpackPlugin to generate a fallback HTML page for the
 * SW when the user is offline. It will embed all the requireed asset paths
 * needed to run the app in an offline session.
 */
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import HTML from '../../../shared/components/HTML'

module.exports = function generate(context) {
  // eslint-disable-next-line prefer-destructuring
  const ClientConfig = context.htmlWebpackPlugin.options.custom.ClientConfig
  const html = renderToStaticMarkup(
    <HTML
      bodyElements={<ClientConfig nonce="OFFLINE_PAGE_NONCE_PLACEHOLDER" />}
    />,
  )
  return `<!DOCTYPE html>${html}`
}
