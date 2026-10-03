import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar as CalendarIcon, Clock, User, Mail, DollarSign, Target, Briefcase, Video, CheckCircle, XCircle } from 'lucide-react';

const BookingManager = ({ llamadas, setLlamadas }) => {
  // Estado para la fecha seleccionada (por defecto Hoy, formato YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Estado para el modal de detalles o panel lateral
  const [selectedCall, setSelectedCall] = useState(null);

  // Estados del formulario Cierre
  const [isUpdating, setIsUpdating] = useState(false);

  // Filtrar las llamadas según la fecha seleccionada (usando fecha de llamada)
  const filteredCalls = llamadas.filter(call => {
    if (!call.fecha_llamada) return false;
    // Formatear al huso local para la comparación (simple)
    const callDate = new Date(call.fecha_llamada);
    // Para simplificar, comparamos YYYY-MM-DD local
    const yyyy = callDate.getFullYear();
    const mm = String(callDate.getMonth() + 1).padStart(2, '0');
    const dd = String(callDate.getDate()).padStart(2, '0');
    const localDateString = `${yyyy}-${mm}-${dd}`;
    return localDateString === selectedDate;
  });

  // Ordenar cronológicamente
  filteredCalls.sort((a, b) => new Date(a.fecha_llamada) - new Date(b.fecha_llamada));

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('agendada')) return 'var(--accent)';
    if (s.includes('presentada')) return 'var(--positive)';
    if (s.includes('no asisti') || s.includes('cancelada')) return 'var(--negative)';
    return 'var(--neutral)';
  };

  const handleUpdateCall = async (field, value) => {
    if (!selectedCall) return;
    try {
      setIsUpdating(true);

      // Update optimistic UI
      const updatedCall = { ...selectedCall, [field]: value };
      setSelectedCall(updatedCall);
      setLlamadas(prev => prev.map(c => c.id === selectedCall.id ? updatedCall : c));

      // Update Supabase
      const { error } = await supabase
        .from('llamadas')
        .update({ [field]: value })
        .eq('id', selectedCall.id);

      if (error) {
        console.error('Error actualizando llamada:', error);
        alert('Error al guardar: ' + error.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="split-alt">

      {/* Columna Izquierda: Calendario y Lista */}
      <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '9px' }}>
            <CalendarIcon size={17} style={{ color: 'var(--text-muted)' }} />
            Agenda diaria
          </h2>
          <input
            type="date"
            className="glass-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>

        <div className="scroll-y" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredCalls.length === 0 ? (
            <div className="empty-state">
              No hay llamadas programadas para este día.
            </div>
          ) : (
            filteredCalls.map(call => (
              <div
                key={call.id}
                onClick={() => setSelectedCall(call)}
                style={{
                  background: selectedCall?.id === call.id ? 'var(--accent-soft)' : 'var(--surface-2)',
                  border: `1px solid ${selectedCall?.id === call.id ? 'var(--accent-border)' : 'var(--border)'}`,
                  borderLeft: `3px solid ${getStatusColor(call.estado)}`,
                  borderRadius: 'var(--radius)',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'background 0.18s ease, border-color 0.18s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 650, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={15} style={{ color: 'var(--text-muted)' }} />
                    {formatTime(call.fecha_llamada)}
                  </span>
                  <span className="badge">{call.estado || 'Agendada'}</span>
                </div>

                <h3 style={{ fontSize: '1rem', marginBottom: '6px' }}>{call.nombre || 'Prospecto sin nombre'}</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <User size={13} /> {call.instagram || '-'}
                  </span>
                  <span>Closer: {call.closer || 'Sin asignar'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Columna Derecha: Detalles (lo que contó el lead) */}
      <div className={`panel detail-panel${selectedCall ? ' is-open' : ''}`} style={{ minHeight: '360px', display: 'flex', flexDirection: 'column' }}>
        {!selectedCall ? (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <Target size={30} />
            <p>Selecciona una llamada de la agenda para ver lo que contó el lead antes de la llamada.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>

            {/* Encabezado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{selectedCall.nombre || 'Sin nombre'}</h2>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: '0.87rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Mail size={15}/> {selectedCall.email || 'Sin email'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><User size={15}/> @{selectedCall.instagram || '-'}</span>
                </div>
              </div>
              {selectedCall.enlace && (
                <a href={selectedCall.enlace} target="_blank" rel="noreferrer" className="btn-primary btn-inline" style={{ textDecoration: 'none' }}>
                  <Video size={17} /> Entrar a la llamada
                </a>
              )}
            </div>

            {/* Lo que contó antes de la llamada */}
            <div className="grid-form">
              {[
                { Icon: Target, label: 'Dolores', value: selectedCall.dolores },
                { Icon: DollarSign, label: 'Ingresos actuales', value: selectedCall.ingresos_actuales },
                { Icon: Briefcase, label: 'Capacidad económica', value: selectedCall.capacidad_economica },
              ].map(({ Icon, label, value }) => (
                <div key={label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '15px', borderRadius: 'var(--radius)' }}>
                  <div className="stat-label" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon size={13} /> {label}
                  </div>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.55 }}>
                    {value || <span style={{ color: 'var(--text-muted)' }}>No respondido</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Controles del Closer (Post-llamada) */}
            <div style={{ marginTop: 'auto', paddingTop: '22px', borderTop: '1px solid var(--border)' }}>
              <h3 className="section-title">Reporte post-llamada</h3>

              <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>

                {/* Asistencia */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label className="field-label">Asistencia / estado</label>
                  <select
                    className="glass-input"
                    value={selectedCall.estado || ''}
                    onChange={(e) => handleUpdateCall('estado', e.target.value || null)}
                    disabled={isUpdating}
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Agendada">Agendada (Aún no ocurre)</option>
                    <option value="Presentada">Presentada (Asistió)</option>
                    <option value="No asistió">No Asistió (No Show)</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>

                {/* Resultado Comercial */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label className="field-label">Resultado comercial</label>
                  <select
                    className="glass-input"
                    value={selectedCall.resultado || ''}
                    onChange={(e) => handleUpdateCall('resultado', e.target.value || null)}
                    disabled={isUpdating}
                  >
                    <option value="">Sin definir...</option>
                    <option value="Cierre">Cierre / ganado</option>
                    <option value="Seguimiento">Seguimiento</option>
                    <option value="No califica financiero">No califica (financiero)</option>
                    <option value="No es el momento">No es el momento</option>
                    <option value="Perdido">Perdido definitivo</option>
                  </select>
                </div>

                {/* Calificación */}
                <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column' }}>
                  <label className="field-label">¿Lead cualificado?</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn"
                      onClick={() => handleUpdateCall('calificada', true)}
                      style={{
                        flex: 1,
                        background: selectedCall.calificada === true ? 'var(--positive-soft)' : undefined,
                        borderColor: selectedCall.calificada === true ? 'var(--positive-border)' : undefined,
                        color: selectedCall.calificada === true ? 'var(--positive)' : undefined,
                      }}
                    >
                      <CheckCircle size={16} /> Sí
                    </button>
                    <button
                      className="btn"
                      onClick={() => handleUpdateCall('calificada', false)}
                      style={{
                        flex: 1,
                        background: selectedCall.calificada === false ? 'var(--negative-soft)' : undefined,
                        borderColor: selectedCall.calificada === false ? 'var(--negative-border)' : undefined,
                        color: selectedCall.calificada === false ? 'var(--negative)' : undefined,
                      }}
                    >
                      <XCircle size={16} /> No
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default BookingManager;
