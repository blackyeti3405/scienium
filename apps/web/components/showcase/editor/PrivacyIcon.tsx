'use client'

import { Globe, Link2, Lock, Users } from 'lucide-react'
import type { PrivacyLevel } from '@/lib/showcase'

/** Tiny icon per privacy level — shared by the visibility picker and the
 *  publish footer. */
export const PRIVACY_ICON: Record<PrivacyLevel, React.ReactNode> = {
  private: <Lock size={13} />,
  link_only: <Link2 size={13} />,
  school_only: <Users size={13} />,
  public: <Globe size={13} />,
}
