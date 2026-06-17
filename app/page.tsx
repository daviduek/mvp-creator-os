'use client';

import { useState } from 'react';
import { TABS, Tab } from './lib/types';
import TabT2I from './components/TabT2I';
import TabI2V from './components/TabI2V';
import TabT2V from './components/TabT2V';
import TabMotion from './components/TabMotion';
import TabPose from './components/TabPose';
import ResultPanel from './components/ResultPanel';

export default function Home() {
  const [tab, setTab] = useState<Tab>('t2i');
  const [resultUrl, setResultUrl] = useState('');
  const [resultType, setResultType] = useState<'image' | 'video'>('image');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  const resultProps = {
    resultUrl, resultType, loading, statusMsg, error,
    setResultUrl, setResultType, setLoading, setStatusMsg, setError,
  };

  return (
    <div className="container">
      <div className="brand">
        <h1>Creator OS</h1>
        <span className="tag">MVP · SASHA</span>
      </div>
      <p className="subtitle">Generación de contenido AI con avatar consistente</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => { setTab(t.id); setError(''); setResultUrl(''); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="lora-badge">LoRA activo: sashavan</div>

      {tab === 't2i' && <TabT2I {...resultProps} />}
      {tab === 'i2v' && <TabI2V {...resultProps} />}
      {tab === 't2v' && <TabT2V {...resultProps} />}
      {tab === 'motion' && <TabMotion {...resultProps} />}
      {tab === 'pose' && <TabPose {...resultProps} />}

      <ResultPanel {...resultProps} />
    </div>
  );
}
