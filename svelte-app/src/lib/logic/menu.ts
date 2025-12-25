import type { MenuBarSpec } from 'lush-types'

export const LUSH_MENU_BAR: MenuBarSpec = {
  menus: [
    {
      kind: 'submenu',
      id: 'lush',
      label: 'Lush',
      items: [
        {
          kind: 'action',
          id: 'login',
          label: 'Login',
          action: 'login'
        },
        {
          kind: 'action',
          id: 'yaml-sample',
          label: 'yaml_sample',
          action: 'open-yaml-sample'
        },
        {
          kind: 'action',
          id: 'docs',
          label: 'Docs',
          action: 'open-docs'
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
      id: 'file',
      label: 'File',
      items: [
        {
          kind: 'action',
          id: 'open-yaml-file',
          label: 'open yaml file...',
          action: 'open-yaml-file'
        },
        {
          kind: 'action',
          id: 'editor',
          label: 'editor',
          action: 'open-editor'
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
