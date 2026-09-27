-- V2 proof: the creator's X post (tagging the brand) is part of the proof, next to the photos.
alter table public.proof_files add column if not exists x_url text;
