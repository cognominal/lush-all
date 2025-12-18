import type { MenuBarSpec } from 'lush-types'

export const LUSH_MENU_BAR: MenuBarSpec = {
  menus: [
    {
      kind: 'submenu',
      id: 'lush',
      label: 'lush',
      items: [
        {
          kind: 'action',
          id: 'login',
          label: 'Login',
          action: 'login'
        },
        {
          kind: 'separator',
          id: 'sep-1'
        },
        {
          kind: 'action',
          id: 'about',
          label: 'About Lush',
          action: 'about'
        }
      ]
    },
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
