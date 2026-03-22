import Image from 'next/image';

interface BrandHeaderProps {
  variant?: 'full' | 'minimal';
}

export function BrandHeader({ variant = 'full' }: BrandHeaderProps) {
  const sizeClasses = variant === 'full' 
    ? 'w-[160px] md:w-[200px] lg:w-[280px]' 
    : 'w-[120px] md:w-[160px]';

  return (
    <header className="flex justify-center mb-8">
      <Image
        src="/logo.svg"
        alt="Citizen Cafe Tel Aviv"
        width={280}
        height={158}
        priority
        className={`${sizeClasses} h-auto`}
      />
    </header>
  );
}
