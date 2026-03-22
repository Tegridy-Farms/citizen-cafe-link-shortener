import { isValidHttpUrl } from '../src/lib/validate-url';

describe('isValidHttpUrl', () => {
  it('accepts http:// URLs', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true);
  });

  it('accepts https:// URLs', () => {
    expect(isValidHttpUrl('https://example.com/path?q=1')).toBe(true);
  });

  it('rejects bare domain (no protocol)', () => {
    expect(isValidHttpUrl('example.com')).toBe(false);
  });

  it('rejects relative paths', () => {
    expect(isValidHttpUrl('/path/to/page')).toBe(false);
  });

  it('rejects ftp:// URLs', () => {
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidHttpUrl('')).toBe(false);
  });

  it('rejects strings that only contain "not-a-url"', () => {
    expect(isValidHttpUrl('not-a-url')).toBe(false);
  });
});
