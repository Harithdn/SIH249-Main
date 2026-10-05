import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get } from '../services/api';
import { useSystem } from '../components/SystemContext';
import DigitalTwin from '../components/DigitalTwin';
import { ErrorState, LoadingState } from '../components/ui';

/** Dedicated digital-twin workspace; the schematic remains the existing interactive component. */
export default function DigitalTwinPage() {
  const { id } = useParams();
  const sys = useSystem();
  const [detail, setDetail] = useState<any>();
  const [preds, setPreds] = useState<any[]>([]);
  const [error, setError] = useState<string>();
  useEffect(() => { let alive = true; Promise.all([get(`/api/aircraft/${id}`), get(`/api/aircraft/${id}/predictions`).catch(() => [])]).then(([d,p]) => { if (alive) { setDetail(d); setPreds(p); } }).catch(e => alive && setError(String(e?.message || e))); return () => { alive = false; }; }, [id, sys.refreshKey]);
  if (error) return <ErrorState title="DIGITAL TWIN UNAVAILABLE" message={`Unable to retrieve ${id}.`} detail={error} />;
  if (!detail) return <LoadingState label={`FETCHING DIGITAL TWIN ${id || ''}`} />;
  return <div>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div><Link to={`/app/aircraft/${id}`} className="link font-mono text-[10px] uppercase tracking-[0.1em]">← AIRCRAFT WORKSPACE</Link><h1 className="mt-2 text-2xl font-medium tracking-wide text-txt">Digital Twin</h1><p className="mt-1 text-sm text-txt-dim">Interactive subsystem model for {detail.aircraft_id} · {detail.platform}</p></div>
      <div className="tag tag-ok">LIVE MODEL</div>
    </div>
    <DigitalTwin aid={detail.aircraft_id} detail={detail} preds={preds} />
  </div>;
}
