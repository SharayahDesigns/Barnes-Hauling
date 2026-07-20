delete from storage.buckets
where id = 'dumpster-images';

alter table public.dumpsters
  rename column image_path to image_url;
