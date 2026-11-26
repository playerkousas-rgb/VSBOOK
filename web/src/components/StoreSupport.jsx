import React from 'react';
import { useLang } from '../i18n.jsx';

export default function StoreSupport({ onPaper = false }) {
  const { isEn } = useLang();
  const helper = typeof window !== 'undefined' && window.ScoutStoreGate?.getAppStoreUrl;
  const href = typeof helper === 'function' ? helper('vsbook') : '';
  const label = isEn ? 'Like or save this app on the App Store (opens a new tab)' : '前往主站讚好或收藏此程式（開新分頁）';
  return (
    <a className={`store-support${onPaper ? ' store-support--paper' : ''}`}
      href={href || undefined} hidden={!href} target="_blank" rel="noopener"
      aria-label={label} title={label}>
      <span aria-hidden="true">♥</span> <span>{isEn ? 'Like / Save' : '讚好／收藏'}</span>
    </a>
  );
}
