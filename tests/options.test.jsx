import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Options from '../src/options.jsx';

describe('React Options UI Settings Component', () => {
  it('renders settings title and sidebar buttons', () => {
    render(<Options />);
    expect(screen.getByText('Mantra Settings')).toBeDefined();
    expect(screen.getAllByText('API Keys').length).toBeGreaterThan(0);
    expect(screen.getByText('Translation')).toBeDefined();
  });
});
