import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Popup from '../src/popup.jsx';

// Mock chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: vi.fn((key, cb) => cb ? cb({ settings: { enabledOnAllPages: true } }) : Promise.resolve({ settings: { enabledOnAllPages: true } })),
      set: vi.fn((data, cb) => cb ? cb() : Promise.resolve())
    }
  },
  runtime: {
    openOptionsPage: vi.fn()
  },
  tabs: {
    query: vi.fn((query, cb) => cb([{ id: 1 }])),
    sendMessage: vi.fn()
  }
};

describe('React Popup UI Component', () => {
  it('renders heading and enable toggle button', () => {
    render(<Popup />);
    expect(screen.getByText('Mantra')).toBeDefined();
    expect(screen.getByText('Enable on this page')).toBeDefined();
  });
});
