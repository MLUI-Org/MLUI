import '@mlui/litegraph/litegraph.css'

import './styles.css'

import { mountDesktopApp } from './app'

const root = document.querySelector<HTMLElement>('#app')

if (!root) {
  throw new Error('Renderer root element was not found.')
}

void mountDesktopApp(root)
