import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

describe('Frontend Sanity', () => {
    it('should pass a basic truthy check', () => {
        const { container } = render(<div>Hello</div>);
        expect(container).toBeInTheDocument();
    });
});
