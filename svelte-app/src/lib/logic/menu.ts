import type { MenuBarSpec } from 'lush-types'

export const LUSH_MENU_BAR: MenuBarSpec = {
  menus: [
    {
      kind: 'submenu',
      id: 'help',
      label: 'Help',
      items: [
        {
          kind: 'action',
          id: 'about',
          label: 'About Lush',
          action: 'about'
        }
      ]
    }
  ]
}

