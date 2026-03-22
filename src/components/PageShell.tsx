import { ReactNode } from 'react';

interface PageShellProps {
  children: ReactNode;
  variant?: 'centered' | 'error';
}

export function PageShell({ children, variant = 'centered' }: PageShellProps) {
  if (variant === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {children}
      </div>
    </div>
  );
}
