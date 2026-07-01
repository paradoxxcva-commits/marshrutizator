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
    containerRef.current.innerHTML = ''

    const adDiv = document.createElement('div')
    adDiv.id = `yandex_ad_${blockId}`
    containerRef.current.appendChild(adDiv)

    if (!document.querySelector('script[src*="an.yandex.ru"]')) {
      const script = document.createElement('script')
      script.src = '//an.yandex.ru/system/context.js'
      script.async = true
      document.head.appendChild(script)
    }

    if (typeof window !== 'undefined' && (window as any).Ya && (window as any).Ya.Context) {
      try {
        (window as any).Ya.Context.AdvManager.render({
          blockId: blockId,
          type: 'yandex_rtb',
          test: false,
        })
      } catch (e) { /* Ad not ready */ }
    }

    return () => { if (containerRef.current) containerRef.current.innerHTML = '' }
  }, [blockId])

  return <div ref={containerRef} className={className} data-ad-slot={blockId} />
}

/**
 * Placeholder for ad blocks with size preview and border.
 * Replace with real AdBlock when block ID from РСЯ is ready.
 */
export function AdPlaceholder({ position = 'inline', className = '' }: { position?: string; className?: string }) {
  const sizes: Record<string, { w: string; h: string; label: string }> = {
    sidebar:  { w: '100%', h: '250px', label: '300×250' },
    header:   { w: '728px', h: '90px',  label: '728×90' },
    inline:   { w: '600px', h: '100px', label: '600×100' },
    mobile:   { w: '320px', h: '50px',  label: '320×50' },
  }

  const size = sizes[position] || sizes.inline

  return (
    <div
      className={`relative flex items-center justify-center rounded-lg ${className}`}
      style={{
        width: '100%',
        maxWidth: size.w,
        minHeight: size.h,
        border: '2px dashed rgba(99,102,241,0.4)',
        background: 'rgba(99,102,241,0.04)',
      }}
    >
      {/* Size label */}
      <div
        className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-medium tracking-wide"
        style={{
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.25)',
          color: 'rgba(99,102,241,0.8)',
        }}
      >
        {size.label}
      </div>

      {/* Center content */}
      <div className="text-center px-4">
        <div className="text-xs font-medium" style={{ color: 'rgba(99,102,241,0.6)' }}>
          Рекламный баннер
        </div>
        <div className="text-[10px] mt-1" style={{ color: 'rgba(99,102,241,0.4)' }}>
          Заменить на AdBlock с blockId из РСЯ
        </div>
      </div>
    </div>
  )
}
