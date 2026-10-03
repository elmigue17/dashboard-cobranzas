import React, { useState } from 'react';
import { Users, Search, GraduationCap, AlertTriangle, TrendingDown, CheckCircle, Calendar, Mail, Phone, Award, Snowflake, Play, Pencil, Check, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { hoy, sumarMeses, sumarDias, diasEntre, esFecha, fmtFecha } from '../fechas';
import { duracionDePrograma } from '../config';
import { estadoDeAlumno, ESTADOS_ALUMNO, ESTADOS_MANUALES, DIAS_POR_VENCER } from '../alumnos';


const STATUS_CONFIG = {
  'activo':     { color: 'var(--positive)', label: 'Activo' },
  'por vencer': { color: 'var(--warning)',  label: 'Por vencer' },
  'vencido':    { color: 'var(--negative)', label: 'Vencido' },
  'pausado':    { color: 'var(--warning)',  label: 'Pausado' },
  'churneado':  { color: 'var(--neutral)',  label: 'Churneado' },
};

const getStatusConfig = (status) => {
  if (!status) return { color: 'var(--neutral)', label: '-' };
  const key = status.toLowerCase();
  return STATUS_CONFIG[key] || { color: 'var(--neutral)', label: status };
};

const renderProg = (prog) => (prog ? String(prog) : '-');

const formatDate = fmtFecha;

const toDateInput = (ds) => (esFecha(ds) ? String(ds).slice(0, 10) : '');

// Fin del programa: inicio + duración + los días que estuvo congelado.
const calcFin = (fInicio, duracionMeses, diasCongelados = 0) => {
  if (!esFecha(fInicio) || !duracionMeses) return null;
  return sumarDias(sumarMeses(fInicio, Number(duracionMeses)), diasCongelados || 0);
};

// Si el alumno no tiene la duración guardada, la del programa (la misma que usa el alta).
const getDuracionFromProg = (programa) => duracionDePrograma(programa);

// ─── Dot de estado ────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
  const cfg = getStatusConfig(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: cfg.color }}>
      <span className="status-dot" />
      <span style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
        {cfg.label}
      </span>
    </div>
  );
};

