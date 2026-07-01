import { useEffect, useRef } from 'react'

interface AdBlockProps {
  blockId: string
  format?: 'horizontal' | 'vertical' | 'inline'
  className?: string
}

/**
 * Yandex RTB ad block component.
 * Place blockId from Yandex.Direct / РСЯ interface.
 */
export function AdBlock({ blockId, format = 'horizontal', className = '' }: AdBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || !blockId) return

    // Clear previous ad
    containerRef.current.innerHTML = ''

    // Create ad container
    const adDiv = document.createElement('div')
    adDiv.id = `yandex_ad_${blockId}`
    containerRef.current.appendChild(adDiv)

    // Load Yandex Ads script if not already loaded
    if (!document.querySelector('script[src*="an.yandex.ru"]')) {
      const script = document.createElement('script')
      script.src = '//an.yandex.ru/system/context.js'
      script.async = true
      document.head.appendChild(script)
    }

    // Render ad
    if (typeof window !== 'undefined' && (window as any).Ya && (window as any).Ya.Context) {
      try {
        (window as any).Ya.Context.AdvManager.render({
          blockId: blockId,
          type: 'yandex_rtb',
          test: false,
        })
      } catch (e) {
        // Ad not ready yet or blocked
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [blockId])

  const sizeClass = format === 'horizontal'
    ? 'min-h-[100px] max-w-[728px]'
    : format === 'vertical'
    ? 'min-h-[250px] max-w-[300px]'
    : 'min-h-[90px] max-w-[600px]'

  return (
    <div
      ref={containerRef}
      className={`ad-block ${sizeClass} mx-auto ${className}`}
      data-ad-slot={blockId}
    />
  )
}

/**
 * Placeholder for ad blocks - shows when no blockId is configured.
 * Replace with real AdBlock when you get the block ID from РСЯ.
 */
export function AdPlaceholder({ position = 'inline', className = '' }: { position?: string; className?: string }) {
  const sizeClass = position === 'sidebar'
    ? 'min-h-[250px] max-w-[300px]'
    : position === 'header'
    ? 'min-h-[90px] max-w-[728px]'
    : 'min-h-[100px] max-w-[600px]'

  return (
    <div className={`ad-block ad-placeholder ${sizeClass} mx-auto flex items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 ${className}`}>
      <span className="text-xs text-gray-400 dark:text-gray-500">Рекламный блок</span>
    </div>
  )
}
