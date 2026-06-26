import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApiKeysTab from '../src/components/settings/ApiKeysTab.jsx';
import AboutTab from '../src/components/settings/AboutTab.jsx';

global.chrome = {
  storage: {
    sync: {
      get: vi.fn((k, cb) => cb ? cb({ apiKeys: {} }) : Promise.resolve({ apiKeys: {} })),
      set: vi.fn((val, cb) => cb ? cb() : Promise.resolve())
    }
  },
  runtime: {
    sendMessage: vi.fn()
  }
};

describe('Settings Tab Components', () => {
  it('renders ApiKeysTab active selector', () => {
    const mockSettings = { translationProvider: 'langbly' };
    render(<ApiKeysTab settings={mockSettings} />);
    expect(screen.getByText('Active Translation Provider')).toBeDefined();
  });

  it('renders AboutTab logo credit details', () => {
    render(<AboutTab />);
    expect(screen.getByText('Mantra')).toBeDefined();
    expect(screen.getByText('Version 1.0.0')).toBeDefined();
  });
});
