import React, { useCallback, useMemo, useState } from 'react';
import request from '../services/api';

const BASE = '/api/v1/pfe/group-work';

const initialSujetForm = {
  titre: '',
  description: '',
  enseignantId: '',
  promoId: '',
  anneeUniversitaire: '2025-2026',
  maxGrps: '1',
};

const initialGroupeForm = {
  nom: '',
  sujetFinalId: '',
  coEncadrantId: '',
};

const initialJuryForm = {
  groupId: '',
  enseignantId: '',
  role: 'membre',
};

const initialVoeuForm = {
  groupId: '',
  sujetId: '',
  ordre: '1',
};

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function PfeGroupWorkPage() {
  const [sujets, setSujets] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [juryItems, setJuryItems] = useState([]);
  const [voeuxItems, setVoeuxItems] = useState([]);

  const [sujetForm, setSujetForm] = useState(initialSujetForm);
  const [groupeForm, setGroupeForm] = useState(initialGroupeForm);
  const [juryForm, setJuryForm] = useState(initialJuryForm);
  const [voeuForm, setVoeuForm] = useState(initialVoeuForm);

  const [juryLookupGroupId, setJuryLookupGroupId] = useState('');
  const [voeuxLookupGroupId, setVoeuxLookupGroupId] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const summary = useMemo(() => ([
    { label: 'Sujets', value: sujets.length },
    { label: 'Groupes', value: groupes.length },
    { label: 'Jury membres', value: juryItems.length },
    { label: 'Voeux', value: voeuxItems.length },
  ]), [sujets.length, groupes.length, juryItems.length, voeuxItems.length]);

  const runAction = useCallback(async (action, successMessage) => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
    } catch (apiError) {
      setError(apiError?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSujets = useCallback(() => runAction(async () => {
    const response = await request(`${BASE}/sujets`, { method: 'GET' });
    setSujets(Array.isArray(response?.data) ? response.data : []);
  }, 'Sujets loaded.'), [runAction]);

  const fetchGroupes = useCallback(() => runAction(async () => {
    const response = await request(`${BASE}/groupes`, { method: 'GET' });
    setGroupes(Array.isArray(response?.data) ? response.data : []);
  }, 'Groupes loaded.'), [runAction]);

  const fetchJuryByGroup = useCallback((groupId) => runAction(async () => {
    const response = await request(`${BASE}/jury/groupes/${groupId}`, { method: 'GET' });
    setJuryItems(Array.isArray(response?.data) ? response.data : []);
  }, `Jury loaded for group ${groupId}.`), [runAction]);

  const fetchVoeuxByGroup = useCallback((groupId) => runAction(async () => {
    const response = await request(`${BASE}/voeux/groupes/${groupId}`, { method: 'GET' });
    setVoeuxItems(Array.isArray(response?.data) ? response.data : []);
  }, `Voeux loaded for group ${groupId}.`), [runAction]);

  const createSujet = () => runAction(async () => {
    const payload = {
      titre: sujetForm.titre,
      description: sujetForm.description,
      enseignantId: parseNumber(sujetForm.enseignantId),
      promoId: parseNumber(sujetForm.promoId),
      anneeUniversitaire: sujetForm.anneeUniversitaire,
      maxGrps: parseNumber(sujetForm.maxGrps) || 1,
    };
    await request(`${BASE}/sujets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setSujetForm(initialSujetForm);
    await fetchSujets();
  }, 'Sujet created.');

  const createGroupe = () => runAction(async () => {
    const payload = {
      nom: groupeForm.nom,
      sujetFinalId: parseNumber(groupeForm.sujetFinalId),
      coEncadrantId: parseNumber(groupeForm.coEncadrantId),
    };
    await request(`${BASE}/groupes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setGroupeForm(initialGroupeForm);
    await fetchGroupes();
  }, 'Groupe created.');

  const addJuryMember = () => runAction(async () => {
    const groupId = parseNumber(juryForm.groupId);
    const payload = {
      enseignantId: parseNumber(juryForm.enseignantId),
      role: juryForm.role,
    };
    await request(`${BASE}/jury/groupes/${groupId}/membres`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchJuryByGroup(groupId);
  }, 'Jury member added.');

  const addVoeu = () => runAction(async () => {
    const groupId = parseNumber(voeuForm.groupId);
    const payload = {
      sujetId: parseNumber(voeuForm.sujetId),
      ordre: parseNumber(voeuForm.ordre),
    };
    await request(`${BASE}/voeux/groupes/${groupId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await fetchVoeuxByGroup(groupId);
  }, 'Voeu added.');

  const updateVoeuStatus = (voeuId, status) => runAction(async () => {
    await request(`${BASE}/voeux/${voeuId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    if (voeuxLookupGroupId.trim()) {
      await fetchVoeuxByGroup(voeuxLookupGroupId.trim());
    }
  }, `Voeu ${status}.`);

  const deleteSujet = (id) => runAction(async () => {
    await request(`${BASE}/sujets/${id}`, { method: 'DELETE' });
    await fetchSujets();
  }, 'Sujet deleted.');

  const deleteGroupe = (id) => runAction(async () => {
    await request(`${BASE}/groupes/${id}`, { method: 'DELETE' });
    await fetchGroupes();
  }, 'Groupe deleted.');

  const deleteJuryMember = (id) => runAction(async () => {
    await request(`${BASE}/jury/${id}`, { method: 'DELETE' });
    if (juryLookupGroupId.trim()) {
      await fetchJuryByGroup(juryLookupGroupId.trim());
    }
  }, 'Jury member deleted.');

  const deleteVoeu = (id) => runAction(async () => {
    await request(`${BASE}/voeux/${id}`, { method: 'DELETE' });
    if (voeuxLookupGroupId.trim()) {
      await fetchVoeuxByGroup(voeuxLookupGroupId.trim());
    }
  }, 'Voeu deleted.');

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-lg border border-edge bg-surface p-6 shadow-card">
        <h1 className="text-xl font-bold tracking-tight text-ink">PFE Management</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Manage sujets, groupes, jury members, and voeux from the main platform.
        </p>
        <p className="mt-2 rounded-md bg-surface-200 px-3 py-2 text-xs text-ink-tertiary">
          API base: <span className="font-semibold text-ink">{BASE}</span>
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-lg border border-edge bg-surface p-4 shadow-card">
            <p className="text-xs text-ink-tertiary">{item.label}</p>
            <p className="mt-1 text-xl font-bold tracking-tight text-ink">{item.value}</p>
          </div>
        ))}
      </section>

      {(message || error) && (
        <section className="space-y-2">
          {message && <div className="rounded-md border border-edge bg-surface-200 px-3 py-2.5 text-sm text-ink">{message}</div>}
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-danger">{error}</div>}
        </section>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-edge bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Sujets</h2>
            <button type="button" onClick={fetchSujets} disabled={loading} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-hover active:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">Refresh</button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <input value={sujetForm.titre} onChange={(e) => setSujetForm((p) => ({ ...p, titre: e.target.value }))} placeholder="Titre" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <textarea value={sujetForm.description} onChange={(e) => setSujetForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30" />
            <div className="grid grid-cols-2 gap-3">
              <input value={sujetForm.enseignantId} onChange={(e) => setSujetForm((p) => ({ ...p, enseignantId: e.target.value }))} placeholder="Enseignant ID" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
              <input value={sujetForm.promoId} onChange={(e) => setSujetForm((p) => ({ ...p, promoId: e.target.value }))} placeholder="Promo ID" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={sujetForm.anneeUniversitaire} onChange={(e) => setSujetForm((p) => ({ ...p, anneeUniversitaire: e.target.value }))} placeholder="Année universitaire" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
              <input value={sujetForm.maxGrps} onChange={(e) => setSujetForm((p) => ({ ...p, maxGrps: e.target.value }))} placeholder="Max groupes" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
            </div>
            <button type="button" onClick={createSujet} disabled={loading} className="rounded-md border border-edge bg-surface px-4 py-2.5 text-sm font-medium text-ink-secondary transition-all duration-150 hover:bg-surface-200 disabled:cursor-not-allowed disabled:opacity-50">Create sujet</button>
          </div>
          <div className="mt-4 max-h-64 overflow-auto rounded-md border border-edge">
            {sujets.length === 0 ? (
              <p className="p-3 text-sm text-ink-tertiary">No sujets loaded.</p>
            ) : sujets.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-edge-subtle p-3 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-ink">#{item.id} · {item.titre}</p>
                  <p className="text-xs text-ink-tertiary">Enseignant {item.enseignantId} · Promo {item.promoId}</p>
                </div>
                <button type="button" onClick={() => deleteSujet(item.id)} className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-danger">Delete</button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-edge bg-surface p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Groupes</h2>
            <button type="button" onClick={fetchGroupes} disabled={loading} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-hover active:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">Refresh</button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <input value={groupeForm.nom} onChange={(e) => setGroupeForm((p) => ({ ...p, nom: e.target.value }))} placeholder="Nom du groupe" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
            <div className="grid grid-cols-2 gap-3">
              <input value={groupeForm.sujetFinalId} onChange={(e) => setGroupeForm((p) => ({ ...p, sujetFinalId: e.target.value }))} placeholder="Sujet final ID" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
              <input value={groupeForm.coEncadrantId} onChange={(e) => setGroupeForm((p) => ({ ...p, coEncadrantId: e.target.value }))} placeholder="Co-encadrant ID" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
            </div>
            <button type="button" onClick={createGroupe} disabled={loading} className="rounded-md border border-edge bg-surface px-4 py-2.5 text-sm font-medium text-ink-secondary transition-all duration-150 hover:bg-surface-200 disabled:cursor-not-allowed disabled:opacity-50">Create groupe</button>
          </div>
          <div className="mt-4 max-h-64 overflow-auto rounded-md border border-edge">
            {groupes.length === 0 ? (
              <p className="p-3 text-sm text-ink-tertiary">No groupes loaded.</p>
            ) : groupes.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-edge-subtle p-3 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-ink">#{item.id} · {item.nom || 'Sans nom'}</p>
                  <p className="text-xs text-ink-tertiary">Sujet final {item.sujetFinalId || '-'} · Co-encadrant {item.coEncadrantId || '-'}</p>
                </div>
                <button type="button" onClick={() => deleteGroupe(item.id)} className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-danger">Delete</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-edge bg-surface p-6 shadow-card">
          <h2 className="text-base font-semibold text-ink">Jury</h2>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input value={juryForm.groupId} onChange={(e) => setJuryForm((p) => ({ ...p, groupId: e.target.value }))} placeholder="Group ID" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
              <input value={juryForm.enseignantId} onChange={(e) => setJuryForm((p) => ({ ...p, enseignantId: e.target.value }))} placeholder="Enseignant ID" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
            </div>
            <input value={juryForm.role} onChange={(e) => setJuryForm((p) => ({ ...p, role: e.target.value }))} placeholder="Role (president, membre...)" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
            <button type="button" onClick={addJuryMember} disabled={loading} className="rounded-md border border-edge bg-surface px-4 py-2.5 text-sm font-medium text-ink-secondary transition-all duration-150 hover:bg-surface-200 disabled:cursor-not-allowed disabled:opacity-50">Add jury member</button>
          </div>

          <div className="mt-4 flex gap-2">
            <input value={juryLookupGroupId} onChange={(e) => setJuryLookupGroupId(e.target.value)} placeholder="Group ID to load jury" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
            <button type="button" onClick={() => fetchJuryByGroup(juryLookupGroupId.trim())} disabled={loading || !juryLookupGroupId.trim()} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-hover active:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">Load</button>
          </div>

          <div className="mt-4 max-h-64 overflow-auto rounded-md border border-edge">
            {juryItems.length === 0 ? (
              <p className="p-3 text-sm text-ink-tertiary">No jury data loaded.</p>
            ) : juryItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between border-b border-edge-subtle p-3 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-ink">#{item.id} · Enseignant {item.enseignantId}</p>
                  <p className="text-xs text-ink-tertiary">Role: {item.role}</p>
                </div>
                <button type="button" onClick={() => deleteJuryMember(item.id)} className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-danger">Delete</button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-edge bg-surface p-6 shadow-card">
          <h2 className="text-base font-semibold text-ink">Voeux</h2>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-3 gap-3">
              <input value={voeuForm.groupId} onChange={(e) => setVoeuForm((p) => ({ ...p, groupId: e.target.value }))} placeholder="Group ID" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
              <input value={voeuForm.sujetId} onChange={(e) => setVoeuForm((p) => ({ ...p, sujetId: e.target.value }))} placeholder="Sujet ID" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
              <input value={voeuForm.ordre} onChange={(e) => setVoeuForm((p) => ({ ...p, ordre: e.target.value }))} placeholder="Ordre" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
            </div>
            <button type="button" onClick={addVoeu} disabled={loading} className="rounded-md border border-edge bg-surface px-4 py-2.5 text-sm font-medium text-ink-secondary transition-all duration-150 hover:bg-surface-200 disabled:cursor-not-allowed disabled:opacity-50">Add voeu</button>
          </div>

          <div className="mt-4 flex gap-2">
            <input value={voeuxLookupGroupId} onChange={(e) => setVoeuxLookupGroupId(e.target.value)} placeholder="Group ID to load voeux" className="w-full rounded-md border border-control-border bg-control-bg px-3 py-2.5 text-sm text-ink" />
            <button type="button" onClick={() => fetchVoeuxByGroup(voeuxLookupGroupId.trim())} disabled={loading || !voeuxLookupGroupId.trim()} className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-hover active:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">Load</button>
          </div>

          <div className="mt-4 max-h-64 overflow-auto rounded-md border border-edge">
            {voeuxItems.length === 0 ? (
              <p className="p-3 text-sm text-ink-tertiary">No voeux data loaded.</p>
            ) : voeuxItems.map((item) => (
              <div key={item.id} className="border-b border-edge-subtle p-3 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">#{item.id} · Sujet {item.sujetId}</p>
                    <p className="text-xs text-ink-tertiary">Ordre {item.ordre} · Status {item.status}</p>
                  </div>
                  <button type="button" onClick={() => deleteVoeu(item.id)} className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-danger">Delete</button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => updateVoeuStatus(item.id, 'accepte')} className="rounded-md border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-200">Accept</button>
                  <button type="button" onClick={() => updateVoeuStatus(item.id, 'refuse')} className="rounded-md border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-200">Refuse</button>
                  <button type="button" onClick={() => updateVoeuStatus(item.id, 'en_attente')} className="rounded-md border border-edge bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-200">Pending</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
