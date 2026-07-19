import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { getTmdbImage, getPosterUrl, tmdbLang, getSimilar, getRecommended, getTrending, getWatchProviders, getTmdbDetails, getTmdbCollection, searchMulti, getTmdbAllEpisodes, getTmdbSeason } from './tmdb'

const global = globalThis as any

function mockFetch(data: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response)
}

describe('getTmdbImage', () => {
  it('returns correct URL for w500 size', () => {
    expect(getTmdbImage('/abc.jpg', 'w500')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg')
  })

  it('returns correct URL for original size', () => {
    expect(getTmdbImage('/abc.jpg', 'original')).toBe('https://image.tmdb.org/t/p/original/abc.jpg')
  })

  it('returns null for null path', () => {
    expect(getTmdbImage(null, 'w500')).toBeNull()
  })

  it('returns null for empty string path', () => {
    expect(getTmdbImage('', 'w500')).toBeNull()
  })

  it('defaults to w500 size', () => {
    expect(getTmdbImage('/test.jpg')).toContain('/w500/')
  })
})

describe('getPosterUrl', () => {
  it('returns w500 image URL', () => {
    expect(getPosterUrl('/poster.jpg')).toBe('https://image.tmdb.org/t/p/w500/poster.jpg')
  })

  it('returns null for null input', () => {
    expect(getPosterUrl(null)).toBeNull()
  })
})

describe('tmdbLang', () => {
  it('returns es-ES for spanish', () => {
    expect(tmdbLang('es')).toBe('es-ES')
  })

  it('returns en-US for english', () => {
    expect(tmdbLang('en')).toBe('en-US')
  })

  it('returns en-US for unknown language', () => {
    expect(tmdbLang('fr')).toBe('en-US')
  })

  it('returns en-US for empty string', () => {
    expect(tmdbLang('')).toBe('en-US')
  })
})

describe('searchMulti', () => {
  beforeEach(() => {
    global.fetch = mockFetch({
      results: [
        { id: 1, name: 'Breaking Bad', media_type: 'tv', poster_path: null, backdrop_path: null, overview: null },
        { id: 2, title: 'Inception', media_type: 'movie', poster_path: null, backdrop_path: null, overview: null },
        { id: 3, name: 'Person', media_type: 'person', poster_path: null, backdrop_path: null, overview: null },
      ],
    })
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('returns empty results for empty query', async () => {
    const result = await searchMulti('')
    expect(result.results).toEqual([])
    expect(result.total_pages).toBe(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns empty results for whitespace-only query', async () => {
    const result = await searchMulti('   ')
    expect(result.results).toEqual([])
  })

  it('filters out person results', async () => {
    const result = await searchMulti('breaking')
    expect(result.results.every(r => r.media_type === 'tv' || r.media_type === 'movie')).toBe(true)
  })

  it('returns tv and movie results', async () => {
    const result = await searchMulti('breaking')
    expect(result.results).toHaveLength(2)
  })

  it('returns empty results on fetch failure', async () => {
    global.fetch = mockFetch({}, false, 500)
    const result = await searchMulti('fail')
    expect(result.results).toEqual([])
    expect(result.total_pages).toBe(0)
  })

  it('uses provided language parameter', async () => {
    await searchMulti('test', 'es-ES')
    expect((fetch as any).mock.calls[0][0]).toContain('language=es-ES')
  })

  it('uses provided page parameter', async () => {
    await searchMulti('test', 'en-US', 3)
    expect((fetch as any).mock.calls[0][0]).toContain('page=3')
  })

  it('returns total_pages from response', async () => {
    global.fetch = mockFetch({ results: [], total_pages: 5 })
    const result = await searchMulti('test')
    expect(result.total_pages).toBe(5)
  })
})

describe('getTrending', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns filtered tv and movie results', async () => {
    global.fetch = mockFetch({
      results: [
        { id: 1, media_type: 'tv', poster_path: null, backdrop_path: null, overview: null },
        { id: 2, media_type: 'movie', poster_path: null, backdrop_path: null, overview: null },
        { id: 3, media_type: 'person', poster_path: null, backdrop_path: null, overview: null },
      ],
    })
    const results = await getTrending()
    expect(results).toHaveLength(2)
    expect(results.every(r => r.media_type !== 'person')).toBe(true)
  })

  it('returns at most 10 results', async () => {
    global.fetch = mockFetch({
      results: Array.from({ length: 20 }, (_, i) => ({ id: i, media_type: 'tv', poster_path: null, backdrop_path: null, overview: null })),
    })
    const results = await getTrending()
    expect(results.length).toBeLessThanOrEqual(10)
  })

  it('returns empty array on fetch failure', async () => {
    global.fetch = mockFetch({}, false)
    expect(await getTrending()).toEqual([])
  })

  it('returns empty array when results is missing', async () => {
    global.fetch = mockFetch({})
    expect(await getTrending()).toEqual([])
  })
})

describe('getSimilar', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns results sliced to 8', async () => {
    global.fetch = mockFetch({
      results: Array.from({ length: 15 }, (_, i) => ({ id: i, media_type: 'tv', poster_path: null, backdrop_path: null, overview: null })),
    })
    const results = await getSimilar(1396, 'tv')
    expect(results.length).toBeLessThanOrEqual(8)
  })

  it('returns empty array on fetch failure', async () => {
    global.fetch = mockFetch({}, false)
    expect(await getSimilar(1396, 'tv')).toEqual([])
  })

  it('uses movie type in URL when mediaType is movie', async () => {
    global.fetch = mockFetch({ results: [] })
    await getSimilar(671, 'movie')
    expect((fetch as any).mock.calls[0][0]).toContain('/movie/671/similar')
  })

  it('uses tv type in URL when mediaType is tv', async () => {
    global.fetch = mockFetch({ results: [] })
    await getSimilar(1396, 'tv')
    expect((fetch as any).mock.calls[0][0]).toContain('/tv/1396/similar')
  })
})

