-- Bucket donde "Registrar pago" y la edición de cuota suben los comprobantes.

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', true)
on conflict (id) do update set public = true;

create policy "comprobantes_leer"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'comprobantes');

create policy "comprobantes_subir"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'comprobantes');

create policy "comprobantes_actualizar"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'comprobantes')
  with check (bucket_id = 'comprobantes');
