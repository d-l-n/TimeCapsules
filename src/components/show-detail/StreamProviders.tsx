import { getTmdbImage, getProviderDirectLink } from '../../services/tmdb'
import type { WatchProvidersResult } from '../../services/tmdb'
import type { useI18n } from '../../lib/I18nContext'
import BrutalDropdown from '../BrutalDropdown'

interface StreamProvidersProps {
  providers: WatchProvidersResult
  streamCountry: string
  onCountryChange: (country: string) => void
  showName: string
  t: ReturnType<typeof useI18n>['t']
}

export default function StreamProviders({ providers, streamCountry, onCountryChange, showName, t }: StreamProvidersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase text-text-secondary shrink-0">{t.showDetail.streamOn}</span>
      <BrutalDropdown
        value={streamCountry}
        options={[
          { value: 'AR', label: 'Argentina' },
          { value: 'US', label: 'United States' },
          { value: 'ES', label: 'Spain' },
          { value: 'MX', label: 'Mexico' },
          { value: 'CO', label: 'Colombia' },
          { value: 'CL', label: 'Chile' },
          { value: 'BR', label: 'Brazil' },
          { value: 'GB', label: 'United Kingdom' },
          { value: 'DE', label: 'Germany' },
          { value: 'FR', label: 'France' },
          { value: 'IT', label: 'Italy' },
          { value: 'JP', label: 'Japan' },
          { value: 'KR', label: 'South Korea' },
        ]}
        onChange={onCountryChange}
        ariaLabel={t.showDetail.streamCountry}
        buttonClassName="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1"
      />
      {providers.providers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {providers.providers.map(p => {
            const providerUrl = getProviderDirectLink(p.provider_id, showName, streamCountry.toLowerCase())
            return (
              <a
                key={p.provider_id}
                href={providerUrl || providers.link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-border px-1.5 py-1 text-[10px] sm:text-xs font-bold bg-surface flex items-center gap-1 sm:hover:bg-yellow transition-colors"
              >
                {p.logo_path && <img src={getTmdbImage(p.logo_path, 'w500')!} alt={p.provider_name} className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded" />}
                {p.provider_name}
              </a>
            )
          })}
        </div>
      ) : (
        <span className="text-xs font-bold text-text-secondary uppercase">{t.showDetail.noProviders}</span>
      )}
    </div>
  )
}
