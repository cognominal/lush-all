/// <reference types="@sveltejs/kit" />

import type { AuthUser } from '$lib/types/auth'

declare global {
  namespace App {
    interface Locals {
      user: AuthUser | null
      sessionId: string | null
    }
  }
}

export {}

