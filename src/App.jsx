import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import {
  Search,
  Calendar,
  Users,
  Filter,
  Film,
  LayoutDashboard,
  MessageSquareText,
  Tag,
  Clock3,
  UserRound,
  PanelRightOpen,
  Wallet,
  GraduationCap,
  Menu,
  X as CloseIcon,
  RefreshCw,
} from 'lucide-react';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ContentManager from './components/ContentManager';
import BookingManager from './components/BookingManager';
import StudentDirectory from './components/StudentDirectory';
import FinanceModule from './components/FinanceModule';
import { LEAD_STATUS_OPTIONS, normalizeLeadStatus } from './leadStatus';
import {
  buildDescriptiveContentName,
  getContentDisplayLabel,
  normalizeContentOriginKey,
} from './contentSystem';
import { getRangeBounds } from './timezone';
import { NOMBRE_NEGOCIO, INICIALES_NEGOCIO } from './config';

const LEAD_PAGE_SIZE = 100;

const NAV_ITEMS = [
  { key: 'DASHBOARD', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'LEADS', label: 'Leads', Icon: Users },
  { key: 'CONTENT', label: 'Contenido', Icon: Film },
  { key: 'FINANCE', label: 'Finanzas', Icon: Wallet },
  { key: 'CALLS', label: 'Llamadas', Icon: Calendar },
  { key: 'DIRECTORY', label: 'Alumnos', Icon: GraduationCap },
];

const VIEW_META = {
  DASHBOARD: {
    title: 'Dashboard',
    subtitle: 'KPIs de setter y closer en tiempo real',
  },
  LEADS: {
    title: 'Gestión de Leads',
    subtitle: 'Visualiza y filtra a los clientes potenciales que llegaron por tus redes',
  },
  CONTENT: {
    title: 'Sistema de Contenido',
    subtitle: 'Catálogo de piezas, IDs de automatización y relaciones con leads',
  },
  FINANCE: {
    title: 'Finanzas',
    subtitle: 'Transacciones, cobros, comisiones y alta de nuevos alumnos',
  },
  CALLS: {
    title: 'Booking Calls',
    subtitle: 'Agenda de videollamadas y pre-cualificación de leads',
  },
  DIRECTORY: {
    title: 'Directorio de Alumnos',
    subtitle: 'Base de datos de alumnos activos e historial de programas',
  },
};

