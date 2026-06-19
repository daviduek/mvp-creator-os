'use client';

import { useState } from 'react';
import { TABS, Tab } from './lib/types';
import GenerationForm from './components/GenerationForm';

export default function Home() {
  const [tab, setTab] = useState<Tab>('t2i');

  return (
    <div className="container">
      <div className="brand">
        <h1>Creator OS</h1>
        <span className="tag">SASHA</span>
      </div>
      <p className="subtitle">Generación de contenido AI con avatar consistente</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
            title={t.desc}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* key forces a fresh form (and state reset) when switching tabs */}
      <GenerationForm key={tab} mode={tab} />
    </div>
  );
}
