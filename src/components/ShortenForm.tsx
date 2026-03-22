'use client';

import { useState, useCallback } from 'react';
import { postShorten } from '@/lib/api/shorten';
import { isValidHttpUrl } from '@/lib/validate-url';

interface ShortenFormProps {
  apiKey?: string;
}

type FormState = 'idle' | 'submitting' | 'success' | 'error-validation' | 'error-api';

export function ShortenForm({ apiKey: initialApiKey = '' }: ShortenFormProps) {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [formState, setFormState] = useState<FormState>('idle');
  const [shortUrl, setShortUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setFormState('submitting');
    setErrorMessage('');
    setShortUrl('');

    // Client-side validation (R-011)
    if (!url.trim()) {
      setFormState('error-validation');
      setErrorMessage('Please enter a URL');
      return;
    }

    if (!isValidHttpUrl(url.trim())) {
      setFormState('error-validation');
      setErrorMessage('Please enter a valid URL starting with http:// or https://');
      return;
    }

    if (!apiKey.trim()) {
      setFormState('error-validation');
      setErrorMessage('Please enter an API key');
      return;
    }

    try {
      const response = await postShorten(url.trim(), apiKey.trim());
      setShortUrl(response.url);
      setFormState('success');
    } catch (err) {
      setFormState('error-api');
      if (err instanceof Error) {
        if (err.message.includes('Unauthorized') || err.message.includes('Invalid')) {
          setErrorMessage('Invalid API key. Please check and try again.');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    }
  }, [url, apiKey]);

  const handleCopy = useCallback(async () => {
    if (!shortUrl) return;

    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: user can manually select
    }
  }, [shortUrl]);

  const handleNewSubmission = useCallback(() => {
    setFormState('idle');
    setShortUrl('');
    setErrorMessage('');
  }, []);

  return (
    <div className="w-full">
      <form 
        onSubmit={handleSubmit} 
        className="space-y-6"
        aria-label="Shorten a URL"
      >
        {/* URL Input */}
        <div className="space-y-2">
          <label 
            htmlFor="url" 
            className="block text-sm font-medium text-[#373230]"
          >
            URL to shorten
          </label>
          <input
            type="text"
            id="url"
            name="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (formState === 'error-validation') {
                setFormState('idle');
                setErrorMessage('');
              }
            }}
            placeholder="https://example.com"
            disabled={formState === 'submitting'}
            aria-invalid={formState === 'error-validation' && errorMessage.includes('URL')}
            aria-describedby={formState === 'error-validation' && errorMessage.includes('URL') ? 'url-error' : undefined}
            className={`
              w-full h-12 px-4 rounded-lg border bg-white text-[#373230]
              placeholder:text-[#7A756F]
              focus:outline-none focus:border-[#373230] focus:ring-[3px] focus:ring-[#FFE300]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150
              ${formState === 'error-validation' && errorMessage.includes('URL') 
                ? 'border-[#B91C1C]' 
                : 'border-[#E4E1DC]'
              }
            `}
          />
          {formState === 'error-validation' && errorMessage.includes('URL') && (
            <p id="url-error" className="text-sm text-[#B91C1C]" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label 
            htmlFor="apiKey" 
            className="block text-sm font-medium text-[#373230]"
          >
            API Key
          </label>
          <input
            type="password"
            id="apiKey"
            name="apiKey"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              if (formState === 'error-api' || (formState === 'error-validation' && errorMessage.includes('API'))) {
                setFormState('idle');
                setErrorMessage('');
              }
            }}
            placeholder="Enter your API key"
            disabled={formState === 'submitting'}
            aria-invalid={formState === 'error-api' || (formState === 'error-validation' && errorMessage.includes('API'))}
            aria-describedby={(formState === 'error-api' || (formState === 'error-validation' && errorMessage.includes('API'))) ? 'apikey-error' : undefined}
            className={`
              w-full h-12 px-4 rounded-lg border bg-white text-[#373230]
              placeholder:text-[#7A756F]
              focus:outline-none focus:border-[#373230] focus:ring-[3px] focus:ring-[#FFE300]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-150
              ${(formState === 'error-api' || (formState === 'error-validation' && errorMessage.includes('API')))
                ? 'border-[#B91C1C]' 
                : 'border-[#E4E1DC]'
              }
            `}
          />
          {(formState === 'error-api' || (formState === 'error-validation' && errorMessage.includes('API'))) && (
            <p id="apikey-error" className="text-sm text-[#B91C1C]" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={formState === 'submitting'}
          aria-busy={formState === 'submitting'}
          className={`
            w-full h-12 rounded-lg font-semibold text-[#373230]
            bg-[#FFE300] hover:bg-[#FFE033]
            focus:outline-none focus:ring-[3px] focus:ring-[#373230]
            disabled:opacity-70 disabled:cursor-not-allowed
            active:scale-[0.98]
            transition-all duration-150
            min-h-[48px] min-w-[48px]
          `}
        >
          {formState === 'submitting' ? 'Shortening...' : 'Shorten Link'}
        </button>
      </form>

      {/* Result Block */}
      {formState === 'success' && shortUrl && (
        <div 
          className="mt-8 p-6 rounded-lg border border-[#FFE300] bg-[#FFFDE7] animate-slide-in"
          role="region"
          aria-live="polite"
          aria-label="Shortened URL result"
        >
          <p className="text-sm font-medium text-[#373230] mb-2">
            Your shortened link:
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <code 
              className="flex-1 min-w-0 font-mono text-sm text-[#373230] break-all"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {shortUrl}
            </code>
            <button
              onClick={handleCopy}
              className={`
                flex-shrink-0 h-10 px-4 rounded-md font-medium text-sm
                ${copied 
                  ? 'bg-[#065F46] text-white' 
                  : 'bg-[#373230] text-white hover:bg-[#4a4543]'
                }
                focus:outline-none focus:ring-[3px] focus:ring-[#FFE300]
                transition-all duration-150
                min-h-[44px] min-w-[44px]
              `}
              aria-label={copied ? 'Copied to clipboard' : 'Copy shortened URL to clipboard'}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={handleNewSubmission}
            className="mt-4 text-sm text-[#7A756F] hover:text-[#373230] underline focus:outline-none focus:ring-[3px] focus:ring-[#FFE300] rounded px-1"
          >
            Shorten another link
          </button>
        </div>
      )}

      {/* Global Error (non-field specific) */}
      {formState === 'error-api' && !errorMessage.includes('API key') && (
        <div 
          className="mt-6 p-4 rounded-lg border border-[#B91C1C] bg-red-50"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-sm text-[#B91C1C]">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
