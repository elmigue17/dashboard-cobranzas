export const LEAD_STATUS_OPTIONS = [
  { value: 'frio', label: 'Frío' },
  { value: 'en_conversacion', label: 'En conversación' },
  { value: 'interesado', label: 'Interesado' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'perdido', label: 'Perdido' },
];

// Normaliza variantes de escritura ("En conversación", "en conversacion") al valor de la base.
export function normalizeLeadStatus(status) {
  if (status == null) return 'frio';

  const normalized = String(status)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');
  return normalized || 'frio';
}
