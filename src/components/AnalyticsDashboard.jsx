import React, { useMemo, useState } from 'react';
import {
  Users,
  PhoneCall,
  TrendingUp,
  AlertCircle,
  Percent,
  Clock,
  CalendarIcon,
  Briefcase,
  CheckCircle,
  Crosshair,
} from 'lucide-react';
import { normalizeLeadStatus } from '../leadStatus';
import { APP_TIME_ZONE, makeRangeMatcher } from '../timezone';

const ACTIVE_CONVERSATION_STATES = new Set(['en_conversacion', 'interesado', 'agendado', 'cerrado']);
const CLOSED_CONVERSATION_STATES = new Set(['agendado', 'cerrado']);
const CLOSED_CALL_RESULTS = ['Cierre', 'Seguimiento', 'No califica financiero', 'No es el momento', 'Perdido'];

// Tarjeta de métrica simple
const StatCard = ({ label, value, hint, Icon, tone = '' }) => (
  <div className="stat-card">
    <div className="stat-head">
      <span className="stat-label">{label}</span>
      {Icon && <span className={`stat-icon ${tone}`}><Icon size={16} /></span>}
    </div>
    <div className={`stat-value${tone ? ` ${tone}-text` : ''}`}>{value}</div>
    {hint && <div className="stat-hint">{hint}</div>}
  </div>
);

// Tarjeta de porcentaje con barra de progreso
const RateCard = ({ label, value, suffix = '%', hint, Icon, tone = '', fill }) => (
  <div className="stat-card">
    <div className="stat-head">
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.87rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
        {Icon && <Icon size={15} style={{ color: 'var(--text-muted)' }} />}
        {label}
      </span>
      <span className={`stat-value${tone ? ` ${tone}-text` : ''}`} style={{ fontSize: '1.5rem' }}>{value}{suffix}</span>
    </div>
    <div className="meter">
      <div className={`meter-fill${tone ? ` ${tone}` : ''}`} style={{ width: `${Math.min(Math.max(fill, 0), 100)}%` }} />
    </div>
    {hint && <div className="stat-hint">{hint}</div>}
  </div>
);

