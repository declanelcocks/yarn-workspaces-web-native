import React from 'react'
import PropTypes from 'prop-types'
import serialize from 'serialize-javascript'

import filterWithRules from '../../shared/utils/objects/filterWithRules'
import values from '../values'

const clientConfig = filterWithRules(
  // Rules used to extract the client specific config values
  values.clientConfigFilter,
  // The config values
  values,
)

const serializedClientConfig = serialize(clientConfig)

/**
 * This component is used to attach the serialized client config
 * to `window.__CLIENT_CONFIG__`. These variables are defined in
 * `config/values.js` under `clientConfig`.
 */
function ClientConfig({ nonce }) {
  return (
    <script
      type="text/javascript"
      nonce={nonce}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: `window.__CLIENT_CONFIG__=${serializedClientConfig}`,
      }}
    />
  )
}

ClientConfig.propTypes = {
  nonce: PropTypes.string.isRequired,
}

export default ClientConfig
