import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { traerTodo } from '../traerTodo';
import { Plus, Search, Trash2, Calendar, Link as LinkIcon, Film, Database } from 'lucide-react';
import {
  buildDescriptiveContentName,
  getContentDisplayLabel,
  normalizeContentOriginKey,
} from '../contentSystem';

const ContentManager = ({ onViewLeads }) => {
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [nombre, setNombre] = useState('');
  const [cod, setCod] = useState('');
  const [fecha, setFecha] = useState('');
  const [link, setLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedOriginPreview = normalizeContentOriginKey(cod);
  const descriptiveNamePreview = buildDescriptiveContentName(nombre, cod, fecha);

  useEffect(() => {
    fetchContents();
  }, []);

  const fetchContents = async () => {
    try {
      setLoading(true);

      const [rows, relations] = await Promise.all([
        traerTodo('contenidos', { columnas: 'id, nombre, fecha, link', orden: 'fecha', ascendente: false }),
        traerTodo('lead_contenidos', { columnas: 'contenido_id', desempate: ['lead_id', 'contenido_id'] }),
      ]);

      const relationCounts = (relations || []).reduce((acc, row) => {
        if (!row?.contenido_id) return acc;
        acc[row.contenido_id] = (acc[row.contenido_id] || 0) + 1;
        return acc;
      }, {});

      const normalizedRows = rows.map((item) => ({
        ...item,
        nombre: buildDescriptiveContentName(item.nombre, item.id, item.fecha),
        business_id: item.id,
        relatedLeadCount: relationCounts[item.id] ?? 0,
      }));

      setContents(normalizedRows);
    } catch (err) {
      console.error('Error cargando el contenido', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!cod || !fecha) {
      alert('Codigo y fecha son obligatorios.');
      return;
    }

    const normalizedName = buildDescriptiveContentName(nombre, cod, fecha);
    const originKey = normalizeContentOriginKey(cod);

    if (!originKey) {
      alert('El codigo/origen no tiene un formato valido.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        id: originKey,
        nombre: normalizedName,
        fecha,
        link: link || null,
      };

      const { error } = await supabase.from('contenidos').insert([payload]);
      if (error) throw error;

      setNombre('');
      setCod('');
      setFecha('');
      setLink('');
      await fetchContents();
      alert('Pieza de contenido creada con exito.');
    } catch (err) {
      console.error('Error creando la pieza', err);
      alert(`Hubo un error al crear la pieza: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Seguro que quieres eliminar esta pieza?')) return;

    try {
      setLoading(true);

      // Las relaciones con leads (lead_contenidos) se borran solas en cascada.
      const { error } = await supabase.from('contenidos').delete().eq('id', id);
      if (error) throw error;

      setContents((prev) => prev.filter((content) => content.id !== id));
    } catch (err) {
      console.error('Error borrando la pieza', err);
      alert(`No se pudo eliminar la pieza: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredContents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contents;

    return contents.filter((content) => {
      const searchable = [
        content.nombre,
        content.business_id,
        content.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [contents, searchQuery]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';

    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(dateString));
  };

  return (
    <div className="split-alt">
      <div className="panel" style={{ height: 'fit-content' }}>
        <h2 className="section-title">
          <Plus size={15} />
          Nueva pieza
        </h2>

          <form
            onSubmit={handleCreate}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <label className="field-label">Nombre base</label>
              <input
                type="text"
                className="glass-input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. 3 errores al empezar"
              />
            </div>

            <div>
              <label className="field-label">ID de pieza / origen payload *</label>
              <input
                type="text"
                className="glass-input"
                value={cod}
                onChange={(e) => setCod(e.target.value)}
                placeholder="Ej. C_21_04 o NEW_FOLLOW"
                required
              />
              <div style={{ marginTop: '7px', color: 'var(--text-muted)', fontSize: '0.79rem', lineHeight: 1.5 }}>
                Usa el mismo código que manda tu herramienta de mensajes cuando entra un lead:
                {' '}<code>C_21_04</code>, <code>R_19_04</code>, <code>H_10_03</code>, <code>NEW_FOLLOW</code>.
              </div>
            </div>

            <div>
              <label className="field-label">Fecha de la pieza *</label>
              <input
                type="date"
                className="glass-input"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="field-label">Link (opcional)</label>
              <input
                type="url"
                className="glass-input"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://instagram.com/reel/..."
              />
            </div>

            <div className="note">
              <div className="note-title">Vista previa</div>
              <div style={{ color: 'var(--text-secondary)' }}>Nombre: {descriptiveNamePreview || '-'}</div>
              <div style={{ color: 'var(--text-secondary)' }}>ID guardado: {normalizedOriginPreview || '-'}</div>
            </div>

            <button type="submit" className="btn-primary btn-block" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Añadir al sistema'}
            </button>
          </form>
        </div>

        <div className="panel panel-flush">
          <div className="panel-header">
            <div>
              <h2 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Film size={17} style={{ color: 'var(--text-muted)' }} />
                Inventario de contenido
              </h2>
              <div style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 400 }}>
                Cada pieza con la cantidad de leads que trajo.
              </div>
            </div>

            <div className="search-wrap" style={{ maxWidth: '280px' }}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por ID o nombre..."
                className="glass-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-scroll">
            {loading && contents.length === 0 ? (
              <div className="loading-state">
                <p>Cargando inventario...</p>
              </div>
            ) : (
              <table className="glass-table-container">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th>Pieza</th>
                    <th>Fecha</th>
                    <th>ID pieza</th>
                    <th>Leads</th>
                    <th>Link</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContents.map((content) => (
                    <tr key={content.id}>
                      <td>{getContentDisplayLabel(content)}</td>
                      <td data-label="Fecha" className="cell-muted">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={14} />
                          {formatDate(content.fecha)}
                        </span>
                      </td>
                      <td data-label="ID">
                        <span className="code-chip">
                          {content.business_id || content.id || '-'}
                        </span>
                      </td>
                      <td data-label="Leads">
                        <button
                          type="button"
                          onClick={() => onViewLeads?.(content)}
                          className="btn btn-inline"
                          style={{ minHeight: '34px', padding: '5px 12px', fontWeight: 650 }}
                          title="Ver leads relacionados"
                        >
                          <Database size={14} style={{ color: 'var(--text-muted)' }} />
                          {content.relatedLeadCount}
                        </button>
                      </td>
                      <td data-label="Link">
                        {content.link ? (
                          <a
                            href={content.link}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--text-secondary)', display: 'inline-flex' }}
                            title="Ver pieza"
                          >
                            <LinkIcon size={16} />
                          </a>
                        ) : '-'}
                      </td>
                      <td data-label="Acciones" style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDelete(content.id)}
                          className="icon-btn"
                          style={{ width: 34, height: 34, color: 'var(--negative)' }}
                          title="Eliminar pieza"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredContents.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--text-muted)' }}>
                        No hay piezas para esta búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
    </div>
  );
};

export default ContentManager;
