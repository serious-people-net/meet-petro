// Display text in the house serif. Handles \n line breaks from the copy
// file and two sizes: lg for screen titles, sm for subtitles.

export function Title({
  children,
  size = 'lg',
}: {
  children: string
  size?: 'lg' | 'sm'
}) {
  const sizes = {
    lg: 'text-[64px] leading-[1.15]',
    sm: 'text-[44px] leading-[1.2]',
  }
  return (
    <h1 className={`font-display ${sizes[size]} text-ink`}>
      {children.split('\n').map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </h1>
  )
}
