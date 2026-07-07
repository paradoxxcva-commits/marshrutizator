import React from 'react'

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('[ErrorBoundary]', error, info) }
  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div style={{ padding: 16, color: '#ef4444', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          <strong>Render error:</strong> {this.state.error.message}
          <br /><button onClick={() => this.setState({ error: null })} style={{ marginTop: 8, padding: '4px 12px', cursor: 'pointer' }}>Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}
