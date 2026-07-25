import Image from 'next/image'

type BrandLogoProps = {
  className?: string
  priority?: boolean
  compact?: boolean
}

export function BrandLogo({ className = '', priority = false, compact = false }: BrandLogoProps) {
  return (
    <div className={`flex items-center bg-black ${compact ? 'size-10 justify-center rounded-lg p-1.5' : 'px-1 py-2'} ${className}`}>
      <Image
        src={compact ? '/brand/medalleros-isotipo.png' : '/brand/medalleros-logo.png'}
        alt="Medalleros OS"
        width={compact ? 1819 : 3755}
        height={compact ? 1819 : 554}
        priority={priority}
        sizes={compact ? '40px' : '(max-width: 768px) 160px, 190px'}
        className={compact ? 'size-full object-contain' : 'h-auto max-h-9 w-full object-contain object-left'}
      />
    </div>
  )
}
