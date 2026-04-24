SET check_function_bodies = false;
CREATE TABLE public.incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip text NOT NULL,
    risk text NOT NULL,
    summary text NOT NULL,
    mitre_technique text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.ip_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.login_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    ip text NOT NULL,
    success boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_event_id_key UNIQUE (event_id);
ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ip_blocks
    ADD CONSTRAINT ip_blocks_ip_key UNIQUE (ip);
ALTER TABLE ONLY public.ip_blocks
    ADD CONSTRAINT ip_blocks_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.login_events
    ADD CONSTRAINT login_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.incidents
    ADD CONSTRAINT incidents_id_fkey FOREIGN KEY (id) REFERENCES public.login_events(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
