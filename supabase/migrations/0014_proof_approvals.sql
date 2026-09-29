-- Brands can approve a proof for their patch; once every holder has answered, payment doesn't wait for the review window.
alter table public.milestones add column if not exists approved_mask int not null default 0;
