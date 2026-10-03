import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { hoy, sumarMeses, sumarDias, mesDe, fmtFecha } from '../fechas';
import { fmtMoney, MONEDA, NOMBRES_PROGRAMAS, programaPorNombre, duracionDePrograma, EQUIPO, PORCENTAJES, COMISION_SOBRE } from '../config';
import { nombrePersona, columnasComision, resumenPorPersona } from '../comisiones';
import { planDeCuotas, recalcularPago } from '../cuotas';
import {
  DollarSign, Clock, AlertTriangle, TrendingUp, Search,
  UserPlus, CreditCard, BarChart2, CheckCircle, XCircle,
  Calendar, RefreshCw, Edit3, Save, X, PieChart, Receipt,
  Paperclip, Percent, Zap, ClipboardList,
} from 'lucide-react';

// ─── Constantes ───────────────────────────────────────────────────────────────
const ESTADOS          = ['Pendiente', 'Pagado', 'Incobrable'];

const fmtDate = fmtFecha;

// Nombres que se muestran en los avisos de campos obligatorios.
const ETIQUETAS = {
  nombre: 'Nombre y apellido', email: 'Email', programa: 'Programa', montoTotal: 'Monto total',
  fechaInicio: 'Fecha de inicio', nCuotas: 'N° de cuotas',
};
const faltaCampo = (formulario, campos) => campos.find((k) => !formulario[k]);

// Devuelve el modificador de color semántico que usa el design system
const estadoTone = (estado) => {
  if (estado === 'Pagado')     return 'is-positive';
  if (estado === 'Pendiente')  return 'is-warning';
  if (estado === 'Incobrable') return 'is-negative';
  return '';
};

// Filas de la tabla cuotas para una venta nueva, a partir del plan de src/cuotas.js.
const filasDeCuotas = ({ plan, alumnoId, ventaId, setter, closer }) => plan.map(c => ({
  id: crypto.randomUUID(),
  venta_id: ventaId,
  alumno_id: alumnoId,
  n_cuota: c.n_cuota,
  monto: c.monto,
  fecha_vencimiento: c.fecha_vencimiento,
  fecha_pago: c.pagada ? hoy() : null,
  estado: c.pagada ? 'Pagado' : 'Pendiente',
  setter: setter || null,
  closer: closer || null,
}));

// Plan de cuotas de un formulario de alta o renovación (o { error }).
const planDelFormulario = (f) => planDeCuotas({
  montoTotal: parseFloat(f.montoTotal),
  nCuotas: parseInt(f.nCuotas),
  pagoEnLlamada: parseFloat(f.pagoEnLlamada || 0),
  fechaInicio: f.fechaInicio,
});

