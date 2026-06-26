import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
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

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-url');

describe('React Popup UI Component', () => {
  it('renders heading and enable toggle button', async () => {
    await act(async () => {
      render(<Popup />);
    });
    expect(screen.getByText('Mantra')).toBeDefined();
    expect(screen.getByText('Enable on this page')).toBeDefined();
  });
});
