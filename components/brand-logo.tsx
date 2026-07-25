import Image from 'next/image'

type BrandLogoProps = {
  className?: string
  priority?: boolean
}

export function BrandLogo({ className = '', priority = false }: BrandLogoProps) {
  return (
    <div className={`flex items-center rounded-lg bg-slate-950 px-3 py-2 ${className}`}>
      <Image
        src="/brand/medalleros-logo.png"
        alt="Medalleros OS"
        width={3755}
        height={554}
        priority={priority}
        sizes="(max-width: 768px) 180px, 210px"
        className="h-auto max-h-10 w-full object-contain object-left"
      />
    </div>
  )
}
