import { Component, type ErrorInfo, type ReactNode } from 'react'
import ErrorBox from './ErrorBox'

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
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <ErrorBox
              title="SOMETHING BROKE"
              message={this.state.error.message || 'An unexpected error occurred.'}
              onRetry={this.handleReload}
              retryLabel="RELOAD"
            />
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
