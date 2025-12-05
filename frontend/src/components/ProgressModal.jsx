import React, { useEffect, useState } from 'react'

export default function ProgressModal({ open, title, message, estimatedSeconds, onClose }) {
  const [progress, setProgress] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(estimatedSeconds)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!open) {
      setProgress(0)
      setElapsed(0)
      setTimeRemaining(estimatedSeconds)
      return
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      const now = Date.now()
      const elapsedMs = now - startTime
      const elapsedSec = Math.floor(elapsedMs / 1000)
      setElapsed(elapsedSec)

      // Calculate progress (linear estimation)
      const progressPct = Math.min((elapsedSec / estimatedSeconds) * 100, 99)
      setProgress(progressPct)

      // Calculate time remaining
      const remaining = Math.max(estimatedSeconds - elapsedSec, 0)
      setTimeRemaining(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [open, estimatedSeconds])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={(e) => e.stopPropagation()}>
      <div className="modal-card" style={{ minWidth: '400px', maxWidth: '500px' }}>
        <div className="modal-header">
          <div className="text-xl font-semibold">{title || 'Processando...'}</div>
        </div>

        <div className="modal-body" style={{ flexDirection: 'column', gap: '1.5rem' }}>
          <p className="text-white/70">{progress >= 99 ? '✅ Coleta concluída! Feche o modal e atualize a página.' : message}</p>

          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/60">Progresso</span>
              <span className="text-cyan-400 font-semibold">{Math.floor(progress)}%</span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              >
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          {/* Time Info */}
          <div className="flex justify-between text-sm">
            <div className="flex flex-col items-start">
              <span className="text-white/40 text-xs">Tempo Decorrido</span>
              <span className="text-white font-mono text-lg">{formatTime(elapsed)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-white/40 text-xs">Tempo Restante</span>
              <span className="text-cyan-400 font-mono text-lg">{formatTime(timeRemaining)}</span>
            </div>
          </div>

          {/* Animated dots */}
          <div className="flex justify-center gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>

          {/* Close button when complete */}
          {progress >= 99 && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white font-semibold transition"
            >
              Fechar e Atualizar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