// ─── Celda editable genérica ──────────────────────────────────────────────────
const EditableCell = ({ value, onSave, renderView, renderEdit }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => { onSave(draft); setEditing(false); };
  const handleCancel = () => { setDraft(value); setEditing(false); };

  if (!editing) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
        onDoubleClick={() => { setDraft(value); setEditing(true); }}
        title="Doble clic para editar"
      >
        {renderView(value)}
        <Pencil size={12} style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {renderEdit(draft, setDraft)}
      <button onClick={handleSave} className="link-btn" style={{ color: 'var(--positive)', padding: '2px' }}>
        <Check size={14} />
      </button>
      <button onClick={handleCancel} className="link-btn" style={{ color: 'var(--negative)', padding: '2px' }}>
        <X size={14} />
      </button>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const StudentDirectory = ({ alumnos = [], setAlumnos }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [progFilter, setProgFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [saving, setSaving] = useState({}); // { [id]: bool }

  // Estado de cada alumno calculado hoy (ver src/alumnos.js): no depende de que alguien lo actualice.
  const HOY = hoy();
  const estadoDe = (a) => estadoDeAlumno(a, HOY);

  // ── KPIs ──
  const activos   = alumnos.filter(a => ['Activo', 'Por vencer'].includes(estadoDe(a)));
  const churned   = alumnos.filter(a => estadoDe(a) === 'Churneado');
  const pausados  = alumnos.filter(a => estadoDe(a) === 'Pausado');
  const porVencer = alumnos.filter(a => estadoDe(a) === 'Por vencer');

  const uniqueStatuses = ['ALL', ...ESTADOS_ALUMNO];
  const uniqueProgs    = ['ALL', ...new Set(alumnos.map(a => renderProg(a.programa)).filter(p => p !== '-'))];

  const filteredAlumnos = alumnos.filter(a => {
    const matchSearch = !search ||
      a.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || estadoDeAlumno(a, HOY) === statusFilter;
    const matchProg   = progFilter === 'ALL' || renderProg(a.programa) === progFilter;
    return matchSearch && matchStatus && matchProg;
  });

  // ── Guardar campo en Supabase ──
  const saveField = async (alumnoId, field, rawValue) => {
    setSaving(s => ({ ...s, [alumnoId]: true }));

    let updates = { [field]: rawValue };

    // Si cambia fecha_inicio o duracion_meses → recalcular fecha_fin
    if (field === 'fecha_inicio' || field === 'duracion_meses') {
      const alumno = alumnos.find(a => a.id === alumnoId);
      const inicio = field === 'fecha_inicio' ? rawValue : alumno.fecha_inicio;
      const meses  = Number(field === 'duracion_meses' ? rawValue : (alumno.duracion_meses || getDuracionFromProg(alumno.programa)));
      const diasCongelados = alumno.dias_congelados || 0;
      const nuevaFin = calcFin(inicio, meses, diasCongelados);
      if (nuevaFin) updates.fecha_fin = nuevaFin;
    }

    // Update optimístico local
    setAlumnos(prev => prev.map(a => a.id === alumnoId ? { ...a, ...updates } : a));
    if (selectedStudent?.id === alumnoId) setSelectedStudent(s => ({ ...s, ...updates }));

    const { error } = await supabase.from('alumnos').update(updates).eq('id', alumnoId);
    if (error) console.error('Error guardando campo:', error);

    setSaving(s => ({ ...s, [alumnoId]: false }));
  };

  const guardarAlumno = async (alumno, updates) => {
    setAlumnos(prev => prev.map(a => a.id === alumno.id ? { ...a, ...updates } : a));
    setSelectedStudent(s => s?.id === alumno.id ? { ...s, ...updates } : s);
    const { error } = await supabase.from('alumnos').update(updates).eq('id', alumno.id);
    if (error) alert('No se pudo guardar: ' + error.message);
  };

  // ── Congelar ──
  const congelarAlumno = (alumno) => guardarAlumno(alumno, { estado: 'Pausado', congelado_desde: hoy() });

  // ── Descongelar: la fecha de fin se corre los días que estuvo congelado ──
  const descongelarAlumno = (alumno) => {
    const diasEstaVez = alumno.congelado_desde ? Math.max(0, diasEntre(alumno.congelado_desde, hoy())) : 0;
    return guardarAlumno(alumno, {
      estado: 'Activo',
      congelado_desde: null,
      dias_congelados: (alumno.dias_congelados || 0) + diasEstaVez,
      fecha_fin: alumno.fecha_fin ? sumarDias(alumno.fecha_fin, diasEstaVez) : null,
    });
  };

  // ── Cambio de estado a mano: Activo, Pausado (congela) o Churneado (baja) ──
  const cambiarEstado = (alumno, nuevo) => {
    const actual = estadoDeAlumno(alumno, hoy());
    if (nuevo === actual) return;
    if (nuevo === 'Pausado') return congelarAlumno(alumno);
    if (nuevo === 'Churneado') return guardarAlumno(alumno, { estado: 'Churneado', fecha_baja: alumno.fecha_baja || hoy() });
    // Volver a Activo: si estaba congelado se descongela; si estaba de baja, se borra la baja.
    if (alumno.congelado_desde) return descongelarAlumno(alumno);
    return guardarAlumno(alumno, { estado: 'Activo', fecha_baja: null });
  };

  const getDaysLeft = (fFin) => {
    if (!esFecha(fFin)) return null;
    return diasEntre(hoy(), fFin);
  };

  // ── UI ──
  return (
    <div className="stack">

      {/* === KPI Strip === */}
      <div className="grid-stats">
        {[
          { label: 'Activos',        value: activos.length,   Icon: CheckCircle,    tone: 'is-positive' },
          { label: 'Total historial', value: alumnos.length,  Icon: GraduationCap,  tone: 'is-accent' },
          { label: `Vencen en ${DIAS_POR_VENCER}d`, value: porVencer.length, Icon: AlertTriangle, tone: 'is-warning' },
          { label: 'Congelados',     value: pausados.length,  Icon: Snowflake,      tone: 'is-warning' },
          { label: 'Churneados',     value: churned.length,   Icon: TrendingDown,   tone: 'is-negative' },
        ].map(({ label, value, Icon, tone }) => (
          <div key={label} className="stat-card">
            <div className="stat-head">
              <span className="stat-label">{label}</span>
              <span className={`stat-icon ${tone}`}><Icon size={16} /></span>
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* === Layout Principal === */}
      <div className="split">

        {/* === Tabla === */}
        <div className="panel panel-flush">

          {/* Filtros */}
          <div className="toolbar" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="glass-input"
                placeholder="Buscar alumno o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="glass-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: 'auto', minWidth: '160px' }}>
              {uniqueStatuses.map(s => <option key={s} value={s}>{s === 'ALL' ? 'Todos los estados' : s}</option>)}
            </select>
            <select className="glass-input" value={progFilter} onChange={e => setProgFilter(e.target.value)} style={{ width: 'auto', minWidth: '160px' }}>
              {uniqueProgs.map(p => <option key={p} value={p}>{p === 'ALL' ? 'Todos los programas' : p}</option>)}
            </select>
          </div>

          {/* Tip de edición */}
          <div style={{ padding: '9px 20px', fontSize: '0.76rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
            Doble clic sobre Estado, Inicio o Duración para editar
          </div>

          {/* Tabla */}
          <div className="table-scroll">
            <table className="glass-table-container">
              <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                <tr>
                  <th>Alumno</th>
                  <th>Programa</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Duración</th>
                  <th>Vencimiento</th>
                  <th>Días rest.</th>
                  <th>Closer</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumnos.map(alumno => {
                  const daysLeft = getDaysLeft(alumno.fecha_fin);
                  const isWarning = daysLeft !== null && daysLeft <= 15 && daysLeft >= 0;
                  const isCongelado = !!alumno.congelado_desde;

                  return (
                    <tr
                      key={alumno.id}
                      onClick={() => setSelectedStudent(alumno)}
                      className={selectedStudent?.id === alumno.id ? 'is-selected' : undefined}
                      style={{
                        cursor: 'pointer',
                        opacity: saving[alumno.id] ? 0.6 : 1,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      {/* Alumno */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isCongelado && <Snowflake size={13} style={{ color: 'var(--warning)' }} />}
                          <div>
                            <div style={{ fontWeight: 600 }}>{alumno.nombre || '-'}</div>
                            <div style={{ fontSize: '0.79rem', color: 'var(--text-muted)', fontWeight: 400 }}>{alumno.email || ''}</div>
                          </div>
                        </div>
                      </td>

                      {/* Programa */}
                      <td data-label="Programa" className="cell-muted">{renderProg(alumno.programa)}</td>

                      {/* Estado (editable) */}
                      <td data-label="Estado" onClick={e => e.stopPropagation()}>
                        <EditableCell
                          value={estadoDe(alumno)}
                          onSave={v => cambiarEstado(alumno, v)}
                          renderView={v => <StatusDot status={v} />}
                          renderEdit={(draft, setDraft) => (
                            <select
                              value={draft}
                              onChange={e => setDraft(e.target.value)}
                              className="glass-input"
                              style={{ fontSize: '0.8rem', padding: '3px 6px', minWidth: '110px' }}
                              autoFocus
                            >
                              {[...new Set([draft, ...ESTADOS_MANUALES])].map(e => <option key={e} value={e} disabled={!ESTADOS_MANUALES.includes(e)}>{e}</option>)}
                            </select>
                          )}
                        />
                      </td>

                      {/* Inicio (editable) */}
                      <td data-label="Inicio" onClick={e => e.stopPropagation()} className="cell-muted">
                        <EditableCell
                          value={toDateInput(alumno.fecha_inicio)}
                          onSave={v => saveField(alumno.id, 'fecha_inicio', v)}
                          renderView={() => formatDate(alumno.fecha_inicio)}
                          renderEdit={(draft, setDraft) => (
                            <input
                              type="date"
                              value={draft}
                              onChange={e => setDraft(e.target.value)}
                              className="glass-input"
                              style={{ fontSize: '0.8rem', padding: '3px 6px' }}
                              autoFocus
                            />
                          )}
                        />
                      </td>

                      {/* Duración (editable) */}
                      <td data-label="Duración" onClick={e => e.stopPropagation()} className="cell-muted">
                        <EditableCell
                          value={alumno.duracion_meses ?? getDuracionFromProg(alumno.programa)}
                          onSave={v => saveField(alumno.id, 'duracion_meses', Number(v))}
                          renderView={v => <span>{v ? `${v} m` : '-'}</span>}
                          renderEdit={(draft, setDraft) => (
                            <input
                              type="number"
                              value={draft}
                              min={1} max={24}
                              onChange={e => setDraft(e.target.value)}
                              className="glass-input"
                              style={{ fontSize: '0.8rem', padding: '3px 6px', width: '60px' }}
                              autoFocus
                            />
                          )}
                        />
                      </td>

                      {/* Vencimiento (calculado, solo lectura) */}
                      <td data-label="Vencimiento" className="cell-muted">
                        {formatDate(alumno.fecha_fin)}
                      </td>

                      {/* Días restantes */}
                      <td data-label="Días rest.">
                        {daysLeft === null ? '-' : (
                          <span
                            className={isWarning ? 'is-warning-text' : daysLeft < 0 ? 'is-negative-text' : 'is-positive-text'}
                            style={{ fontWeight: 650, fontSize: '0.88rem' }}
                          >
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d venc.` : `${daysLeft}d`}
                          </span>
                        )}
                      </td>

                      {/* Closer */}
                      <td data-label="Closer" className="cell-muted">{alumno.closer || '-'}</td>
                    </tr>
                  );
                })}
                {filteredAlumnos.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                      No se encontraron alumnos con esos filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* === Panel Lateral === */}
        <div className={`panel split-side detail-panel${selectedStudent ? ' is-open' : ''}`}>
          {!selectedStudent ? (
            <div className="empty-state">
              <Award size={30} />
              <p>Selecciona un alumno para ver su expediente.</p>
            </div>
          ) : (() => {
            const daysLeft = getDaysLeft(selectedStudent.fecha_fin);
            const isCongelado = !!selectedStudent.congelado_desde;
            const diasCongeladosActuales = isCongelado
              ? Math.max(0, diasEntre(selectedStudent.congelado_desde, hoy()))
              : 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Header */}
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    {isCongelado && <Snowflake size={16} style={{ color: 'var(--warning)' }} />}
                    <h3 style={{ fontSize: '1.25rem', margin: 0 }}>{selectedStudent.nombre}</h3>
                  </div>
                  <StatusDot status={estadoDe(selectedStudent)} />
                </div>

                {/* Congelamiento activo */}
                {isCongelado && (
                  <div className="note is-warning">
                    <div className="note-title"><Snowflake size={14} /> Programa congelado</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Desde: {formatDate(selectedStudent.congelado_desde)}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Días congelados: {diasCongeladosActuales}
                    </div>
                    {selectedStudent.dias_congelados > 0 && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Acum. anteriores: {selectedStudent.dias_congelados}d
                      </div>
                    )}
                  </div>
                )}

                {/* Contacto */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedStudent.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.88rem', wordBreak: 'break-all' }}>
                      <Mail size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span>{selectedStudent.email}</span>
                    </div>
                  )}
                  {selectedStudent.telefono && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      <Phone size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span>{selectedStudent.telefono}</span>
                    </div>
                  )}
                </div>

                {/* Datos del programa */}
                <div className="kv-list">
                  <div className="kv-row">
                    <span>Programa</span>
                    <span>{renderProg(selectedStudent.programa)}</span>
                  </div>
                  <div className="kv-row">
                    <span>Duración</span>
                    <span>{selectedStudent.duracion_meses ?? getDuracionFromProg(selectedStudent.programa)} meses</span>
                  </div>
                  <div className="kv-row">
                    <span>Inicio</span>
                    <span>{formatDate(selectedStudent.fecha_inicio)}</span>
                  </div>
                  <div className="kv-row">
                    <span>Vencimiento</span>
                    <span className={daysLeft !== null && daysLeft < 0 ? 'is-negative-text' : undefined}>
                      {formatDate(selectedStudent.fecha_fin)}
                    </span>
                  </div>
                  {daysLeft !== null && (
                    <div className="kv-row">
                      <span>Días restantes</span>
                      <span className={daysLeft < 0 ? 'is-negative-text' : daysLeft <= 15 ? 'is-warning-text' : 'is-positive-text'} style={{ fontWeight: 650 }}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d vencido` : `${daysLeft}d`}
                      </span>
                    </div>
                  )}
                  {selectedStudent.dias_congelados > 0 && !isCongelado && (
                    <div className="kv-row">
                      <span>Días congelados hist.</span>
                      <span className="is-warning-text">{selectedStudent.dias_congelados}d</span>
                    </div>
                  )}
                </div>

                {/* Equipo */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '11px', textAlign: 'center' }}>
                    <div className="stat-label" style={{ marginBottom: '4px' }}>Setter</div>
                    <div style={{ fontWeight: 650, fontSize: '0.88rem' }}>{selectedStudent.setter || '-'}</div>
                  </div>
                  <div style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '11px', textAlign: 'center' }}>
                    <div className="stat-label" style={{ marginBottom: '4px' }}>Closer</div>
                    <div style={{ fontWeight: 650, fontSize: '0.88rem' }}>{selectedStudent.closer || '-'}</div>
                  </div>
                </div>

                {/* Botón Congelar / Descongelar */}
                {!isCongelado ? (
                  <button className="btn btn-block" onClick={() => congelarAlumno(selectedStudent)}>
                    <Snowflake size={15} /> Congelar programa
                  </button>
                ) : (
                  <button className="btn btn-block" onClick={() => descongelarAlumno(selectedStudent)}>
                    <Play size={15} /> Descongelar (+{diasCongeladosActuales}d al venc.)
                  </button>
                )}

                <button className="btn-subtle btn btn-block" onClick={() => setSelectedStudent(null)}>
                  Cerrar expediente
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default StudentDirectory;
