import type { ComponentType } from 'react'
import { ClerkLoading, ClerkLoaded } from '@clerk/nextjs'
import { PixelSkeleton } from '@/components/ui/PixelSkeleton'

/** Shared loading skeleton + widget wrapper for the sign-in/sign-up pages. */
export function ClerkAuthShell({ Widget }: { Widget: ComponentType }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <ClerkLoading>
        <div className="w-[400px] max-w-[92vw] border border-white/10 bg-[#0a1628] rounded-lg p-6 space-y-4">
          <PixelSkeleton variant="line" h="h-4" w="w-32" className="mx-auto" />
          <PixelSkeleton variant="box" h="h-10" w="w-full" />
          <PixelSkeleton variant="box" h="h-10" w="w-full" />
          <PixelSkeleton variant="box" h="h-10" w="w-full" />
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <Widget />
      </ClerkLoaded>
    </div>
  )
}
