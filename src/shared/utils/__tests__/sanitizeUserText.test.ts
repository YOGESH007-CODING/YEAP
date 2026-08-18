import { sanitizeUserText } from '../sanitizeUserText';

describe('sanitizeUserText', () => {
  it('stores user input as plain text without executable markup', () => {
    expect(sanitizeUserText('<img src=x onerror=alert(1)>Review the boundary case<script>alert(1)</script>'))
      .toBe('Review the boundary case');
  });
});