describe('getRecommended', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns at most 8 results', async () => {
    global.fetch = mockFetch({
      results: Array.from({ length: 20 }, (_, i) => ({ id: i, poster_path: null, backdrop_path: null, overview: null })),
    })
    const results = await getRecommended(1396, 'tv')
    expect(results.length).toBeLessThanOrEqual(8)
  })

  it('returns empty array on fetch failure', async () => {
    global.fetch = mockFetch({}, false)
    expect(await getRecommended(1396, 'tv')).toEqual([])
  })

  it('uses movie type in URL', async () => {
    global.fetch = mockFetch({ results: [] })
    await getRecommended(671, 'movie')
    expect((fetch as any).mock.calls[0][0]).toContain('/movie/671/recommendations')
  })
})

describe('getTmdbSeason', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns episodes array', async () => {
    const episodes = [
      { id: 1, episode_number: 1, season_number: 1, name: 'Pilot', overview: null, still_path: null, air_date: '2008-01-20' },
    ]
    global.fetch = mockFetch({ episodes })
    const result = await getTmdbSeason(1396, 1)
    expect(result).toEqual(episodes)
  })

  it('returns empty array on fetch failure', async () => {
    global.fetch = mockFetch({}, false)
    expect(await getTmdbSeason(1396, 1)).toEqual([])
  })

  it('returns empty array when episodes key missing', async () => {
    global.fetch = mockFetch({})
    expect(await getTmdbSeason(1396, 1)).toEqual([])
  })

  it('passes language in URL', async () => {
    global.fetch = mockFetch({ episodes: [] })
    await getTmdbSeason(1396, 1, 'es-ES')
    expect((fetch as any).mock.calls[0][0]).toContain('language=es-ES')
  })
})

describe('getTmdbAllEpisodes', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('filters out season 0 (specials)', async () => {
    global.fetch = mockFetch({ episodes: [{ id: 1, episode_number: 1, season_number: 1, name: 'Ep1', overview: null, still_path: null, air_date: null }] })
    const seasons = [
      { season_number: 0, episode_count: 3, name: 'Specials' },
      { season_number: 1, episode_count: 10, name: 'Season 1' },
    ]
    const result = await getTmdbAllEpisodes(1396, seasons)
    const seasonNumbers = [...new Set(result.map(e => e.season_number))]
    expect(seasonNumbers).not.toContain(0)
  })

  it('filters out seasons with 0 episode count', async () => {
    global.fetch = mockFetch({ episodes: [] })
    const seasons = [{ season_number: 1, episode_count: 0, name: 'Empty' }]
    await getTmdbAllEpisodes(1396, seasons)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('concatenates episodes from multiple seasons', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ episodes: [{ id: 1, episode_number: 1, season_number: 1, name: 'S1E1', overview: null, still_path: null, air_date: null }] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ episodes: [{ id: 2, episode_number: 1, season_number: 2, name: 'S2E1', overview: null, still_path: null, air_date: null }] }) })

    const seasons = [
      { season_number: 1, episode_count: 7, name: 'Season 1' },
      { season_number: 2, episode_count: 8, name: 'Season 2' },
    ]
    const result = await getTmdbAllEpisodes(1396, seasons)
    expect(result).toHaveLength(2)
  })
})

