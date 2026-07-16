'use client'

import { WikiReader } from '@/components/discovery/WikiReader'
import { YouTubeViewer } from '@/components/discovery/YouTubeViewer'
import { SourceReader } from '@/components/discovery/SourceReader'
import { PapersSearch } from '@/components/discovery/PapersSearch'
import { ArticlesBrowse } from '@/components/discovery/ArticlesBrowse'
import { ArticleReader } from '@/components/discovery/ArticleReader'
import type { DiscoveryNode, DiscoverySource } from '@/stores/discoveryStore'
import type { SourceLanes, SourcePlatform } from '@/lib/discovery/sources'

/**
 * The explorer's left pane: Wikipedia reader, YouTube viewer, or Papers
 * (search list ⇄ source reader). Pure presentation — extracted verbatim from
 * `DiscoveryFeature`, which owns the view/source state and every handler.
 */
export function ExplorerReaderPane({
  discoverySource,
  papersView,
  articlesView,
  currentNode,
  currentIsSource,
  currentIsArticle,
  pendingSourceSearch,
  finalTopic,
  sourceLanes,
  lanesLoading,
  tldr,
  pendingLinks,
  onPickSource,
  onPickArticle,
  onChipToggle,
  onStarCurrent,
  onSaveReflection,
  onBackToResults,
  onBackToArticleResults,
  onAddVideoUrl,
}: {
  discoverySource: DiscoverySource
  papersView: 'search' | 'reader'
  articlesView: 'search' | 'reader'
  currentNode: DiscoveryNode | null
  currentIsSource: boolean
  currentIsArticle: boolean
  pendingSourceSearch: string | null
  finalTopic: string | null
  sourceLanes: SourceLanes | null
  lanesLoading: boolean
  /** Semantic Scholar TL;DR for the open source node, or null while loading /
   *  when none is available. */
  tldr: { text: string } | null
  pendingLinks: string[]
  onPickSource: (platform: SourcePlatform, externalId: string) => Promise<void>
  onPickArticle: (feed: string, externalId: string) => Promise<void>
  onChipToggle: (link: string) => void
  onStarCurrent: () => void
  onSaveReflection: (nodeId: string, text: string) => Promise<boolean>
  onBackToResults: () => void
  onBackToArticleResults: () => void
  onAddVideoUrl: (url: string) => Promise<string | null>
}) {
  return (
    <div className="flex-1 overflow-y-auto min-w-0 border-r border-white/10">
      {discoverySource === 'source' ? (
        <div className="h-full">
          {/* Search list stays mounted (hidden beneath the reader) so returning
              via "← Results" preserves the query + results the student browsed. */}
          <div className={papersView === 'reader' && currentIsSource ? 'hidden' : 'h-full'}>
            <PapersSearch
              // A one-tap interest seed (#2) prefills the Papers search box; it
              // takes priority over the topic default, then clears.
              defaultQuery={pendingSourceSearch ?? finalTopic ?? ''}
              onPick={onPickSource}
            />
          </div>
          {papersView === 'reader' && currentIsSource && (
            <SourceReader
              node={currentNode}
              lanes={sourceLanes}
              lanesLoading={lanesLoading}
              tldr={tldr}
              pendingLinks={pendingLinks}
              onChipToggle={onChipToggle}
              onStar={onStarCurrent}
              onSaveReflection={onSaveReflection}
              onBack={onBackToResults}
            />
          )}
        </div>
      ) : discoverySource === 'article' ? (
        <div className="h-full">
          {/* Browse list stays mounted (hidden beneath the reader) so returning
              via "← Results" preserves the feed/query the student browsed. */}
          <div className={articlesView === 'reader' && currentIsArticle ? 'hidden' : 'h-full'}>
            <ArticlesBrowse onPickArticle={onPickArticle} />
          </div>
          {articlesView === 'reader' && currentIsArticle && (
            <ArticleReader node={currentNode} onStar={onStarCurrent} onBack={onBackToArticleResults} />
          )}
        </div>
      ) : discoverySource === 'youtube' ? (
        <YouTubeViewer
          videoId={currentNode?.source === 'youtube' ? currentNode.videoId : undefined}
          title={currentNode?.source === 'youtube' ? currentNode.title : undefined}
          onAddUrl={onAddVideoUrl}
        />
      ) : (
        <WikiReader
          title={currentNode?.source === 'wikipedia' ? currentNode.title : ''}
          pendingLinks={pendingLinks}
          starred={currentNode?.starred ?? false}
          onLinkToggle={onChipToggle}
          onStar={onStarCurrent}
        />
      )}
    </div>
  )
}
