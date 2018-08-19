import React from 'react'
import { configure, addDecorator } from '@storybook/react'
import { withConsole } from '@storybook/addon-console'
import { setOptions } from '@storybook/addon-options'
import StoryRouter from 'storybook-router'
import Wrapper from './Wrapper'

import './style.css'

const req = require.context('../shared/components', true, /.stories.js$/)

function loadStories() {
  req.keys().forEach(req)
}

addDecorator((storyFn, context) => withConsole()(storyFn)(context))
setOptions({
  hierarchyRootSeparator: /\|/,
})

addDecorator(StoryRouter())
addDecorator(story => <Wrapper>{story()}</Wrapper>)

configure(loadStories, module)
