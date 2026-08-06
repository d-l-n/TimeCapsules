import { Component, type ErrorInfo, type ReactNode } from 'react'
import ErrorBox from './ErrorBox'
import { useI18n } from '../lib/I18nContext'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return <ErrorBoundaryView error={this.state.error} onRetry={this.handleReload} />
    }
    return this.props.children
  }
}

function ErrorBoundaryView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useI18n()
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ErrorBox
          title={t.errors.somethingBroke}
          message={error.message || t.errors.unexpected}
          onRetry={onRetry}
          retryLabel={t.errors.reload}
        />
      </div>
    </div>
  )
}
