const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'
const WIKIPEDIA_REST = 'https://en.wikipedia.org/api/rest_v1'

export async function searchWikipedia(query: string): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: '10',
    format: 'json',
    origin: '*',
  })
  const res = await fetch(`${WIKIPEDIA_API}?${params}`)
  const data = (await res.json()) as [string, string[]]
  return data[1] ?? []
}

export async function getWikipediaArticle(title: string): Promise<{
  title: string
  extract: string
  links: string[]
}> {
  const res = await fetch(
    `${WIKIPEDIA_REST}/page/summary/${encodeURIComponent(title)}`,
  )
  if (!res.ok) throw new Error(`Wikipedia article not found: ${title}`)
  const data = (await res.json()) as { title: string; extract: string }

  // Fetch internal links via action API
  const linkParams = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'links',
    pllimit: '50',
    format: 'json',
    origin: '*',
  })
  const linkRes = await fetch(`${WIKIPEDIA_API}?${linkParams}`)
  const linkData = (await linkRes.json()) as {
    query: { pages: Record<string, { links?: { title: string }[] }> }
  }
  const pages = Object.values(linkData.query.pages)
  const links = pages[0]?.links?.map((l) => l.title) ?? []

  return { title: data.title, extract: data.extract, links }
}
