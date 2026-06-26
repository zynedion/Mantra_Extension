import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Options from '../src/options.jsx';

// Mock chrome API globally for this test
global.chrome = {
  storage: {
    sync: {
      get: vi.fn((key, cb) => {
        const mockRes = { settings: { translationProvider: 'langbly' } };
        return cb ? cb(mockRes) : Promise.resolve(mockRes);
      }),
      set: vi.fn((data, cb) => cb ? cb() : Promise.resolve())
    }
  },
  runtime: {
    sendMessage: vi.fn()
  }
};

describe('React Options UI Settings Component', () => {
  it('renders settings title and sidebar buttons', async () => {
    let container;
    await act(async () => {
      container = render(<Options />);
    });
    expect(screen.getByText('Mantra Settings')).toBeDefined();
    expect(screen.getAllByText('API Keys').length).toBeGreaterThan(0);
    expect(screen.getByText('Translation')).toBeDefined();
  });
});