function App() {
  const [activeView, setActiveView] = useState('DASHBOARD');
  const [menuOpen, setMenuOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [leadRows, setLeadRows] = useState([]);
  const [leadListCount, setLeadListCount] = useState(0);
  const [leadListOffset, setLeadListOffset] = useState(0);
  const [leadListLoading, setLeadListLoading] = useState(false);
  const [leadListHasMore, setLeadListHasMore] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedLeadDetail, setSelectedLeadDetail] = useState(null);
  const [selectedLeadLoading, setSelectedLeadLoading] = useState(false);
  const [llamadas, setLlamadas] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [cuotas, setCuotas] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [contenidos, setContenidos] = useState({});
  const [leadContentMap, setLeadContentMap] = useState({});
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [loadedGroups, setLoadedGroups] = useState(new Set());

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [contentFilter, setContentFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [contentOptions, setContentOptions] = useState([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    document.title = NOMBRE_NEGOCIO;
    fetchContentCatalog();
    fetchDashboardLeads();
    fetchAnalyticsGroup();
  }, []);

  // Bloquea el scroll de fondo mientras el drawer móvil está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (activeView !== 'LEADS') return;
    fetchLeadList({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, debouncedSearchQuery, statusFilter, contentFilter, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (leadRows.length === 0) {
      setSelectedLeadId(null);
      setSelectedLeadDetail(null);
      return;
    }

    if (selectedLeadId && !leadRows.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(null);
      setSelectedLeadDetail(null);
    }
  }, [leadRows, selectedLeadId]);

  async function fetchContentCatalog() {
    try {
      const { data: catalogRows, error } = await supabase
        .from('contenidos')
        .select('id, nombre, fecha, link')
        .order('fecha', { ascending: false });

      if (error) throw error;

      const contentMap = {};
      const normalizedOptions = catalogRows.map((item) => {
        const normalizedItem = {
          ...item,
          nombre: buildDescriptiveContentName(item.nombre, item.id, item.fecha),
          origen_key: normalizeContentOriginKey(item.id),
        };

        contentMap[item.id] = normalizedItem;
        return normalizedItem;
      });

      setContenidos(contentMap);
      setContentOptions(normalizedOptions);
    } catch (err) {
      console.error('Error cargando contenidos', err);
    }
  }

  async function fetchLeadContentRelations(leadIds, { reset = false } = {}) {
    if (!leadIds || leadIds.length === 0) {
      if (reset) {
        setLeadContentMap({});
      }
      return {};
    }

    try {
      const { data, error } = await supabase
        .from('lead_contenidos')
        .select('lead_id, contenido_id')
        .in('lead_id', leadIds);

      if (error) throw error;

      const relationMap = {};
      for (const row of data || []) {
        if (!row?.lead_id || !row?.contenido_id) continue;
        relationMap[row.lead_id] = relationMap[row.lead_id] || [];
        if (!relationMap[row.lead_id].includes(row.contenido_id)) {
          relationMap[row.lead_id].push(row.contenido_id);
        }
      }

      setLeadContentMap((prev) => (reset ? relationMap : { ...prev, ...relationMap }));
      return relationMap;
    } catch (err) {
      console.error('Error cargando las piezas de cada lead', err);
      if (reset) {
        setLeadContentMap({});
      }
      return {};
    }
  }

  async function fetchDashboardLeads() {
    try {
      setAnalyticsLoading(true);

      const { count, error: countError } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true });
      if (countError) throw countError;

      const step = 2000;
      const totalRequests = Math.ceil((count || 0) / step);
      const promises = [];

      for (let i = 0; i < totalRequests; i++) {
        promises.push(
          supabase
            .from('leads')
            .select('id, created_at, estado, ultima_interaccion')
            .order('created_at', { ascending: false })
            .range(i * step, i * step + step - 1)
        );
      }

      const results = await Promise.all(promises);
      let allLeads = [];
      for (const res of results) {
        if (res.error) throw res.error;
        if (res.data) {
          allLeads = allLeads.concat(
            res.data.map((lead) => ({ ...lead, estado: normalizeLeadStatus(lead.estado) }))
          );
        }
      }

      setLeads(allLeads);
      setLoadedGroups((prev) => new Set([...prev, 'dashboard_leads']));
    } catch (err) {
      console.error('Error cargando leads para analytics', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function applyDateFilter(query) {
    if (dateFilter === 'ALL') return query;
    const bounds = getRangeBounds(dateFilter, customStartDate, customEndDate);
    if (!bounds) return query;
    return query
      .gte('ultima_interaccion', bounds.startIso)
      .lte('ultima_interaccion', bounds.endIso);
  }

  function buildLeadListQuery() {
    const selectClause = contentFilter !== 'ALL'
      ? 'id, usuario, estado, created_at, ultima_interaccion, setter, lead_contenidos!inner(contenido_id)'
      : 'id, usuario, estado, created_at, ultima_interaccion, setter';

    let query = supabase
      .from('leads')
      .select(selectClause, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (statusFilter !== 'ALL') {
      query = query.eq('estado', statusFilter);
    }

    if (debouncedSearchQuery) {
      query = query.ilike('usuario', `%${debouncedSearchQuery}%`);
    }

    if (contentFilter !== 'ALL') {
      query = query.eq('lead_contenidos.contenido_id', contentFilter);
    }

    return applyDateFilter(query);
  }

  async function fetchLeadList({ reset }) {
    try {
      setLeadListLoading(true);

      if (reset) {
        setLeadRows([]);
        setLeadListOffset(0);
        setLeadListHasMore(false);
      }

      const from = reset ? 0 : leadListOffset;
      const to = from + LEAD_PAGE_SIZE - 1;
      const query = buildLeadListQuery().range(from, to);
      const { data, count, error } = await query;

      if (error) throw error;

      const normalizedRows = (data || []).map((lead) => ({
        ...lead,
        estado: normalizeLeadStatus(lead.estado),
      }));

      await fetchLeadContentRelations(normalizedRows.map((lead) => lead.id), { reset });

      setLeadRows((prev) => (reset ? normalizedRows : [...prev, ...normalizedRows]));
      setLeadListCount(count || 0);
      setLeadListOffset(from + normalizedRows.length);
      setLeadListHasMore(from + normalizedRows.length < (count || 0));
      setLoadedGroups((prev) => new Set([...prev, 'leads']));
    } catch (err) {
      console.error('Error cargando la lista de leads', err);
    } finally {
      setLeadListLoading(false);
    }
  }

  async function fetchLeadDetail(leadId) {
    try {
      setSelectedLeadLoading(true);
      setSelectedLeadId(leadId);

      const { data, error } = await supabase
        .from('leads')
        .select('id, usuario, estado, created_at, ultima_interaccion, setter, contexto, link_conversacion, id_externo')
        .eq('id', leadId)
        .single();

      if (error) throw error;

      const { data: relationRows, error: relationError } = await supabase
        .from('lead_contenidos')
        .select('contenido_id')
        .eq('lead_id', leadId);
      if (relationError) throw relationError;
      const contentIds = Array.from(new Set((relationRows || []).map((row) => row.contenido_id).filter(Boolean)));

      setSelectedLeadDetail({
        ...data,
        estado: normalizeLeadStatus(data.estado),
        contentIds,
      });
    } catch (err) {
      console.error('Error cargando detalle del lead', err);
      setSelectedLeadDetail(null);
    } finally {
      setSelectedLeadLoading(false);
    }
  }

  async function handleStatusChange(leadId, newStatus) {
    const prevLead = leadRows.find((lead) => lead.id === leadId) || leads.find((lead) => lead.id === leadId);
    const prevStatus = normalizeLeadStatus(prevLead?.estado);

    setLeadRows((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, estado: newStatus } : lead)));
    setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, estado: newStatus } : lead)));
    setSelectedLeadDetail((prev) => (prev && prev.id === leadId ? { ...prev, estado: newStatus } : prev));

    const { error } = await supabase
      .from('leads')
      .update({ estado: newStatus })
      .eq('id', leadId);

    if (error) {
      console.error('Error updating status:', error);
      alert('Hubo un error al guardar el estado.');
      setLeadRows((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, estado: prevStatus } : lead)));
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? { ...lead, estado: prevStatus } : lead)));
      setSelectedLeadDetail((prev) => (prev && prev.id === leadId ? { ...prev, estado: prevStatus } : prev));
      return;
    }

    await supabase.from('lead_eventos').insert({
      lead_id: leadId,
      estado_anterior: prevStatus,
      estado_nuevo: newStatus,
    });
  }

  async function fetchAnalyticsGroup() {
    try {
      setTabLoading(true);
      const callsRes = await supabase.from('llamadas').select('*').order('fecha_llamada', { ascending: false });
      if (callsRes.error) throw callsRes.error;
      setLlamadas(callsRes.data || []);
      setLoadedGroups((prev) => new Set([...prev, 'analytics']));
    } catch (err) {
      console.error('Error cargando las llamadas', err);
    } finally {
      setTabLoading(false);
    }
  }

  async function fetchDirectoryGroup() {
    try {
      setTabLoading(true);
      const alumnosRes = await supabase.from('alumnos').select('*').order('fecha_inicio', { ascending: false });
      if (alumnosRes.error) throw alumnosRes.error;
      setAlumnos(alumnosRes.data || []);
      setLoadedGroups((prev) => new Set([...prev, 'directory']));
    } catch (err) {
      console.error('Error cargando alumnos', err);
    } finally {
      setTabLoading(false);
    }
  }

  async function fetchFinanceGroup() {
    try {
      setTabLoading(true);
      const toFetch = [];
      if (!loadedGroups.has('directory')) {
        toFetch.push(supabase.from('alumnos').select('*').order('fecha_inicio', { ascending: false }));
      }
      toFetch.push(supabase.from('cuotas').select('*').order('fecha_vencimiento', { ascending: true }));
      toFetch.push(supabase.from('ventas').select('*').order('fecha_venta', { ascending: false }));
      const results = await Promise.all(toFetch);
      const ventasRes = results.pop();
      const cuotasRes = results.pop();
      if (ventasRes.error) throw ventasRes.error;
      if (cuotasRes.error) throw cuotasRes.error;
      if (!loadedGroups.has('directory')) {
        const alumnosRes = results[0];
        if (alumnosRes.error) throw alumnosRes.error;
        setAlumnos(alumnosRes.data || []);
        setLoadedGroups((prev) => new Set([...prev, 'directory']));
      }
      setCuotas(cuotasRes.data || []);
      setVentas(ventasRes.data || []);
      setLoadedGroups((prev) => new Set([...prev, 'finance']));
    } catch (err) {
      console.error('Error cargando finanzas', err);
    } finally {
      setTabLoading(false);
    }
  }

  const handleViewChange = (view) => {
    setActiveView(view);
    setMenuOpen(false);

    if (view === 'DASHBOARD') {
      if (!loadedGroups.has('dashboard_leads')) fetchDashboardLeads();
      if (!loadedGroups.has('analytics')) fetchAnalyticsGroup();
    }

    if (view === 'LEADS' && !loadedGroups.has('leads')) {
      fetchLeadList({ reset: true });
    }

    if (view === 'CALLS' && !loadedGroups.has('analytics')) {
      fetchAnalyticsGroup();
    }

    if (view === 'DIRECTORY' && !loadedGroups.has('directory')) {
      fetchDirectoryGroup();
    }

    if (view === 'FINANCE' && !loadedGroups.has('finance')) {
      fetchFinanceGroup();
    }
  };

  const handleOpenContentLeads = (content) => {
    if (!content?.id) return;

    setSearchQuery('');
    setDebouncedSearchQuery('');
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setContentFilter(content.id);
    setSelectedLeadId(null);
    setSelectedLeadDetail(null);
    setActiveView('LEADS');
  };

  async function fetchData() {
    fetchContentCatalog();
    if (activeView === 'LEADS') fetchLeadList({ reset: true });
    if (loadedGroups.has('dashboard_leads')) fetchDashboardLeads();
    if (loadedGroups.has('analytics')) fetchAnalyticsGroup();
    if (loadedGroups.has('directory')) fetchDirectoryGroup();
    if (loadedGroups.has('finance')) fetchFinanceGroup();
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getBadgeClass = (status) => {
    const normalized = normalizeLeadStatus(status);
    if (normalized === 'agendado' || normalized === 'cerrado') return 'success';
    if (normalized === 'en_conversacion' || normalized === 'interesado') return 'warning';
    if (normalized === 'perdido') return 'danger';
    return 'info';
  };

  const resolveLeadContentIds = (lead) => {
    if (!lead) return [];
    if (Array.isArray(lead.contentIds) && lead.contentIds.length > 0) {
      return lead.contentIds.filter(Boolean);
    }
    return (leadContentMap[lead.id] || []).filter(Boolean);
  };

  const renderContentPiece = (lead) => {
    const contentIds = resolveLeadContentIds(lead);
    if (contentIds.length === 0) return '-';

    const nombres = contentIds
      .map((id) => getContentDisplayLabel(contenidos[id]))
      .filter((name) => name && name !== '-');

    if (nombres.length === 0) return '-';
    return Array.from(new Set(nombres)).join(', ');
  };

  const renderContentTags = (lead) => {
    const contentIds = resolveLeadContentIds(lead);
    if (contentIds.length === 0) {
      return <span style={{ color: 'var(--text-muted)' }}>Sin piezas relacionadas</span>;
    }

    const names = Array.from(
      new Set(
        contentIds
          .map((id) => getContentDisplayLabel(contenidos[id]))
          .filter((name) => name && name !== '-')
      )
    );

    if (names.length === 0) {
      return <span style={{ color: 'var(--text-muted)' }}>Sin piezas relacionadas</span>;
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {names.map((name) => (
          <span key={`${lead.id}-${name}`} className="chip">
            {name}
          </span>
        ))}
      </div>
    );
  };

  const leadListSummary = useMemo(() => {
    if (leadListCount === 0) return 'Sin leads para esos filtros.';
    return `Mostrando ${leadRows.length} de ${leadListCount} leads`;
  }, [leadRows.length, leadListCount]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <div className="topbar-brand">
          <span className="brand-mark">{INICIALES_NEGOCIO}</span>
          {NOMBRE_NEGOCIO}
        </div>
        <span className="topbar-spacer" />
        <button
          type="button"
          className="icon-btn"
          onClick={fetchData}
          aria-label="Actualizar datos"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      <div
        className={`drawer-overlay${menuOpen ? ' open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">{INICIALES_NEGOCIO}</span>
          <span>
            <span className="brand-name">{NOMBRE_NEGOCIO}</span>
            <span className="brand-sub">Cobranzas y comisiones</span>
          </span>
          <button
            type="button"
            className="icon-btn only-mobile"
            style={{ marginLeft: 'auto' }}
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <nav className="nav">
          <span className="nav-label">Operación</span>
          {NAV_ITEMS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`nav-item${activeView === key ? ' active' : ''}`}
              onClick={() => handleViewChange(key)}
            >
              <Icon size={17} className="nav-icon" />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer hide-mobile">{NOMBRE_NEGOCIO} · {new Date().getFullYear()}</div>
      </aside>

      <main className="main">
        <div className="page-header">
          <div>
            <h1 className="page-title">{(VIEW_META[activeView] || {}).title}</h1>
            <p className="page-subtitle">{(VIEW_META[activeView] || {}).subtitle}</p>
          </div>
          <button className="btn btn-inline hide-mobile" onClick={fetchData}>
            <RefreshCw size={15} />
            Actualizar datos
          </button>
        </div>

        {tabLoading && activeView !== 'LEADS' && (
          <div className="loading-state">
            <RefreshCw size={26} className="spinner" />
            <p>Cargando datos...</p>
          </div>
        )}

        {!tabLoading && activeView === 'DASHBOARD' && (
          analyticsLoading ? (
            <div className="loading-state">
              <RefreshCw size={26} className="spinner" />
              <p>Cargando dashboard...</p>
            </div>
          ) : (
            <AnalyticsDashboard leads={leads} llamadas={llamadas} />
          )
        )}

        {!tabLoading && activeView === 'CONTENT' && <ContentManager onViewLeads={handleOpenContentLeads} />}
        {!tabLoading && activeView === 'CALLS' && <BookingManager llamadas={llamadas} setLlamadas={setLlamadas} />}
        {!tabLoading && activeView === 'DIRECTORY' && <StudentDirectory alumnos={alumnos} setAlumnos={setAlumnos} />}

        {!tabLoading && activeView === 'FINANCE' && (
          <FinanceModule
            cuotas={cuotas}
            setCuotas={setCuotas}
            ventas={ventas}
            setVentas={setVentas}
            alumnos={alumnos}
            setAlumnos={setAlumnos}
          />
        )}

        {activeView === 'LEADS' && (
          <>
            <div className="panel toolbar" style={{ marginBottom: '18px' }}>
              <div className="search-wrap">
                <Search size={16} />
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Buscar por usuario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select className="glass-input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ width: 'auto', minWidth: '170px' }}>
                <option value="ALL">Cualquier fecha</option>
                <option value="TODAY">Hoy</option>
                <option value="YESTERDAY">Ayer</option>
                <option value="LAST_7">Últimos 7 días</option>
                <option value="LAST_30">Últimos 30 días</option>
                <option value="CUSTOM">Rango de fechas</option>
              </select>

              {dateFilter === 'CUSTOM' && (
                <>
                  <input type="date" className="glass-input" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} style={{ width: 'auto' }} />
                  <span style={{ color: 'var(--text-muted)' }}>a</span>
                  <input type="date" className="glass-input" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} style={{ width: 'auto' }} />
                </>
              )}

              <select className="glass-input" value={contentFilter} onChange={(e) => setContentFilter(e.target.value)} style={{ width: 'auto', minWidth: '170px' }}>
                <option value="ALL">Toda pieza de contenido</option>
                {contentOptions.map((content) => (
                  <option key={content.id} value={content.id}>
                    {getContentDisplayLabel(content)}
                  </option>
                ))}
              </select>

              <select className="glass-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto', minWidth: '170px' }}>
                <option value="ALL">Todos los estados</option>
                {LEAD_STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.87rem' }}>
              <Filter size={14} style={{ color: 'var(--text-muted)' }} />
              {leadListLoading ? 'Actualizando lista...' : leadListSummary}
            </div>

            <div className="split">
              <div className="panel panel-flush table-scroll">
                {leadListLoading && leadRows.length === 0 ? (
                  <div className="loading-state">
                    <RefreshCw size={26} className="spinner" />
                    <p>Cargando leads...</p>
                  </div>
                ) : (
                  <table className="glass-table-container">
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr>
                        <th>Usuario</th>
                        <th>Estado</th>
                        <th>Última interacción</th>
                        <th>Pieza de contenido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadRows.map((lead) => (
                        <tr key={lead.id} className={selectedLeadId === lead.id ? 'is-selected' : undefined}>
                          <td>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => fetchLeadDetail(lead.id)}
                              style={{
                                color: selectedLeadId === lead.id ? 'var(--accent)' : 'var(--text)',
                                fontWeight: 600,
                              }}
                            >
                              {lead.usuario || 'Sin usuario'}
                            </button>
                          </td>
                          <td data-label="Estado">
                            <select
                              value={normalizeLeadStatus(lead.estado)}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              className={`badge ${getBadgeClass(lead.estado)}`}
                            >
                              {LEAD_STATUS_OPTIONS.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td data-label="Últ. interacción" className="cell-muted">{formatDate(lead.ultima_interaccion)}</td>
                          <td data-label="Pieza" className="cell-muted" style={{ fontSize: '0.87rem' }}>{renderContentPiece(lead)}</td>
                        </tr>
                      ))}
                      {!leadListLoading && leadRows.length === 0 && (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
                            No se encontraron leads con esos filtros.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              <aside
                className={`panel split-side detail-panel${selectedLeadId || selectedLeadLoading ? ' is-open' : ''}`}
              >
                {!selectedLeadId && !selectedLeadLoading && (
                  <div className="empty-state">
                    <PanelRightOpen size={28} />
                    <div>
                      <div style={{ fontSize: '0.98rem', fontWeight: 650, color: 'var(--text)', marginBottom: '6px' }}>
                        Abre un lead
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.5, fontSize: '0.88rem' }}>
                        Toca el usuario para ver el detalle,
                        editar el estado y leer el contexto completo.
                      </p>
                    </div>
                  </div>
                )}

                {selectedLeadLoading && (
                  <div className="loading-state">
                    <RefreshCw size={24} className="spinner" />
                    <p>Cargando detalle del lead...</p>
                  </div>
                )}

                {selectedLeadDetail && !selectedLeadLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    <div style={{ paddingBottom: '18px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '10px' }}>
                        <UserRound size={16} color="var(--accent)" />
                        <span className="stat-label">Lead seleccionado</span>
                        <button
                          type="button"
                          className="icon-btn only-mobile"
                          style={{ marginLeft: 'auto' }}
                          onClick={() => { setSelectedLeadId(null); setSelectedLeadDetail(null); }}
                          aria-label="Cerrar detalle"
                        >
                          <CloseIcon size={18} />
                        </button>
                      </div>
                      <h2 style={{ margin: 0, fontSize: '1.4rem', lineHeight: 1.2 }}>{selectedLeadDetail.usuario || 'Sin usuario'}</h2>
                      {selectedLeadDetail.link_conversacion && (
                        <a href={selectedLeadDetail.link_conversacion} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.86rem' }}>
                          Abrir la conversación
                        </a>
                      )}
                    </div>

                    <div>
                      <label className="field-label">Estado</label>
                      <select
                        value={normalizeLeadStatus(selectedLeadDetail.estado)}
                        onChange={(e) => handleStatusChange(selectedLeadDetail.id, e.target.value)}
                        className="glass-input"
                      >
                        {LEAD_STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gap: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Clock3 size={16} color="var(--text-muted)" style={{ marginTop: '3px' }} />
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '3px' }}>Última interacción</div>
                          <div>{formatDate(selectedLeadDetail.ultima_interaccion)}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Calendar size={16} color="var(--text-muted)" style={{ marginTop: '3px' }} />
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '3px' }}>Fecha de entrada</div>
                          <div>{formatDate(selectedLeadDetail.created_at)}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Users size={16} color="var(--text-muted)" style={{ marginTop: '3px' }} />
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '3px' }}>Setter</div>
                          <div>{selectedLeadDetail.setter || 'Sin asignar'}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Tag size={16} color="var(--text-muted)" style={{ marginTop: '3px' }} />
                        <div style={{ width: '100%' }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '8px' }}>Piezas relacionadas</div>
                          {renderContentTags(selectedLeadDetail)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <MessageSquareText size={16} color="var(--text-muted)" />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Contexto de conversación</span>
                      </div>
                      <div
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius)',
                          padding: '14px',
                          fontSize: '0.88rem',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.55,
                          maxHeight: '240px',
                          overflowY: 'auto',
                        }}
                      >
                        {selectedLeadDetail.contexto || 'Sin contexto cargado todavía.'}
                      </div>
                    </div>

                    <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '4px' }}>ID en tu herramienta de mensajes</div>
                      <div style={{ wordBreak: 'break-all' }}>{selectedLeadDetail.id_externo || 'Sin ID'}</div>
                    </div>
                  </div>
                )}
              </aside>
            </div>

            {leadListHasMore && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                <button className="btn" onClick={() => fetchLeadList({ reset: false })} disabled={leadListLoading}>
                  {leadListLoading ? 'Cargando...' : 'Cargar más leads'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
