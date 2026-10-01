import axios from 'axios'

export interface BasePokemon {
  id: number
  name: string
  spriteUrl: string
  statTotal?: number
}

export interface PokemonDetail {
  id: number
  name: string
  height: number
  weight: number
  base_experience: number
  sprites: {
    front_default: string | null
  }
  types: Array<{
    slot: number
    type: { name: string; url: string }
  }>
  abilities: Array<{
    is_hidden: boolean
    ability: { name: string; url: string }
  }>
  stats: Array<{
    base_stat: number
    stat: { name: string; url: string }
  }>
  moves: Array<{
    move: { name: string; url: string }
  }>
}

export const MAX_POKEMON_ID = 1025
export const MAX_SPRITE_CACHE_SIZE = 200

export const basePokemonCache = new Map<number, BasePokemon>()
export const spriteImageCache = new Map<number, HTMLImageElement>()
export const typeFilterCache = new Map<string, string[]>()
export const pokemonDetailCache = new Map<number, PokemonDetail>()
export const statTotalCache = new Map<number, number>()

export function extractIdFromUrl(url: string): number {
  const segments = url.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  const id = Number(lastSegment)

  return Number.isNaN(id) ? 0 : id
}

export function ensureSpriteImage(id: number, spriteUrl: string): HTMLImageElement {
  const cached = spriteImageCache.get(id)
  if (cached) {
    return cached
  }

  if (spriteImageCache.size >= MAX_SPRITE_CACHE_SIZE) {
    const oldestKey = spriteImageCache.keys().next().value
    if (oldestKey !== undefined) {
      spriteImageCache.delete(oldestKey)
    }
  }

  const image = new Image()
  image.src = spriteUrl
  spriteImageCache.set(id, image)

  return image
}

export async function fetchInitialPokedex(): Promise<BasePokemon[]> {
  if (basePokemonCache.size > 0) {
    return Array.from(basePokemonCache.values())
  }

  const response = await axios.get(`https://pokeapi.co/api/v2/pokemon?limit=${MAX_POKEMON_ID}`)
  const results = Array.isArray(response.data?.results) ? response.data.results : []

  for (const [index, item] of results.entries()) {
    const id = index + 1
    const name = item.name
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

    basePokemonCache.set(id, { id, name, spriteUrl })
  }

  return Array.from(basePokemonCache.values())
}

export async function fetchInitial251(): Promise<BasePokemon[]> {
  return fetchInitialPokedex()
}

export async function fetchInitial151(): Promise<BasePokemon[]> {
  return fetchInitialPokedex()
}

export async function fetchNamesByType(typeName: string): Promise<string[]> {
  if (typeFilterCache.has(typeName)) {
    return typeFilterCache.get(typeName)!
  }

  const response = await axios.get(`https://pokeapi.co/api/v2/type/${typeName}`)
  const names = (response.data?.pokemon ?? [])
    .filter((entry: { pokemon: { url: string } }) => extractIdFromUrl(entry.pokemon.url) <= MAX_POKEMON_ID)
    .map((entry: { pokemon: { name: string } }) => entry.pokemon.name)

  typeFilterCache.set(typeName, names)
  return names
}

export async function fetchPokemonDetails(id: number): Promise<PokemonDetail> {
  if (pokemonDetailCache.has(id)) {
    return pokemonDetailCache.get(id)!
  }

  const response = await axios.get<PokemonDetail>(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const detail = response.data

  pokemonDetailCache.set(id, detail)

  const total = detail.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
  statTotalCache.set(id, total)

  const existing = basePokemonCache.get(id)
  if (existing) {
    existing.statTotal = total
    basePokemonCache.set(id, existing)
  }

  return detail
}