const AnalyticsDashboard = ({ leads = [], llamadas = [] }) => {
  const [dateRange, setDateRange] = useState('TODAY');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const getRangeLabel = () => {
    if (dateRange === 'TODAY') return 'hoy';
    if (dateRange === 'YESTERDAY') return 'ayer';
    if (dateRange === 'THIS_MONTH') return 'este mes';
    if (dateRange === 'LAST_MONTH') return 'mes pasado';
    if (dateRange === 'CUSTOM') return `${customStartDate || '?'} a ${customEndDate || '?'}`;
    return 'histórico';
  };

  // Toda la derivación recorre todas las filas de `leads`. Va en un único useMemo para que
  // no se recalcule en renders que no cambian los datos ni el período (abrir el menú, etc.).
  const metrics = useMemo(() => {
    // Los límites del rango se calculan UNA vez, no una vez por fila.
    const inRange = makeRangeMatcher(dateRange, customStartDate, customEndDate, APP_TIME_ZONE);

    const staleLimit = new Date();
    staleLimit.setHours(staleLimit.getHours() - 48);
    const staleLimitMs = staleLimit.getTime();

    const setterSource = leads.map((lead) => ({ ...lead, estado: normalizeLeadStatus(lead.estado) }));

    const leadsGenerados = setterSource.filter((lead) => inRange(lead.created_at));
    const conversacionesAbiertas = setterSource.filter((lead) => inRange(lead.ultima_interaccion));
    const conversacionesActivas = conversacionesAbiertas.filter((lead) =>
      ACTIVE_CONVERSATION_STATES.has(normalizeLeadStatus(lead.estado)),
    );
    const conversacionesCerradas = conversacionesAbiertas.filter((lead) =>
      CLOSED_CONVERSATION_STATES.has(normalizeLeadStatus(lead.estado)),
    );
    const conversacionesActivasNoCerradas = conversacionesActivas.filter(
      (lead) => !CLOSED_CONVERSATION_STATES.has(normalizeLeadStatus(lead.estado)),
    );

    const dineroSobreLaMesa = leads.filter(
      (lead) => normalizeLeadStatus(lead.estado) === 'interesado',
    );
    const seguimientosMuertos = leads.filter((lead) => {
      if (normalizeLeadStatus(lead.estado) !== 'en_conversacion') return false;
      if (!lead.ultima_interaccion) return false;
      return new Date(lead.ultima_interaccion).getTime() < staleLimitMs;
    });

    const callsInRange = llamadas.filter((call) => inRange(call.fecha_llamada));
    const presentadas = callsInRange.filter(
      (call) =>
        call.estado === 'Presentada' ||
        CLOSED_CALL_RESULTS.includes(call.resultado),
    );
    const cualificadas = callsInRange.filter((call) => call.calificada === true);
    const cierres = callsInRange.filter((call) => call.resultado === 'Cierre');
    const enSeguimientoPost = callsInRange.filter(
      (call) => call.resultado === 'Seguimiento',
    );

    const pct = (num, den) => (den > 0 ? ((num / den) * 100).toFixed(1) : 0);

    return {
      leadsGenerados,
      conversacionesAbiertas,
      conversacionesActivas,
      conversacionesCerradas,
      conversacionesActivasNoCerradas,
      contactRate: pct(conversacionesActivas.length, conversacionesAbiertas.length),
      bookingRate: pct(conversacionesCerradas.length, conversacionesAbiertas.length),
      dineroSobreLaMesa,
      seguimientosMuertos,
      callsInRange,
      presentadas,
      cualificadas,
      cierres,
      enSeguimientoPost,
      showRate: pct(presentadas.length, callsInRange.length),
      qualRate: pct(cualificadas.length, presentadas.length),
      closeRate: pct(cierres.length, presentadas.length),
    };
  }, [leads, llamadas, dateRange, customStartDate, customEndDate]);

  const {
    leadsGenerados,
    conversacionesAbiertas,
    conversacionesActivas,
    conversacionesCerradas,
    conversacionesActivasNoCerradas,
    contactRate,
    bookingRate,
    dineroSobreLaMesa,
    seguimientosMuertos,
    callsInRange,
    presentadas,
    cualificadas,
    cierres,
    enSeguimientoPost,
    showRate,
    qualRate,
    closeRate,
  } = metrics;

  return (
    <div className="stack">
      <div className="panel toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>
          <CalendarIcon size={16} style={{ color: 'var(--text-muted)' }} />
          Período
        </div>
        <select
          className="glass-input"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          style={{ width: 'auto', minWidth: '190px' }}
        >
          <option value="TODAY">Hoy</option>
          <option value="YESTERDAY">Ayer</option>
          <option value="THIS_MONTH">Este mes</option>
          <option value="LAST_MONTH">Mes pasado</option>
          <option value="CUSTOM">Rango personalizado</option>
          <option value="ALL">Todo el histórico</option>
        </select>
        {dateRange === 'CUSTOM' && (
          <>
            <input
              type="date"
              className="glass-input"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              style={{ width: 'auto' }}
            />
            <span style={{ color: 'var(--text-muted)' }}>a</span>
            <input
              type="date"
              className="glass-input"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              style={{ width: 'auto' }}
            />
          </>
        )}
      </div>

      <div>
        <div className="section-title">
          <span className="section-rule" />
          Setter · {getRangeLabel()}
        </div>
        <div style={{ marginBottom: '14px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Zona horaria: {APP_TIME_ZONE}
        </div>

        <div className="grid-stats" style={{ marginBottom: '14px' }}>
          <StatCard
            label="Leads nuevos"
            value={leadsGenerados.length}
            hint="Por fecha de entrada"
            Icon={Users}
            tone="is-accent"
          />
          <StatCard
            label="Conversaciones abiertas"
            value={conversacionesAbiertas.length}
            hint="Con alguna interacción en el período"
            Icon={TrendingUp}
          />
          <StatCard
            label="Conversaciones activas"
            value={conversacionesActivas.length}
            hint="Ni frías ni perdidas"
            Icon={PhoneCall}
            tone="is-positive"
          />
        </div>

        <div className="grid-stats">
          <RateCard
            label="Actividad útil"
            value={contactRate}
            Icon={Percent}
            fill={Number(contactRate)}
            hint={`${conversacionesActivas.length} activas de ${conversacionesAbiertas.length} abiertas`}
          />
          <RateCard
            label="Cierre del día"
            value={bookingRate}
            Icon={Percent}
            tone="is-positive"
            fill={Number(bookingRate)}
            hint={`${conversacionesCerradas.length} agendadas o cerradas de ${conversacionesAbiertas.length} abiertas`}
          />
          <RateCard
            label="Activas no cerradas"
            value={conversacionesActivasNoCerradas.length}
            suffix=""
            Icon={Percent}
            tone="is-warning"
            fill={conversacionesAbiertas.length > 0 ? (conversacionesActivasNoCerradas.length / conversacionesAbiertas.length) * 100 : 0}
            hint="Siguen vivas sin quedar agendadas ni cerradas"
          />
        </div>
      </div>

      <div>
        <div className="section-title">
          <span className="section-rule" style={{ background: 'var(--negative)' }} />
          Alertas globales (toda la base)
        </div>

        <div className="grid-stats">
          <StatCard
            label="Dinero sobre la mesa"
            value={`${dineroSobreLaMesa.length} leads`}
            hint="Interesados que todavía no agendaron"
            Icon={AlertCircle}
            tone="is-negative"
          />
          <StatCard
            label="Seguimientos abandonados"
            value={`${seguimientosMuertos.length} leads`}
            hint="En conversación sin interacción hace más de 48 h"
            Icon={Clock}
            tone="is-warning"
          />
        </div>
      </div>

      <div>
        <div className="section-title">
          <span className="section-rule" style={{ background: 'var(--positive)' }} />
          Closer · {getRangeLabel()}
        </div>

        <div className="grid-stats">
          <RateCard
            label="Show rate"
            value={showRate}
            Icon={CalendarIcon}
            fill={Number(showRate)}
            hint={`${presentadas.length} asistieron de ${callsInRange.length} agendadas`}
          />
          <RateCard
            label="Calificados"
            value={qualRate}
            Icon={CheckCircle}
            fill={Number(qualRate)}
            hint={`${cualificadas.length} calificados de ${presentadas.length} presentes`}
          />
          <RateCard
            label="Close rate"
            value={closeRate}
            Icon={Crosshair}
            tone="is-positive"
            fill={Number(closeRate)}
            hint={`${cierres.length} cierres de ${presentadas.length} presentes`}
          />
          {enSeguimientoPost.length > 0 && (
            <StatCard
              label="Seguimiento post-call"
              value={enSeguimientoPost.length}
              hint="Llamadas pendientes de cerrar"
              Icon={Briefcase}
              tone="is-warning"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
