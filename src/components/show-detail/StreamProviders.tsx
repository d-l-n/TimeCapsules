import { getTmdbImage, getProviderDirectLink } from '../../services/tmdb'
import type { WatchProvidersResult } from '../../services/tmdb'

interface StreamProvidersProps {
  providers: WatchProvidersResult
  streamCountry: string
  onCountryChange: (country: string) => void
  showName: string
  t: any
}

export default function StreamProviders({ providers, streamCountry, onCountryChange, showName, t }: StreamProvidersProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold uppercase text-text-secondary">{t.showDetail.streamOn}</span>
        <select
          value={streamCountry}
          onChange={e => onCountryChange(e.target.value)}
          className="border-2 border-border bg-surface text-xs font-bold px-1.5 py-0.5 uppercase cursor-pointer hover:bg-yellow transition-colors"
          aria-label={t.showDetail.streamCountry}
        >
          <option value="AR">Argentina</option>
          <option value="US">United States</option>
          <option value="ES">Spain</option>
          <option value="MX">Mexico</option>
          <option value="CO">Colombia</option>
          <option value="CL">Chile</option>
          <option value="BR">Brazil</option>
          <option value="GB">United Kingdom</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="IT">Italy</option>
          <option value="JP">Japan</option>
          <option value="KR">South Korea</option>
        </select>
      </div>
      {providers.providers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {providers.providers.map(p => {
            const providerUrl = getProviderDirectLink(p.provider_id, showName, streamCountry.toLowerCase())
            return (
              <a
                key={p.provider_id}
                href={providerUrl || providers.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-border px-2 py-1 text-xs font-bold bg-surface flex items-center gap-1.5 hover:bg-yellow transition-colors"
              >
                {p.logo_path && <img src={getTmdbImage(p.logo_path, 'w500')!} alt="" className="w-4 h-4 rounded" />}
                {p.provider_name}
              </a>
            )
          })}
        </div>
      ) : (
        <div className="text-xs font-bold text-text-secondary uppercase">{t.showDetail.noProviders}</div>
      )}
    </div>
  )
}
