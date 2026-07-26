import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import EmotionPicker from './EmotionPicker'

vi.mock('../services/emotionService', () => ({
  setEmotion: vi.fn(),
}))

const { setEmotion } = await import('../services/emotionService')

describe('EmotionPicker', () => {
  const baseProps = {
    uid: 'user-1',
    episodeId: 123,
    currentEmotion: null,
    onSelect: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog with modal role', () => {
    render(<EmotionPicker {...baseProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('dialog has aria-modal true', () => {
    render(<EmotionPicker {...baseProps} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('renders heading text', () => {
    render(<EmotionPicker {...baseProps} />)
    expect(screen.getByText(/How did it make you feel\?/i)).toBeInTheDocument()
  })

  it('renders all 10 emotion buttons', () => {
    render(<EmotionPicker {...baseProps} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(10)
  })

  it('highlights current emotion with accent class', () => {
    render(<EmotionPicker {...baseProps} currentEmotion="happy" />)
    const happyBtn = screen.getByLabelText('Happy')
    expect(happyBtn.className).toContain('bg-yellow')
  })

  it('calls setEmotion and onSelect when an emotion is picked', async () => {
    vi.mocked(setEmotion).mockResolvedValue(undefined)
    render(<EmotionPicker {...baseProps} />)
    fireEvent.click(screen.getByLabelText('Happy'))
    expect(setEmotion).toHaveBeenCalledWith('user-1', 123, 'happy')
    await waitFor(() => {
      expect(baseProps.onSelect).toHaveBeenCalledWith('happy')
    })
    expect(baseProps.onClose).toHaveBeenCalledOnce()
  })

  it('toggles off current emotion when same emotion is clicked again', async () => {
    vi.mocked(setEmotion).mockResolvedValue(undefined)
    render(<EmotionPicker {...baseProps} currentEmotion="happy" />)
    fireEvent.click(screen.getByLabelText('Happy'))
    await waitFor(() => {
      expect(setEmotion).toHaveBeenCalledWith('user-1', 123, null)
      expect(baseProps.onSelect).toHaveBeenCalledWith(null)
    })
  })

  it('shows Remove emotion button when currentEmotion is set', () => {
    render(<EmotionPicker {...baseProps} currentEmotion="sad" />)
    expect(screen.getByText(/Remove emotion/i)).toBeInTheDocument()
  })

  it('does not show Remove emotion button when currentEmotion is null', () => {
    render(<EmotionPicker {...baseProps} currentEmotion={null} />)
    expect(screen.queryByText(/Remove emotion/i)).not.toBeInTheDocument()
  })

  it('calls setEmotion and onSelect when Remove emotion is clicked', async () => {
    vi.mocked(setEmotion).mockResolvedValue(undefined)
    render(<EmotionPicker {...baseProps} currentEmotion="happy" />)
    fireEvent.click(screen.getByText(/Remove emotion/i))
    await waitFor(() => {
      expect(setEmotion).toHaveBeenCalledWith('user-1', 123, null)
      expect(baseProps.onSelect).toHaveBeenCalledWith(null)
    })
  })

  it('calls onClose when clicking the backdrop', () => {
    render(<EmotionPicker {...baseProps} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(baseProps.onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when clicking inside the modal', () => {
    render(<EmotionPicker {...baseProps} />)
    const innerDiv = screen.getByRole('dialog').querySelector('[class*="border-[3px]"]')
    if (innerDiv) {
      fireEvent.click(innerDiv)
      expect(baseProps.onClose).not.toHaveBeenCalled()
    }
  })

  it('all emotions have aria-label attributes', () => {
    render(<EmotionPicker {...baseProps} />)
    const emotions = ['Happy', 'Sad', 'Scared', 'Angry', 'Mind Blown', 'Boring', 'Love', 'Fire', 'Party', 'Amazing']
    emotions.forEach(em => {
      expect(screen.getByLabelText(em)).toBeInTheDocument()
    })
  })
})
