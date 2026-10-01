import { useEffect, useMemo, useState } from 'react'
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import {
  MAX_POKEMON_ID,
  type BasePokemon,
  type PokemonDetail,
  ensureSpriteImage,
  fetchInitialPokedex,
  fetchNamesByType,
  fetchPokemonDetails,
  statTotalCache,
} from './cache'

const TYPE_OPTIONS = [
  'all',
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'steel',
  'fairy',
]

const GENERATION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'gen1', label: 'Generation I' },
  { value: 'gen2', label: 'Generation II' },
  { value: 'gen3', label: 'Generation III' },
  { value: 'gen4', label: 'Generation IV' },
  { value: 'gen5', label: 'Generation V' },
  { value: 'gen6', label: 'Generation VI' },
  { value: 'gen7', label: 'Generation VII' },
  { value: 'gen8', label: 'Generation VIII' },
  { value: 'gen9', label: 'Generation IX' },
]

function DirectoryView() {
  const [pokemonList, setPokemonList] = useState<BasePokemon[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedGeneration, setSelectedGeneration] = useState('all')
  const [sortBy, setSortBy] = useState<'id' | 'statTotal'>('id')
  const [sortDescending, setSortDescending] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list')
  const [typeAllowedNames, setTypeAllowedNames] = useState<string[] | null>(null)
  const [statTotals, setStatTotals] = useState<Map<number, number>>(new Map())
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const list = await fetchInitialPokedex()
      setPokemonList(list)
    }

    void load()
  }, [])

  useEffect(() => {
    if (selectedType === 'all') {
      setTypeAllowedNames(null)
      return
    }

    const load = async () => {
      const names = await fetchNamesByType(selectedType)
      setTypeAllowedNames(names)
    }

    void load()
  }, [selectedType])

  useEffect(() => {
    if (sortBy !== 'statTotal' || pokemonList.length === 0) {
      return
    }

    const idsToLoad = pokemonList
      .filter((pokemon) => !statTotalCache.has(pokemon.id) && !statTotals.has(pokemon.id))
      .map((pokemon) => pokemon.id)

    if (idsToLoad.length === 0) {
      return
    }

    const load = async () => {
      const values = await Promise.all(
        idsToLoad.map(async (id) => {
          const details = await fetchPokemonDetails(id)
          const total = details.stats.reduce((sum, stat) => sum + stat.base_stat, 0)
          return [id, total] as const
        }),
      )

      setStatTotals((current) => {
        const next = new Map(current)
        values.forEach(([id, total]) => next.set(id, total))
        return next
      })
    }

    void load()
  }, [pokemonList, sortBy, statTotals])

  const filteredPokemon = useMemo(() => {
    const nextList = pokemonList.filter((p) => {
      const matchesType = typeAllowedNames === null || typeAllowedNames.includes(p.name)
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      const matchesGeneration =
        selectedGeneration === 'all' ||
        (selectedGeneration === 'gen1' && p.id >= 1 && p.id <= 151) ||
        (selectedGeneration === 'gen2' && p.id >= 152 && p.id <= 251) ||
        (selectedGeneration === 'gen3' && p.id >= 252 && p.id <= 386) ||
        (selectedGeneration === 'gen4' && p.id >= 387 && p.id <= 493) ||
        (selectedGeneration === 'gen5' && p.id >= 494 && p.id <= 649) ||
        (selectedGeneration === 'gen6' && p.id >= 650 && p.id <= 721) ||
        (selectedGeneration === 'gen7' && p.id >= 722 && p.id <= 809) ||
        (selectedGeneration === 'gen8' && p.id >= 810 && p.id <= 905) ||
        (selectedGeneration === 'gen9' && p.id >= 906 && p.id <= 1025)

      return matchesType && matchesSearch && matchesGeneration
    })

    return [...nextList].sort((a, b) => {
      const valueA = sortBy === 'id' ? a.id : statTotals.get(a.id) ?? statTotalCache.get(a.id) ?? 0
      const valueB = sortBy === 'id' ? b.id : statTotals.get(b.id) ?? statTotalCache.get(b.id) ?? 0

      const primaryDifference = sortBy === 'id' ? a.id - b.id : valueA - valueB
      if (primaryDifference !== 0) {
        return sortDescending ? -primaryDifference : primaryDifference
      }

      const idDifference = a.id - b.id
      return sortDescending ? -idDifference : idDifference
    })
  }, [pokemonList, typeAllowedNames, searchQuery, selectedGeneration, sortBy, sortDescending, statTotals])

  return (
    <>
      <h1 className="app-title">Pokédex (1 - 1025)</h1>

      <div className="sprite-panel">
        <div className="floating-controls">
          <input
            type="text"
            className="search-input"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search Pokémon by name"
          />

          <select
            className="filter-select"
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            aria-label="Filter Pokémon by type"
          >
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedGeneration}
            onChange={(event) => setSelectedGeneration(event.target.value)}
            aria-label="Filter Pokémon by generation"
          >
            {GENERATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as 'id' | 'statTotal')}
            aria-label="Sort Pokémon by"
          >
            <option value="id">Dex Number</option>
            <option value="statTotal">Stat Total</option>
          </select>

          <button
            type="button"
            className="sort-toggle"
            aria-pressed={sortDescending}
            onClick={() => setSortDescending((value) => !value)}
          >
            {sortDescending ? 'Descending' : 'Ascending'}
          </button>

          <button
            type="button"
            className="view-toggle"
            aria-pressed={viewMode === 'gallery'}
            onClick={() => setViewMode((current) => (current === 'list' ? 'gallery' : 'list'))}
          >
            {viewMode === 'list' ? 'Gallery View' : 'List View'}
          </button>
        </div>

        <div className={viewMode === 'list' ? 'sprite-scroll-box sprite-list' : 'sprite-scroll-box sprite-gallery'}>
          {filteredPokemon.map((pokemon) => {
            const spriteImage = ensureSpriteImage(pokemon.id, pokemon.spriteUrl)

            return (
              <div
                key={pokemon.id}
                className={viewMode === 'list' ? 'sprite-item' : 'gallery-item'}
                onClick={() => navigate(`/pokemon/${pokemon.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    navigate(`/pokemon/${pokemon.id}`)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <img src={spriteImage.src} alt={pokemon.name} />
                {viewMode === 'gallery' && <span className="gallery-name">{pokemon.name}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function DetailView() {
  const { id } = useParams<{ id: string }>()
  const numericId = Number(id)
  const [pokemonDetails, setPokemonDetails] = useState<PokemonDetail | null>(null)

  useEffect(() => {
    if (!id || Number.isNaN(numericId)) {
      return
    }

    const load = async () => {
      const details = await fetchPokemonDetails(numericId)
      setPokemonDetails(details)
    }

    void load()
  }, [id, numericId])

  const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${numericId}.png`
  const cachedSprite = ensureSpriteImage(numericId, spriteUrl)
  const types = pokemonDetails?.types.map((entry) => entry.type.name).join(', ') ?? '—'
  const abilities = pokemonDetails?.abilities.map((entry) => entry.ability.name).join(', ') ?? '—'
  const stats = pokemonDetails?.stats ?? []
  const moveNames = pokemonDetails?.moves.map((entry) => entry.move.name).slice(0, 15) ?? []

  const prevId = Math.max(1, numericId - 1)
  const nextId = Math.min(MAX_POKEMON_ID, numericId + 1)

  return (
    <>
      <div className="nav-links">
        <Link to="/" className="nav-link-btn">
          ← Back to Directory
        </Link>
      </div>

      <div className="detail-box">
        <div className="detail-sprite-col">
          <img src={cachedSprite.src} alt={pokemonDetails?.name ?? 'Pokémon sprite'} />
        </div>

        <div className="detail-info-col">
          <h2>{pokemonDetails?.name ?? 'Loading...'}</h2>
          <table className="detail-table">
            <tbody>
              <tr>
                <th>ID</th>
                <td>#{pokemonDetails?.id ?? numericId}</td>
              </tr>
              <tr>
                <th>Name</th>
                <td>{pokemonDetails?.name ?? '—'}</td>
              </tr>
              <tr>
                <th>Height</th>
                <td>{pokemonDetails ? pokemonDetails.height : '—'}</td>
              </tr>
              <tr>
                <th>Weight</th>
                <td>{pokemonDetails ? pokemonDetails.weight : '—'}</td>
              </tr>
              <tr>
                <th>Base Experience</th>
                <td>{pokemonDetails ? pokemonDetails.base_experience : '—'}</td>
              </tr>
              <tr>
                <th>Types</th>
                <td>{types}</td>
              </tr>
              <tr>
                <th>Abilities</th>
                <td>{abilities}</td>
              </tr>
              <tr>
                <th>Base Stats</th>
                <td>
                  {stats.length > 0
                    ? stats
                        .map((stat) => `${stat.stat.name}: ${stat.base_stat}`)
                        .join(', ')
                    : '—'}
                </td>
              </tr>
              <tr>
                <th>Moves</th>
                <td>
                  {pokemonDetails
                    ? `${pokemonDetails.moves.length} total (${moveNames.join(', ') || '—'})`
                    : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="detail-nav-row">
        <Link to={`/pokemon/${prevId}`} className="nav-link-btn detail-nav-btn">
          ← Previous
        </Link>
        <Link to={`/pokemon/${nextId}`} className="nav-link-btn detail-nav-btn">
          Next →
        </Link>
      </div>
    </>
  )
}

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<DirectoryView />} />
        <Route path="/pokemon/:id" element={<DetailView />} />
      </Routes>
    </div>
  )
}

export default App
