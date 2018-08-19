/* eslint-disable global-require */
import React from 'react'
import { hydrate } from 'react-dom'
import BrowserRouter from 'react-router-dom/BrowserRouter'
import { AppContainer as ReactHotLoader } from 'react-hot-loader'
import { Provider } from 'react-redux'
import { ThemeProvider } from 'styled-components'
import FontFaceObserver from 'fontfaceobserver'

import './polyfills'

import configureStore from '../shared/redux/configureStore'
import theme from '../shared/components/theme'
import App from '../shared/components/App'
import routes from '../shared/components/routes'
import { ensureReady } from '../shared/components/utils/routes'

// Observe loading of custom font
const robotoObserver = new FontFaceObserver('Roboto', {})
const sourceSerifObserver = new FontFaceObserver('Source Serif Pro', {})

Promise.all([robotoObserver.load(), sourceSerifObserver.load()])
  .then(() => document.body.classList.add('fontloaded'))
  .catch(() => document.body.classList.remove('fontloaded'))

// Get the DOM Element that will host the React app
const container = document.querySelector('#app')

// Create Redux store.
const store = configureStore(
  // Server side rendering would have mounted the Redux state on this global
  window.__APP_STATE__, // eslint-disable-line no-underscore-dangle
)

// Check if the user's browser supports HTML5 history API. If not, then we
// force full page refreshes on each page change.
const supportsHistory = 'pushState' in window.history

function renderApp(App) {
  const app = (
    <ReactHotLoader>
      <Provider store={store}>
        <BrowserRouter forceRefresh={!supportsHistory}>
          <ThemeProvider theme={theme}>
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    </ReactHotLoader>
  )

  hydrate(app, container)
}

// Load all the required components for the requested URL
ensureReady(routes, window.location.pathname).then(() => {
  renderApp(App)
})

// Register service worker for asset caching and offline support. This is the last item,
// just in case the code execution fails. (thanks to react-boilerplate for that tip)
require('./registerServiceWorker')

// Add hot reloading
if (process.env.BUILD_FLAG_IS_DEV === 'true' && module.hot) {
  module.hot.dispose(data => {
    // Deserialize the store and keep it in the hot module ready for the next
    // hot reload
    data.store = stringify(toJS(store)) // eslint-disable-line
  })

  // Accept changes to this file for hot reloading.
  module.hot.accept('./index.js')

  // Any changes to our App will cause a re-render of the app.
  module.hot.accept('../shared/components/App', () => {
    renderApp(require('../shared/components/App').default)
  })
}