describe('getTmdbDetails', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns details object on success', async () => {
    const details = { id: 1396, name: 'Breaking Bad', poster_path: null, backdrop_path: null, overview: 'A show', vote_average: 9.5, external_ids: { imdb_id: 'tt0903747', tvdb_id: null } }
    global.fetch = mockFetch(details)
    const result = await getTmdbDetails(1396, 'tv')
    expect(result).toEqual(details)
  })

  it('returns null on fetch failure', async () => {
    global.fetch = mockFetch({}, false)
    expect(await getTmdbDetails(-1, 'tv')).toBeNull()
  })

  it('uses movie type in URL', async () => {
    global.fetch = mockFetch({ id: 671, external_ids: {} })
    await getTmdbDetails(671, 'movie')
    expect((fetch as any).mock.calls[0][0]).toContain('/movie/671')
  })

  it('appends external_ids to response', async () => {
    global.fetch = mockFetch({ id: 1396, external_ids: {} })
    await getTmdbDetails(1396, 'tv')
    expect((fetch as any).mock.calls[0][0]).toContain('append_to_response=external_ids')
  })
})

describe('getTmdbCollection', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns collection parts', async () => {
    const parts = [{ id: 100, title: 'Harry Potter 1', poster_path: '/p.jpg', backdrop_path: null }]
    global.fetch = mockFetch({ parts })
    const result = await getTmdbCollection(10)
    expect(result).toEqual(parts)
  })

  it('returns empty array on fetch failure', async () => {
    global.fetch = mockFetch({}, false)
    expect(await getTmdbCollection(-1)).toEqual([])
  })

  it('returns empty array when parts key is missing', async () => {
    global.fetch = mockFetch({})
    expect(await getTmdbCollection(10)).toEqual([])
  })
})

describe('getWatchProviders', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('returns providers for requested country', async () => {
    global.fetch = mockFetch({
      results: {
        AR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }], link: 'https://link' },
      },
    })
    const result = await getWatchProviders(1396, 'tv', 'AR')
    expect(result?.providers[0].provider_name).toBe('Netflix')
    expect(result?.link).toBe('https://link')
  })

  it('falls back to US when country not available', async () => {
    global.fetch = mockFetch({
      results: {
        US: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }], link: null },
      },
    })
    const result = await getWatchProviders(1396, 'tv', 'ZZ')
    expect(result?.providers[0].provider_name).toBe('Netflix')
  })

  it('uses buy providers when no flatrate available', async () => {
    global.fetch = mockFetch({
      results: {
        AR: { buy: [{ provider_id: 2, provider_name: 'Apple TV', logo_path: '/a.png' }], link: null },
      },
    })
    const result = await getWatchProviders(1396, 'tv', 'AR')
    expect(result?.providers[0].provider_name).toBe('Apple TV')
  })

  it('returns null on fetch failure', async () => {
    global.fetch = mockFetch({}, false)
    expect(await getWatchProviders(-1, 'tv')).toBeNull()
  })

  it('returns null when results key is missing', async () => {
    global.fetch = mockFetch({})
    expect(await getWatchProviders(1396, 'tv')).toBeNull()
  })

  it('returns null when no providers in country data', async () => {
    global.fetch = mockFetch({ results: { AR: { link: 'https://link' } } })
    expect(await getWatchProviders(1396, 'tv', 'AR')).toBeNull()
  })

  it('returns null when results is empty object', async () => {
    global.fetch = mockFetch({ results: {} })
    expect(await getWatchProviders(1396, 'tv', 'AR')).toBeNull()
  })
})
