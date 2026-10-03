-- Bucket PRIVADO donde "Registrar pago" y la edición de cuota suben los comprobantes.
-- Los archivos no tienen link público: la app pide un link temporal cada vez que alguien con acceso
-- abre uno.

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do update set public = false;

create policy "comprobantes_leer"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'comprobantes' and (select public.tiene_acceso()));

create policy "comprobantes_subir"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'comprobantes' and (select public.tiene_acceso()));

create policy "comprobantes_actualizar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'comprobantes' and (select public.tiene_acceso()))
  with check (bucket_id = 'comprobantes' and (select public.tiene_acceso()));
