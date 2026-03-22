import Link from 'next/link';

export function NotFoundPage() {
  return (
    <div className="text-center space-y-6">
      <h2 className="text-3xl md:text-4xl font-bold text-[#373230]">
        Link Not Found
      </h2>
      <p className="text-lg text-[#7A756F]">
        The shortened link you are looking for does not exist or has expired.
      </p>
      <div className="pt-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center h-12 px-6 rounded-lg font-semibold text-[#373230] bg-[#FFE300] hover:bg-[#FFE033] focus:outline-none focus:ring-[3px] focus:ring-[#373230] active:scale-[0.98] transition-all duration-150 min-h-[48px] min-w-[48px]"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
