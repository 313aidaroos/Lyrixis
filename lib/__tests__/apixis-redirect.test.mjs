import assert from 'node:assert/strict';
import test from 'node:test';
import { safeLocalRedirect } from '../apixis-redirect.ts';

test('preserves ordinary local destinations', () => {
  for (const path of ['/', '/account', '/marketplace?q=copper#offers', '/jobs/abc']) {
    assert.equal(safeLocalRedirect(path), path);
  }
});
test('rejects external, ambiguous, malformed and encoded redirects', () => {
  for (const path of [null, undefined, 42, '', 'https://evil.example', '//evil.example',
    '/\\evil.example', '/%5cevil.example', '/%255cevil.example', '/%2f%2fevil.example',
    '/%252f%252fevil.example', '/%0aevil.example', '/%2509evil.example', '/bad%', '/ path']) {
    assert.equal(safeLocalRedirect(path), '/', String(path));
  }
});
test('uses the caller fallback on rejected input', () => {
  assert.equal(safeLocalRedirect('//evil.example', '/account'), '/account');
});
