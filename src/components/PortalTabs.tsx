'use client';

import { useState } from 'react';
import ClipSubmitForm from './ClipSubmitForm';
import StatusCheck from './StatusCheck';

export default function PortalTabs() {
  const [tab, setTab] = useState<'submit' | 'status'>('submit');
  const [prefill, setPrefill] = useState('');

  return (
    <>
      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'submit'}
          onClick={() => setTab('submit')}
          type="button"
        >
          ส่งคลิป
        </button>
        <button
          role="tab"
          aria-selected={tab === 'status'}
          onClick={() => setTab('status')}
          type="button"
        >
          เช็กสถานะ
        </button>
      </div>

      {tab === 'submit' ? (
        <ClipSubmitForm
          onGoStatus={(q) => {
            setPrefill(q);
            setTab('status');
          }}
        />
      ) : (
        <StatusCheck initialQuery={prefill} />
      )}
    </>
  );
}
