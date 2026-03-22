/**
 * Global 404 boundary for the Next.js App Router.
 * Next.js automatically returns HTTP 404 when this component is rendered
 * (either via notFound() or unmatched routes).
 *
 * Stage 2: minimal placeholder — full Citizen Cafe branding applied in Stage 3.
 */
export default function NotFoundPage() {
  return (
    <div>
      <h1>404 – Page Not Found</h1>
      <p>The link you are looking for does not exist.</p>
    </div>
  );
}
