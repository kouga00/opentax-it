'use client';

import { useEffect, useState } from 'react';
import { getExchangeRate } from '@/lib/actions';
import { formatDate } from '@/lib/format';

/**
 * Prefills an ECB rate field ("1 EUR = X units") with the Banca d'Italia reference rate of `date`
 * whenever currency or date change, unless the user typed a value by hand (a value already saved in a
 * draft counts as typed; clearing the field turns the prefill back on). Returns the text that says
 * where the rate comes from.
 */
export function useExchangeRate(currency: string, date: string, value: string, setValue: (v: string) => void) {
  const [manual, setManual] = useState(value !== '');
  const [info, setInfo] = useState<string | undefined>(value !== '' ? 'Cambio salvato nella bozza' : undefined);
  useEffect(() => {
    if (currency === 'EUR' || !date || manual) return;
    let cancelled = false;
    getExchangeRate(currency, date).then((r) => {
      if (cancelled) return;
      if ('error' in r) {
        setInfo(r.error);
        return;
      }
      setValue(String(r.unitsPerEur));
      setInfo(`${r.source} del ${formatDate(r.quotationDate)}${r.quotationDate !== date ? ' (ultimo giorno quotato prima della data)' : ''}`);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setValue is a state setter
  }, [currency, date, manual]);
  const onManualChange = (v: string) => {
    setManual(v !== '');
    setValue(v);
    setInfo(v !== '' ? 'Cambio inserito a mano' : undefined);
  };
  return { info, onManualChange };
}