// Vista previa de las cuotas mientras se completa el formulario.
const VistaPreviaCuotas = ({ formulario, titulo, tono }) => {
  if (!formulario.montoTotal || !formulario.nCuotas || !formulario.fechaInicio) return null;
  const { cuotas: plan, error } = planDelFormulario(formulario);
  return (
    <div className={`note ${error ? 'is-warning' : tono}`}>
      <div className="note-title"><ClipboardList size={15} /> {titulo}</div>
      {error && <div>{error}</div>}
      {plan && plan.slice(0, 24).map((c, i) => (
        <div key={c.n_cuota} style={{ display:'flex', justifyContent:'space-between', gap: '12px', padding:'7px 0', borderBottom: i < plan.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <span style={{ color:'var(--text-secondary)' }}>Cuota {c.n_cuota} · {fmtDate(c.fecha_vencimiento)}</span>
          <span className={c.pagada ? 'is-positive-text' : 'is-warning-text'} style={{ fontWeight: 650, whiteSpace: 'nowrap' }}>
            {fmtMoney(c.monto)} · {c.pagada ? 'pagada' : 'pendiente'}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Selector de setter o closer ─────────────────────────────────────────────
// Ofrece el equipo de negocio.config.js, para que un nombre mal escrito no parta las comisiones.
// Si el equipo no está configurado, queda un campo de texto libre.
const PersonaSelect = ({ value, onChange, opciones }) => {
  if (opciones.length === 0) {
    return <input className="glass-input" type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="Nombre" />;
  }
  const nombres = [...new Set([...opciones, value].filter(Boolean))];
  return (
    <select className="glass-input" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">Sin asignar</option>
      {nombres.map(n => <option key={n} value={n}>{n}</option>)}
    </select>
  );
};

// ─── Combobox de alumnos (reutilizable) ───────────────────────────────────────
const AlumnoCombobox = ({ alumnos, value, onSelect, placeholder = 'Buscar alumno...' }) => {
  const [search, setSearch] = useState(value || '');
  const [open, setOpen]     = useState(false);

  const filtered = useMemo(() => {
    if (!search) return alumnos;
    return alumnos.filter(a => a.nombre?.toLowerCase().includes(search.toLowerCase()));
  }, [alumnos, search]);

  const handleSelect = (a) => { setSearch(a.nombre); setOpen(false); onSelect(a); };

  const popoverStyle = {
    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
    background: 'var(--surface-3)', border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius)', maxHeight: '230px', overflowY: 'auto',
    boxShadow: 'var(--shadow)',
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="search-wrap" style={{ flex: 'none' }}>
        <Search size={15} />
        <input className="glass-input" placeholder={placeholder} value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); onSelect(null); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      </div>
      {open && filtered.length > 0 && (
        <div style={popoverStyle}>
          {filtered.map(a => (
            <div key={a.id} onMouseDown={() => handleSelect(a)}
              style={{ padding: '11px 15px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontWeight: 550 }}>{a.nombre}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '8px' }}>{a.programa}</span>
            </div>
          ))}
        </div>
      )}
      {open && search && filtered.length === 0 && (
        <div style={{ ...popoverStyle, padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Sin resultados para "{search}"
        </div>
      )}
    </div>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────
const FinanceModule = ({ cuotas = [], setCuotas, ventas = [], setVentas, alumnos = [], setAlumnos }) => {
  const [activeTab, setActiveTab] = useState('RESUMEN');

  const alumnosById = useMemo(() => Object.fromEntries(alumnos.map(a => [a.id, a])), [alumnos]);
  const ventasById  = useMemo(() => Object.fromEntries(ventas.map(v => [v.id, v])), [ventas]);
  const nombreAlumno = (c) => alumnosById[c.alumno_id]?.nombre || '-';

  // ── Helpers de fecha: las fechas son texto 'AAAA-MM-DD' (ver fechas.js) ──────
  const HOY          = hoy();
  const CURRENT_YEAR = Number(HOY.slice(0, 4));
  const MONTH_NAMES  = Array.from({ length: 12 }, (_, i) => {
    const name = new Date(CURRENT_YEAR, i, 1).toLocaleString('es-ES', { month: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });

  const makeRangeChecker = (range, cStart, cEnd) => (ds) => {
    if (!ds) return false;
    const fecha = String(ds).slice(0, 10);
    if (range === 'CUSTOM') {
      if (!cStart || !cEnd) return true;
      return fecha >= cStart && fecha <= cEnd;
    }
    if (Number(fecha.slice(0, 4)) !== CURRENT_YEAR) return false;
    if (range === 'ALL') return true;
    return Number(fecha.slice(5, 7)) === parseInt(range);
  };

  // ── Tab 1: Resumen ───────────────────────────────────────────────────────────
  const [dateRange,   setDateRange]   = useState(String(Number(hoy().slice(5, 7))));
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const isInRange = useMemo(() => makeRangeChecker(dateRange, customStart, customEnd), [dateRange, customStart, customEnd]);

  const cashCollected = useMemo(() =>
    cuotas.filter(c => c.estado === 'Pagado' && isInRange(c.fecha_pago)).reduce((s, c) => s + Number(c.monto || 0), 0),
    [cuotas, isInRange]);
  const porCobrar     = useMemo(() => cuotas.filter(c => c.estado === 'Pendiente').reduce((s, c) => s + Number(c.monto || 0), 0), [cuotas]);
  const incobrable    = useMemo(() => cuotas.filter(c => c.estado === 'Incobrable').reduce((s, c) => s + Number(c.monto || 0), 0), [cuotas]);
  const nuevasVentas  = useMemo(() => ventas.filter(v => isInRange(v.fecha_venta)).length, [ventas, isInRange]);

  const revenueByProg = useMemo(() => {
    const map = {};
    ventas.forEach(v => { if (v.programa) map[v.programa] = (map[v.programa] || 0) + Number(v.monto || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [ventas]);
  const maxRevProg = revenueByProg[0]?.[1] || 1;

  const alertasCobranza = useMemo(() => {
    const desde = hoy(), hasta = sumarDias(desde, 7);
    return cuotas.filter(c => c.estado === 'Pendiente' && c.fecha_vencimiento && c.fecha_vencimiento >= desde && c.fecha_vencimiento <= hasta)
      .sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
  }, [cuotas]);

  // ── Tab 2: Historial ─────────────────────────────────────────────────────────
  const [histSearch,      setHistSearch]      = useState('');
  const [histEstado,      setHistEstado]      = useState('ALL');
  const [histDateRange,   setHistDateRange]   = useState('ALL');
  const [histCustomStart, setHistCustomStart] = useState('');
  const [histCustomEnd,   setHistCustomEnd]   = useState('');
  const isHistInRange = useMemo(() => makeRangeChecker(histDateRange, histCustomStart, histCustomEnd), [histDateRange, histCustomStart, histCustomEnd]);

  // ── Edición inline de cuota ──────────────────────────────────────────────────
  const [editCuota,        setEditCuota]        = useState(null);
  const [editEstado,       setEditEstado]       = useState('');
  const [editMonto,        setEditMonto]        = useState('');
  const [editFechaPago,    setEditFechaPago]    = useState('');
  const [editLoading,      setEditLoading]      = useState(false);
  const [editComprobante,  setEditComprobante]  = useState(null);

  const openEdit = (c) => {
    setEditCuota(c);
    setEditEstado(c.estado);
    setEditMonto(String(c.monto || ''));
    setEditFechaPago(c.fecha_pago ? String(c.fecha_pago).slice(0, 10) : '');
    setEditComprobante(null);
  };

  const subirComprobante = async (cuotaId, archivo) => {
    const ext  = archivo.name.split('.').pop();
    const path = `${cuotaId}/${Date.now()}.${ext}`;
    const { data: upData, error: upErr } = await supabase.storage
      .from('comprobantes').upload(path, archivo, { upsert: true });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(upData.path);
    return urlData.publicUrl;
  };

  const handleSaveEdit = async () => {
    if (!editCuota) return;
    setEditLoading(true);
    try {
      let comprobanteUrl = editCuota.comprobante_url || null;
      if (editComprobante) comprobanteUrl = await subirComprobante(editCuota.id, editComprobante);
      const updates = {
        estado:          editEstado,
        monto:           parseFloat(editMonto),
        fecha_pago:      editEstado === 'Pagado' ? (editFechaPago || hoy()) : null,
        comprobante_url: comprobanteUrl,
      };
      const { error } = await supabase.from('cuotas').update(updates).eq('id', editCuota.id);
      if (error) throw error;
      setCuotas(prev => prev.map(c => c.id === editCuota.id ? { ...c, ...updates } : c));
      setEditCuota(null); setEditComprobante(null);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const filteredCuotas = useMemo(() => {
    return cuotas.filter(c => {
      const label       = `${alumnosById[c.alumno_id]?.nombre || ''} ${ventasById[c.venta_id]?.programa || ''}`;
      const matchSearch = !histSearch || label.toLowerCase().includes(histSearch.toLowerCase());
      const matchEstado = histEstado === 'ALL' || c.estado === histEstado;
      const refDate     = c.estado === 'Pagado' ? c.fecha_pago : c.fecha_vencimiento;
      const matchDate   = histDateRange === 'ALL' || isHistInRange(refDate);
      return matchSearch && matchEstado && matchDate;
    });
  }, [cuotas, alumnosById, ventasById, histSearch, histEstado, isHistInRange, histDateRange]);

  // ── Tab 3: Registrar Pago ────────────────────────────────────────────────────
  const [rpAlumno,       setRpAlumno]       = useState(null);
  const [rpCuota,        setRpCuota]        = useState('');
  const [rpMonto,        setRpMonto]        = useState('');
  const [rpFecha,        setRpFecha]        = useState(hoy);
  const [rpLoading,      setRpLoading]      = useState(false);
  const [rpComprobante,  setRpComprobante]  = useState(null); // File object

  const cuotasDelAlumno = useMemo(() => {
    if (!rpAlumno) return [];
    return cuotas
      .filter(c => c.estado === 'Pendiente' && c.alumno_id === rpAlumno.id)
      .sort((a, b) => (a.n_cuota || 0) - (b.n_cuota || 0));
  }, [cuotas, rpAlumno]);
  const cuotaInfoSeleccionada = cuotasDelAlumno.find(c => c.id === rpCuota);
  // El recálculo solo toca las cuotas de la MISMA venta (una renovación no se mezcla con la anterior).
  const cuotasDeLaVenta = cuotaInfoSeleccionada ? cuotas.filter(c => c.venta_id === cuotaInfoSeleccionada.venta_id) : [];
  const recalculo = cuotaInfoSeleccionada && parseFloat(rpMonto) > 0
    ? recalcularPago({ cuota: cuotaInfoSeleccionada, montoPagado: parseFloat(rpMonto), fechaPago: rpFecha, cuotasDeLaVenta })
    : null;

  const handleRegistrarPago = async () => {
    if (!rpCuota || !rpMonto || !rpFecha) return alert('Completa todos los campos.');
    if (!recalculo || recalculo.error) return alert(recalculo?.error || 'Revisa el monto.');
    setRpLoading(true);
    try {
      const montoReal = Math.round(parseFloat(rpMonto) * 100) / 100;
      const comprobantePath = rpComprobante ? await subirComprobante(rpCuota, rpComprobante) : null;

      const pagoUpdates = { estado: 'Pagado', fecha_pago: rpFecha, monto: montoReal, ...(comprobantePath && { comprobante_url: comprobantePath }) };
      const { error: errPago } = await supabase.from('cuotas').update(pagoUpdates).eq('id', rpCuota);
      if (errPago) throw errPago;

      for (const { id, ...cambios } of recalculo.ajustes) {
        const { error } = await supabase.from('cuotas').update(cambios).eq('id', id);
        if (error) throw error;
      }

      let saldo = null;
      if (recalculo.saldo) {
        saldo = {
          id:                crypto.randomUUID(),
          venta_id:          cuotaInfoSeleccionada.venta_id,
          alumno_id:         cuotaInfoSeleccionada.alumno_id,
          ...recalculo.saldo,
          fecha_pago:        null,
          estado:            'Pendiente',
          setter:            cuotaInfoSeleccionada.setter || null,
          closer:            cuotaInfoSeleccionada.closer || null,
          notas:             `Saldo del pago parcial de la cuota ${cuotaInfoSeleccionada.n_cuota}.`,
        };
        const { error: errS } = await supabase.from('cuotas').insert([saldo]);
        if (errS) throw errS;
      }

      const ajustesPorId = Object.fromEntries(recalculo.ajustes.map(a => [a.id, a]));
      setCuotas(prev => [
        ...(saldo ? [saldo] : []),
        ...prev.map(c => {
          if (c.id === rpCuota) return { ...c, ...pagoUpdates };
          if (ajustesPorId[c.id]) return { ...c, ...ajustesPorId[c.id] };
          return c;
        }),
      ]);

      if (saldo) alert(`✅ Pago parcial registrado. Se creó una cuota de saldo por ${fmtMoney(saldo.monto)} que vence el ${fmtDate(saldo.fecha_vencimiento)}.`);
      else if (recalculo.ajustes.length > 0) alert(`✅ Pago registrado. ${recalculo.ajustes.length} cuota(s) recalculada(s).`);
      else alert('✅ Pago registrado correctamente.');

      setRpAlumno(null); setRpCuota(''); setRpMonto(''); setRpComprobante(null);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setRpLoading(false); }
  };

  // ── Tab 4: Alta de Nuevo Alumno ──────────────────────────────────────────────
  const emptyForm = { nombre: '', email: '', whatsapp: '', programa: '', montoTotal: '', fechaInicio: '', pagoEnLlamada: '', nCuotas: '', setter: '', closer: '' };
  const [form, setForm]           = useState(emptyForm);
  const [altaLoading, setAltaLoading] = useState(false);
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Al elegir un programa se proponen su precio y sus cuotas de negocio.config.js (se pueden cambiar).
  const conPrograma = (f, nombre) => {
    const p = programaPorNombre(nombre);
    return { ...f, programa: nombre, ...(p?.precio != null && { montoTotal: String(p.precio) }), ...(p && { nCuotas: String(p.cuotas) }) };
  };

  const handleAltaAlumno = async () => {
    const falta = faltaCampo(form, ['nombre', 'email', 'programa', 'montoTotal', 'fechaInicio', 'nCuotas']);
    if (falta) return alert(`Falta completar "${ETIQUETAS[falta]}".`);
    setAltaLoading(true);
    try {
      const { cuotas: plan, error: errPlan } = planDelFormulario(form);
      if (errPlan) throw new Error(errPlan);
      const fInicio = form.fechaInicio;
      const duracion = duracionDePrograma(form.programa);
      const fFin = sumarMeses(fInicio, duracion);
      const montoTotal = parseFloat(form.montoTotal), nCuotas = plan.length;
      const alumnoId = crypto.randomUUID();

      const nuevoAlumno = {
        id: alumnoId, nombre: form.nombre, email: form.email,
        telefono: form.whatsapp || null, programa: form.programa,
        fecha_inicio: fInicio, fecha_fin: fFin, duracion_meses: duracion,
        setter: form.setter || null, closer: form.closer || null,
        estado: 'Activo',
      };
      const { error: errA } = await supabase.from('alumnos').insert([nuevoAlumno]);
      if (errA) throw errA;

      const nuevaVenta = {
        id: crypto.randomUUID(), alumno_id: alumnoId, programa: form.programa, monto: montoTotal,
        fecha_venta: hoy(), fecha_inicio: fInicio, fecha_fin: fFin,
        n_cuotas: nCuotas, setter: form.setter || null, closer: form.closer || null, es_renovacion: false,
      };
      const { error: errV } = await supabase.from('ventas').insert([nuevaVenta]);
      if (errV) throw errV;

      const nuevasCuotas = filasDeCuotas({ plan, alumnoId, ventaId: nuevaVenta.id, setter: form.setter, closer: form.closer });
      const { error: errC } = await supabase.from('cuotas').insert(nuevasCuotas);
      if (errC) throw errC;

      setAlumnos(prev => [nuevoAlumno, ...prev]);
      setVentas(prev => [nuevaVenta, ...prev]);
      setCuotas(prev => [...nuevasCuotas, ...prev]);
      alert(`✅ "${form.nombre}" dado de alta con ${nCuotas} cuotas.`);
      setForm(emptyForm);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setAltaLoading(false); }
  };

  // ── Tab 6: Comisiones ───────────────────────────────────────────────────
  // Mes por defecto: el mes ANTERIOR (cerramos el mes que pasó y pagamos el 1ero)
  const mesAnterior = sumarMeses(`${hoy().slice(0, 7)}-01`, -1);
  const [comMes, setComMes]     = useState(Number(mesAnterior.slice(5, 7)));  // 1-12
  const [comAnio, setComAnio]   = useState(Number(mesAnterior.slice(0, 4)));
  const comMesClave = `${comAnio}-${String(comMes).padStart(2, '0')}`;
  const [comSaving, setComSaving] = useState(false);

  // Sobre qué se paga la comisión (negocio.config.js):
  //  'cobrado': las cuotas que se cobraron en el mes, cada una con su setter y su closer.
  //  'vendido': las ventas que se hicieron en el mes, por el total vendido.
  const sobreVendido = COMISION_SOBRE === 'vendido';
  const enMes = (f) => (sobreVendido ? mesDe(f.fecha_venta) : (f.estado === 'Pagado' && f.fecha_pago ? mesDe(f.fecha_pago) : null)) === comMesClave;
  const filasDelMes = useMemo(
    () => (sobreVendido ? ventas : cuotas).filter(enMes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sobreVendido, ventas, cuotas, comMesClave],
  );

  // Comisiones por persona. El rol (setter, closer o los dos) se decide fila por fila:
  // quien fue setter+closer solo en algunas cobra el porcentaje de "misma persona" solo en esas.
  const comisionesResumen = useMemo(() => resumenPorPersona(filasDelMes, PORCENTAJES), [filasDelMes]);

  const handleGuardarComisiones = async () => {
    setComSaving(true);
    try {
      const tabla = sobreVendido ? 'ventas' : 'cuotas';
      for (const f of filasDelMes) {
        const { error } = await supabase.from(tabla).update(columnasComision(f, PORCENTAJES)).eq('id', f.id);
        if (error) throw error;
      }
      const actualizar = prev => prev.map(f => (enMes(f) ? { ...f, ...columnasComision(f, PORCENTAJES) } : f));
      if (sobreVendido) setVentas(actualizar); else setCuotas(actualizar);
      alert(`✅ Comisiones del mes guardadas en ${filasDelMes.length} ${sobreVendido ? 'venta(s)' : 'cuota(s)'}.`);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setComSaving(false); }
  };

  // ── Tab 5: Renovación ────────────────────────────────────────────────────────
  const emptyRen = { programa: '', montoTotal: '', fechaInicio: '', pagoEnLlamada: '', nCuotas: '', setter: '', closer: '' };
  const [renAlumno,   setRenAlumno]   = useState(null); // objeto alumno seleccionado
  const [renForm,     setRenForm]     = useState(emptyRen);
  const [renLoading,  setRenLoading]  = useState(false);
  const setRenField = (k, v) => setRenForm(f => ({ ...f, [k]: v }));

  // cuando se elige el alumno, pre-cargar datos
  const onRenAlumnoSelect = (a) => {
    setRenAlumno(a);
    if (!a) return setRenForm(emptyRen);
    const sugeridaInicio = a.fecha_fin ? String(a.fecha_fin).slice(0, 10) : hoy();
    setRenForm(f => ({ ...conPrograma(f, a.programa || ''), fechaInicio: sugeridaInicio, setter: a.setter || '', closer: a.closer || '' }));
  };

  const handleRenovacion = async () => {
    if (!renAlumno) return alert('Selecciona un alumno.');
    const falta = faltaCampo(renForm, ['programa', 'montoTotal', 'fechaInicio', 'nCuotas']);
    if (falta) return alert(`Falta completar "${ETIQUETAS[falta]}".`);
    setRenLoading(true);
    try {
      const { cuotas: plan, error: errPlan } = planDelFormulario(renForm);
      if (errPlan) throw new Error(errPlan);
      const fInicio    = renForm.fechaInicio;
      const duracion   = duracionDePrograma(renForm.programa);
      const fFin       = sumarMeses(fInicio, duracion);
      const montoTotal = parseFloat(renForm.montoTotal);
      const nCuotas    = plan.length;

      // 1. Actualizar alumno
      const alumnoUpdates = {
        programa: renForm.programa, fecha_inicio: fInicio,
        fecha_fin: fFin, duracion_meses: duracion, estado: 'Activo',
        setter: renForm.setter || null, closer: renForm.closer || null,
      };
      const { error: errA } = await supabase.from('alumnos').update(alumnoUpdates).eq('id', renAlumno.id);
      if (errA) throw errA;

      // 2. Crear la venta de renovación
      const nuevaVenta = {
        id: crypto.randomUUID(), alumno_id: renAlumno.id, programa: renForm.programa, monto: montoTotal,
        fecha_venta: hoy(), fecha_inicio: fInicio, fecha_fin: fFin,
        n_cuotas: nCuotas, setter: renForm.setter || null, closer: renForm.closer || null, es_renovacion: true,
      };
      const { error: errV } = await supabase.from('ventas').insert([nuevaVenta]);
      if (errV) throw errV;

      // 3. Crear nuevas cuotas
      const nuevasCuotas = filasDeCuotas({ plan, alumnoId: renAlumno.id, ventaId: nuevaVenta.id, setter: renForm.setter, closer: renForm.closer });
      const { error: errC } = await supabase.from('cuotas').insert(nuevasCuotas);
      if (errC) throw errC;

      // 4. Actualizar estado local
      setAlumnos(prev => prev.map(a => a.id === renAlumno.id ? { ...a, ...alumnoUpdates } : a));
      setVentas(prev => [nuevaVenta, ...prev]);
      setCuotas(prev => [...nuevasCuotas, ...prev]);
      alert(`✅ Renovación de "${renAlumno.nombre}" registrada con ${nCuotas} cuotas.`);
      setRenAlumno(null); setRenForm(emptyRen);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setRenLoading(false); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const TABS = [
    { key: 'RESUMEN',    label: 'Resumen',         Icon: PieChart },
    { key: 'HISTORIAL',  label: 'Historial',       Icon: Receipt },
    { key: 'PAGO',       label: 'Registrar pago',  Icon: CreditCard },
    { key: 'ALTA',       label: 'Nuevo alumno',    Icon: UserPlus },
    { key: 'RENOVACION', label: 'Renovación',      Icon: RefreshCw },
    { key: 'COMISIONES', label: 'Comisiones',      Icon: Percent },
  ];

  const inputRow = (label, key, type, placeholder, formObj, setFn) => (
    <div key={key}>
      <label className="field-label">{label}</label>
      <input className="glass-input" type={type} placeholder={placeholder} value={formObj[key]} onChange={e => setFn(key, e.target.value)} />
    </div>
  );

  return (
    <div className="stack">

      {/* Tab Nav */}
      <div className="tabs">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`tab${activeTab === key ? ' active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ===== TAB 1: RESUMEN ===== */}
      {activeTab === 'RESUMEN' && (
        <div className="stack">
          <div className="panel toolbar">
            <Calendar size={17} color="var(--text-muted)" />
            <select className="glass-input" value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ width: 'auto', minWidth: '180px' }}>
              <option value="ALL">Año completo {CURRENT_YEAR}</option>
              {MONTH_NAMES.map((name, i) => <option key={i+1} value={String(i+1)}>{name} {CURRENT_YEAR}</option>)}
              <option value="CUSTOM">Rango personalizado</option>
            </select>
            {dateRange === 'CUSTOM' && (<>
              <input type="date" className="glass-input" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ width: 'auto' }} />
              <span style={{ color: 'var(--text-muted)' }}>a</span>
              <input type="date" className="glass-input" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ width: 'auto' }} />
            </>)}
          </div>

          <div className="grid-stats">
            {[
              { label: 'Cobrado', value: fmtMoney(cashCollected), tone: 'is-positive', Icon: DollarSign, hint: 'Cobrado en el período' },
              { label: 'Por cobrar',     value: fmtMoney(porCobrar),     tone: 'is-warning',  Icon: Clock,      hint: 'Cuotas pendientes' },
              { label: 'Incobrable',     value: fmtMoney(incobrable),    tone: 'is-negative', Icon: XCircle,    hint: 'Dado de baja' },
              { label: 'Nuevas ventas',  value: nuevasVentas,            tone: 'is-accent',   Icon: TrendingUp, hint: 'Altas del período' },
            ].map(({ label, value, tone, Icon, hint }) => (
              <div key={label} className="stat-card">
                <div className="stat-head">
                  <span className="stat-label">{label}</span>
                  <span className={`stat-icon ${tone}`}><Icon size={16} /></span>
                </div>
                <div className={`stat-value ${tone}-text`}>{value}</div>
                <div className="stat-hint">{hint}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3 className="section-title" style={{ marginBottom: '18px' }}>
              <BarChart2 size={15} /> Ventas por programa (histórico)
            </h3>
            {revenueByProg.map(([prog, rev]) => (
              <div key={prog} style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontSize: '0.88rem' }}>
                  <span>{prog}</span>
                  <span style={{ fontWeight: 650 }}>{fmtMoney(rev)}</span>
                </div>
                <div className="meter">
                  <div className="meter-fill" style={{ width: `${(rev / maxRevProg) * 100}%` }} />
                </div>
              </div>
            ))}
            {revenueByProg.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Todavía no hay ventas cargadas.</p>
            )}
          </div>

          {alertasCobranza.length > 0 && (
            <div className="panel">
              <h3 className="section-title" style={{ color: 'var(--warning)' }}>
                <AlertTriangle size={15} /> Cobranza urgente: vence en los próximos 7 días ({alertasCobranza.length})
              </h3>
              {alertasCobranza.map(c => (
                <div key={c.id} className="list-row">
                  <span>{nombreAlumno(c)}</span>
                  <span className="is-warning-text" style={{ fontWeight: 650, whiteSpace: 'nowrap' }}>
                    {fmtMoney(c.monto)} · {fmtDate(c.fecha_vencimiento)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 2: HISTORIAL ===== */}
      {activeTab === 'HISTORIAL' && (
        <div className="split">
          <div className="panel panel-flush">
            {/* Filtros */}
            <div className="toolbar" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="search-wrap">
                <Search size={16} />
                <input className="glass-input" placeholder="Buscar alumno o programa..." value={histSearch} onChange={e => setHistSearch(e.target.value)} />
              </div>
              <select className="glass-input" value={histEstado} onChange={e => setHistEstado(e.target.value)} style={{ width: 'auto', minWidth: '140px' }}>
                <option value="ALL">Todos los estados</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select className="glass-input" value={histDateRange} onChange={e => setHistDateRange(e.target.value)} style={{ width: 'auto', minWidth: '160px' }}>
                <option value="ALL">Año completo {CURRENT_YEAR}</option>
                {MONTH_NAMES.map((name, i) => <option key={i+1} value={String(i+1)}>{name}</option>)}
                <option value="CUSTOM">Rango personalizado</option>
              </select>
              {histDateRange === 'CUSTOM' && (<>
                <input type="date" className="glass-input" value={histCustomStart} onChange={e => setHistCustomStart(e.target.value)} style={{ width: 'auto' }} />
                <span style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>a</span>
                <input type="date" className="glass-input" value={histCustomEnd} onChange={e => setHistCustomEnd(e.target.value)} style={{ width: 'auto' }} />
              </>)}
            </div>
            <div className="table-scroll">
              <table className="glass-table-container">
                <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr>
                    <th>Alumno</th><th>N°</th><th>Monto</th><th>F. venc.</th><th>F. pago</th><th>Estado</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCuotas.map(c => {
                    const isEditing = editCuota?.id === c.id;
                    return (
                      <tr key={c.id} className={isEditing ? 'is-selected' : undefined}>
                        <td className="cell-strong">{nombreAlumno(c)}</td>
                        <td data-label="Cuota" className="cell-muted">{c.n_cuota || '-'}</td>
                        <td data-label="Monto" style={{ fontWeight: 650 }}>{fmtMoney(c.monto)}</td>
                        <td data-label="F. venc." className="cell-muted">{fmtDate(c.fecha_vencimiento)}</td>
                        <td data-label="F. pago" className="cell-muted">{fmtDate(c.fecha_pago)}</td>
                        <td data-label="Estado">
                          <span className={`badge ${estadoTone(c.estado)}`}>{c.estado}</span>
                        </td>
                        <td data-label="Editar">
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: 34, height: 34, color: isEditing ? 'var(--accent)' : 'var(--text-muted)' }}
                            onClick={() => isEditing ? setEditCuota(null) : openEdit(c)}
                            aria-label={isEditing ? 'Cerrar edición' : 'Editar cuota'}
                          >
                            {isEditing ? <X size={15} /> : <Edit3 size={15} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCuotas.length === 0 && (
                    <tr><td colSpan="7" style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--text-muted)' }}>Sin resultados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Panel de edición inline */}
          {editCuota && (
            <div className="panel split-side detail-panel is-open" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Edit3 size={16} color="var(--accent)" /> Editar cuota
                </h4>
                <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setEditCuota(null)} aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>
              <div className="code-chip" style={{ wordBreak: 'break-all', fontSize: '0.76rem' }}>
                {nombreAlumno(editCuota)} · Cuota {editCuota.n_cuota} · {ventasById[editCuota.venta_id]?.programa || 'Sin programa'}
              </div>

              <div>
                <label className="field-label">Estado</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ESTADOS.map(e => (
                    <button
                      key={e}
                      type="button"
                      className={`badge${editEstado === e ? ` ${estadoTone(e)}` : ''}`}
                      style={{ cursor: 'pointer', padding: '7px 14px', width: 'auto', minHeight: 0, opacity: editEstado === e ? 1 : 0.65 }}
                      onClick={() => setEditEstado(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label">Monto ({MONEDA})</label>
                <input className="glass-input" type="number" step="0.01" value={editMonto} onChange={e => setEditMonto(e.target.value)} />
              </div>

              {editEstado === 'Pagado' && (
                <div>
                  <label className="field-label">Fecha de pago</label>
                  <input className="glass-input" type="date" value={editFechaPago} onChange={e => setEditFechaPago(e.target.value)} />
                </div>
              )}

              {/* Comprobante upload */}
              <div>
                <label className="field-label">Comprobante</label>
                {editCuota?.comprobante_url && !editComprobante && (
                  <a href={editCuota.comprobante_url} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <CheckCircle size={14} /> Ver comprobante actual
                  </a>
                )}
                <label className={`file-drop${editComprobante ? ' has-file' : ''}`}>
                  <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setEditComprobante(e.target.files[0] || null)} />
                  {editComprobante
                    ? <><CheckCircle size={15} /> {editComprobante.name} <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{(editComprobante.size/1024).toFixed(0)} KB</span></>
                    : <><Paperclip size={15} /> {editCuota?.comprobante_url ? 'Reemplazar archivo' : 'Subir imagen o PDF'}</>}
                </label>
                {editComprobante && (
                  <button type="button" className="link-btn" onClick={() => setEditComprobante(null)} style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    Quitar archivo
                  </button>
                )}
              </div>

              <button onClick={handleSaveEdit} disabled={editLoading} className="btn-primary btn-block">
                <Save size={15} /> {editLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 3: REGISTRAR PAGO ===== */}
      {activeTab === 'PAGO' && (
        <div className="split">
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              <CreditCard size={15} /> Registrar cobro de cuota
            </h3>
            <div>
              <label className="field-label">Alumno *</label>
              <AlumnoCombobox
                alumnos={alumnos}
                value={rpAlumno?.nombre || ''}
                onSelect={a => { setRpAlumno(a); setRpCuota(''); setRpMonto(''); }}
                placeholder="Buscar alumno (cualquier estado)..."
              />
            </div>
            {cuotasDelAlumno.length > 0 && (
              <div>
                <label className="field-label">Cuota *</label>
                <select className="glass-input" value={rpCuota} onChange={e => { setRpCuota(e.target.value); setRpMonto(cuotasDelAlumno.find(c => c.id === e.target.value)?.monto || ''); }}>
                  <option value="">Seleccionar...</option>
                  {cuotasDelAlumno.map(c => <option key={c.id} value={c.id}>Cuota {c.n_cuota} · {ventasById[c.venta_id]?.programa || "Sin programa"} · {fmtMoney(c.monto)} · vence {fmtDate(c.fecha_vencimiento)}</option>)}
                </select>
              </div>
            )}
            {rpAlumno && cuotasDelAlumno.length === 0 && (
              <div className="is-positive-text" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={17} /> Sin cuotas pendientes.
              </div>
            )}
            <div className="grid-form">
              <div>
                <label className="field-label">Monto pagado ({MONEDA}) *</label>
                <input className="glass-input" type="number" step="0.01" placeholder="Ej: 190.00" value={rpMonto} onChange={e => setRpMonto(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Fecha de pago *</label>
                <input className="glass-input" type="date" value={rpFecha} onChange={e => setRpFecha(e.target.value)} />
              </div>
            </div>
            {recalculo?.error && (
              <div className="note is-negative">
                <div className="note-title"><Zap size={15} /> No se puede registrar así</div>
                <div>{recalculo.maximo != null ? `El pago supera lo que falta pagar de esta venta (${fmtMoney(recalculo.maximo)}).` : recalculo.error}</div>
              </div>
            )}
            {recalculo && !recalculo.error && (recalculo.ajustes.length > 0 || recalculo.saldo) && (
              <div className="note is-warning">
                <div className="note-title"><Zap size={15} /> Recálculo automático</div>
                <div>Esperado: {fmtMoney(cuotaInfoSeleccionada.monto)} · pagado: {fmtMoney(rpMonto)}</div>
                {recalculo.ajustes.length > 0 && (
                  <div style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>
                    La diferencia se reparte entre las {recalculo.ajustes.length} cuota(s) que quedan de esta venta:{' '}
                    {recalculo.ajustes.map(a => `la cuota ${cuotasDeLaVenta.find(c => c.id === a.id)?.n_cuota} pasa a ${fmtMoney(a.monto)}${a.estado === 'Pagado' ? ' y queda pagada' : ''}`).join(', ')}.
                  </div>
                )}
                {recalculo.saldo && (
                  <div style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>
                    No le quedan cuotas en esta venta: se crea la cuota {recalculo.saldo.n_cuota} por el saldo de {fmtMoney(recalculo.saldo.monto)}, que vence el {fmtDate(recalculo.saldo.fecha_vencimiento)}.
                  </div>
                )}
              </div>
            )}
            {/* Comprobante de pago */}
            <div>
              <label className="field-label">Comprobante (opcional)</label>
              <label className={`file-drop${rpComprobante ? ' has-file' : ''}`}>
                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setRpComprobante(e.target.files[0] || null)} />
                {rpComprobante
                  ? <><CheckCircle size={16} /> {rpComprobante.name}<span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{(rpComprobante.size/1024).toFixed(0)} KB</span></>
                  : <><Paperclip size={16} /> Seleccionar imagen o PDF</>}
              </label>
              {rpComprobante && (
                <button type="button" className="link-btn" onClick={() => setRpComprobante(null)} style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Quitar archivo
                </button>
              )}
            </div>
            <button onClick={handleRegistrarPago} disabled={rpLoading || !rpCuota || !rpMonto || !!recalculo?.error} className="btn-primary btn-block">
              {rpLoading ? 'Registrando...' : 'Confirmar pago'}
            </button>
          </div>
          {rpAlumno && cuotasDelAlumno.length > 0 && (
            <div className="panel split-side">
              <h4 className="section-title">Cuotas de {rpAlumno.nombre}</h4>
              {cuotasDelAlumno.map(c => (
                <div key={c.id} className={`list-row${rpCuota === c.id ? ' is-active' : ''}`}>
                  <span>Cuota {c.n_cuota}</span>
                  <span style={{ fontWeight: 650 }}>{fmtMoney(c.monto)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{fmtDate(c.fecha_vencimiento)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 4: ALTA ===== */}
      {activeTab === 'ALTA' && (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 className="section-title" style={{ margin: 0 }}><UserPlus size={15} /> Carga de nuevo alumno</h3>
          <div className="grid-form">
            {[['Nombre y apellido *','nombre','text','Juan Pérez'],['Email *','email','email','juan@ejemplo.com'],['WhatsApp','whatsapp','text','Con código de país']].map(([l,k,t,p]) => inputRow(l,k,t,p,form,setField))}
            <div>
              <label className="field-label">Programa *</label>
              <select className="glass-input" value={form.programa} onChange={e => setForm(f => conPrograma(f, e.target.value))}>
                <option value="">Seleccionar...</option>
                {NOMBRES_PROGRAMAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {[[`Monto total (${MONEDA}) *`,'montoTotal','number',''],['N° de cuotas *','nCuotas','number',''],['Fecha de inicio *','fechaInicio','date',''],[`Pagó en la llamada (${MONEDA})`,'pagoEnLlamada','number','0']].map(([l,k,t,p]) => inputRow(l,k,t,p,form,setField))}
            <div>
              <label className="field-label">Setter</label>
              <PersonaSelect value={form.setter} onChange={v => setField('setter', v)} opciones={EQUIPO.setters} />
            </div>
            <div>
              <label className="field-label">Closer</label>
              <PersonaSelect value={form.closer} onChange={v => setField('closer', v)} opciones={EQUIPO.closers} />
            </div>
          </div>
          <VistaPreviaCuotas formulario={form} titulo="Así quedan las cuotas" tono="is-positive" />
          <button onClick={handleAltaAlumno} disabled={altaLoading} className="btn-primary btn-block">
            {altaLoading ? 'Guardando...' : 'Dar de alta'}
          </button>
        </div>
      )}

      {/* ===== TAB 5: RENOVACIÓN ===== */}
      {activeTab === 'RENOVACION' && (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 className="section-title" style={{ margin: 0 }}><RefreshCw size={15} /> Renovación de alumno</h3>

          <div>
            <label className="field-label">Alumno a renovar *</label>
            <AlumnoCombobox alumnos={alumnos} value={renAlumno?.nombre || ''} onSelect={onRenAlumnoSelect} placeholder="Buscar alumno (activo o vencido)..." />
          </div>

          {renAlumno && (
            <div className="note is-accent">
              <div className="note-title">Datos actuales de {renAlumno.nombre}</div>
              <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
                <span>Programa: <b style={{ color: 'var(--text)' }}>{renAlumno.programa}</b></span>
                <span>F. fin: <b style={{ color: 'var(--text)' }}>{fmtDate(renAlumno.fecha_fin)}</b></span>
                <span>Estado: <b className={renAlumno.estado === 'Activo' ? 'is-positive-text' : 'is-warning-text'}>{renAlumno.estado}</b></span>
              </div>
            </div>
          )}

          <div className="grid-form">
            <div>
              <label className="field-label">Nuevo programa *</label>
              <select className="glass-input" value={renForm.programa} onChange={e => setRenForm(f => conPrograma(f, e.target.value))}>
                <option value="">Seleccionar...</option>
                {NOMBRES_PROGRAMAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {[[`Monto total (${MONEDA}) *`,'montoTotal','number',''],['N° de cuotas *','nCuotas','number',''],['Fecha de inicio *','fechaInicio','date',''],[`Pagó en la llamada (${MONEDA})`,'pagoEnLlamada','number','0']].map(([l,k,t,p]) => inputRow(l,k,t,p,renForm,setRenField))}
            <div>
              <label className="field-label">Setter</label>
              <PersonaSelect value={renForm.setter} onChange={v => setRenField('setter', v)} opciones={EQUIPO.setters} />
            </div>
            <div>
              <label className="field-label">Closer</label>
              <PersonaSelect value={renForm.closer} onChange={v => setRenField('closer', v)} opciones={EQUIPO.closers} />
            </div>
          </div>

          {renAlumno && <VistaPreviaCuotas formulario={renForm} titulo="Así quedan las cuotas de la renovación" tono="is-accent" />}

          <button onClick={handleRenovacion} disabled={renLoading || !renAlumno} className="btn-primary btn-block">
            {renLoading ? 'Registrando...' : 'Confirmar renovación'}
          </button>
        </div>
      )}

      {/* ===== TAB 6: COMISIONES ===== */}
      {activeTab === 'COMISIONES' && (
        <div className="stack">

          {/* Selector de mes */}
          <div className="panel toolbar">
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Percent size={16} color="var(--text-muted)" /> Liquidación de comisiones
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', flexBasis: '100%' }}>
              Sobre lo {sobreVendido ? 'vendido' : 'cobrado'}: setter {PORCENTAJES.setter}%, closer {PORCENTAJES.closer}%, la misma persona {PORCENTAJES.mismaPersona}%.
            </span>
            <select className="glass-input" style={{ width: 'auto', minWidth: '150px' }} value={comMes} onChange={e => setComMes(Number(e.target.value))}>
              {MONTH_NAMES.map((n, i) => <option key={i} value={i + 1}>{n}</option>)}
            </select>
            <select className="glass-input" style={{ width: 'auto', minWidth: '100px' }} value={comAnio} onChange={e => setComAnio(Number(e.target.value))}>
              {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {filasDelMes.length} {sobreVendido ? 'venta(s) en el mes' : 'cuota(s) cobrada(s) en el mes'}
            </span>
            <button onClick={handleGuardarComisiones} disabled={comSaving || filasDelMes.length === 0}
              className="btn-primary" style={{ marginLeft: 'auto' }}>
              <Save size={15} /> {comSaving ? 'Guardando...' : 'Calcular y guardar'}
            </button>
          </div>

          {filasDelMes.length === 0 ? (
            <div className="panel empty-state">
              {sobreVendido ? 'Sin ventas' : 'Sin cuotas cobradas'} en {MONTH_NAMES[comMes - 1]} {comAnio}
            </div>
          ) : (
            <>
              {/* Cards resumen por persona */}
              <div className="grid-stats">
                {comisionesResumen.map(c => (
                  <div key={c.nombre} className="stat-card">
                    <div className="stat-head">
                      <div>
                        <div style={{ fontWeight: 650, fontSize: '1rem' }}>{c.nombre}</div>
                        {c.roles.map(r => (
                          <div key={r.rol} className="stat-label" style={{ marginTop: '4px' }}>
                            {r.rol} · {r.porcentaje}% de {fmtMoney(r.base)}
                          </div>
                        ))}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="stat-value is-positive-text" style={{ fontSize: '1.35rem' }}>{fmtMoney(c.total)}</div>
                        <div className="stat-hint">{c.filas} {sobreVendido ? 'venta(s)' : 'cuota(s)'}</div>
                      </div>
                    </div>
                    <div className="meter">
                      <div className="meter-fill is-positive"
                        style={{ width: `${Math.min(100, (c.total / Math.max(...comisionesResumen.map(x => x.total))) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabla de detalle */}
              <div className="panel panel-flush">
                <div className="panel-header">{sobreVendido ? 'Detalle de ventas del mes' : 'Detalle de cuotas cobradas'}</div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {['Alumno', sobreVendido ? 'Programa' : 'Cuota', 'Monto', sobreVendido ? 'Fecha venta' : 'Fecha pago', 'Setter', 'Com. setter', 'Closer', 'Com. closer'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filasDelMes.map(c => {
                        const setter = nombrePersona(c.setter);
                        const closer = nombrePersona(c.closer);
                        const monto  = Number(c.monto);
                        const com    = columnasComision(c, PORCENTAJES);
                        return (
                          <tr key={c.id}>
                            <td className="cell-strong">{nombreAlumno(c)}</td>
                            <td data-label={sobreVendido ? 'Programa' : 'Cuota'} className="cell-muted">{sobreVendido ? c.programa : `#${c.n_cuota}`}</td>
                            <td data-label="Monto" style={{ fontWeight: 650 }}>{fmtMoney(monto)}</td>
                            <td data-label="Fecha" className="cell-muted">{fmtDate(sobreVendido ? c.fecha_venta : c.fecha_pago)}</td>
                            <td data-label="Setter">{setter || <span className="cell-muted">-</span>}</td>
                            <td data-label="Com. setter" className={setter ? 'is-positive-text' : 'cell-muted'} style={{ fontWeight: 650 }}>{com.comision_setter != null ? fmtMoney(com.comision_setter) : '-'}</td>
                            <td data-label="Closer">{closer || <span className="cell-muted">-</span>}</td>
                            <td data-label="Com. closer" className={closer ? 'is-positive-text' : 'cell-muted'} style={{ fontWeight: 650 }}>{com.comision_closer != null ? fmtMoney(com.comision_closer) : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <td colSpan={5} style={{ fontWeight: 650, color: 'var(--text-secondary)' }}>Total del mes</td>
                        <td data-label="Total setters" className="is-positive-text" style={{ fontWeight: 700 }}>
                          {fmtMoney(filasDelMes.reduce((s, c) => s + (columnasComision(c, PORCENTAJES).comision_setter || 0), 0))}
                        </td>
                        <td />
                        <td data-label="Total closers" className="is-positive-text" style={{ fontWeight: 700 }}>
                          {fmtMoney(filasDelMes.reduce((s, c) => s + (columnasComision(c, PORCENTAJES).comision_closer || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default FinanceModule;
