--
-- PostgreSQL database dump
--

\restrict l99EYfVLxeS7dkPevBoolBWSD2lLUElYBVuj9QyIHtpbZiCYss2uYn6TLBvGVVM

-- Dumped from database version 16.11 (Debian 16.11-1.pgdg13+1)
-- Dumped by pg_dump version 16.11 (Debian 16.11-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DifficultyLevel; Type: TYPE; Schema: public; Owner: trailhub
--

CREATE TYPE public."DifficultyLevel" AS ENUM (
    'EASY',
    'MODERATE',
    'HARD'
);


ALTER TYPE public."DifficultyLevel" OWNER TO trailhub;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Booking; Type: TABLE; Schema: public; Owner: trailhub
--

CREATE TABLE public."Booking" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "hikeId" text NOT NULL,
    status text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Booking" OWNER TO trailhub;

--
-- Name: Guide; Type: TABLE; Schema: public; Owner: trailhub
--

CREATE TABLE public."Guide" (
    id text NOT NULL,
    "userId" text NOT NULL,
    bio text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "photoUrl" text,
    "displayName" text,
    languages text[],
    "yearsExperience" integer,
    "isVerified" boolean DEFAULT false NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "verifiedBy" text,
    "profileSlug" text,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    location text
);


ALTER TABLE public."Guide" OWNER TO trailhub;

--
-- Name: Hike; Type: TABLE; Schema: public; Owner: trailhub
--

CREATE TABLE public."Hike" (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    price integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "guideId" text NOT NULL,
    capacity integer,
    date timestamp(3) without time zone,
    location text,
    "coverUrl" text,
    distance text,
    duration text,
    "meetingTime" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    difficulty public."DifficultyLevel" NOT NULL,
    "elevationGain" text,
    "meetingPlace" text,
    "routePath" text,
    "whatToBring" text
);


ALTER TABLE public."Hike" OWNER TO trailhub;

--
-- Name: HikerProfile; Type: TABLE; Schema: public; Owner: trailhub
--

CREATE TABLE public."HikerProfile" (
    id text NOT NULL,
    "userId" text NOT NULL,
    bio text,
    "displayName" text,
    interests text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    location text,
    "emergencyContact" text,
    "fitnessLevel" text,
    "medicalInfo" text,
    "photoUrl" text,
    "preferredDifficulty" text[]
);


ALTER TABLE public."HikerProfile" OWNER TO trailhub;

--
-- Name: Review; Type: TABLE; Schema: public; Owner: trailhub
--

CREATE TABLE public."Review" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "guideId" text NOT NULL,
    rating integer NOT NULL,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "hikeId" text NOT NULL,
    tags text[]
);


ALTER TABLE public."Review" OWNER TO trailhub;

--
-- Name: User; Type: TABLE; Schema: public; Owner: trailhub
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    name text,
    role text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "firebaseUid" text
);


ALTER TABLE public."User" OWNER TO trailhub;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: trailhub
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO trailhub;

--
-- Data for Name: Booking; Type: TABLE DATA; Schema: public; Owner: trailhub
--

COPY public."Booking" (id, "userId", "hikeId", status, "createdAt") FROM stdin;
\.


--
-- Data for Name: Guide; Type: TABLE DATA; Schema: public; Owner: trailhub
--

COPY public."Guide" (id, "userId", bio, "createdAt", "photoUrl", "displayName", languages, "yearsExperience", "isVerified", "verifiedAt", "verifiedBy", "profileSlug", "isFeatured", "updatedAt", location) FROM stdin;
dbaf5d17-d2a9-4ba1-bd70-aa9bc4dbee26	3221aec0-6eb7-49a5-b074-3259ddfa6bdc	\N	2025-12-21 20:08:20.601	\N	TT	\N	\N	f	\N	\N	\N	f	2025-12-21 20:08:20.601	\N
\.


--
-- Data for Name: Hike; Type: TABLE DATA; Schema: public; Owner: trailhub
--

COPY public."Hike" (id, title, description, price, "createdAt", "guideId", capacity, date, location, "coverUrl", distance, duration, "meetingTime", "updatedAt", difficulty, "elevationGain", "meetingPlace", "routePath", "whatToBring") FROM stdin;
\.


--
-- Data for Name: HikerProfile; Type: TABLE DATA; Schema: public; Owner: trailhub
--

COPY public."HikerProfile" (id, "userId", bio, "displayName", interests, "createdAt", "updatedAt", location, "emergencyContact", "fitnessLevel", "medicalInfo", "photoUrl", "preferredDifficulty") FROM stdin;
\.


--
-- Data for Name: Review; Type: TABLE DATA; Schema: public; Owner: trailhub
--

COPY public."Review" (id, "userId", "guideId", rating, comment, "createdAt", "hikeId", tags) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: trailhub
--

COPY public."User" (id, email, name, role, "createdAt", "firebaseUid") FROM stdin;
3f7ee0aa-781d-4898-8da1-08d6bdf24241	demo@local	Demo User	user	2025-12-21 20:08:20.587	\N
3221aec0-6eb7-49a5-b074-3259ddfa6bdc	we@gmail.com	TT	guide	2025-12-21 20:08:20.572	9SqJ1rbu0qODpWtKIsQ4DUSHaBu1
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: trailhub
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
9c199dd2-d78a-4961-9906-ffbe4c1530e1	2f4eecbad2e62429a514af8a6a4cb12ce534ede8e54931d720b5b69db3739980	2025-12-21 20:03:54.931923+00	20251117155417_init	\N	\N	2025-12-21 20:03:54.864366+00	1
f7ffd26c-881f-4964-a05e-570a87d18152	0ae248c9b55a0a5d906a892bf867a86123b2b77f78b2ec2b54c985759bf3142c	2025-12-21 20:03:54.94374+00	20251118005655_add_missing_fields	\N	\N	2025-12-21 20:03:54.935248+00	1
1420d7cc-d50c-45eb-841c-487c3de83e77	f1e9e01cb4e48985886501b18dde15a56e59b8643e4310edb07d21470b97cf29	2025-12-21 20:03:54.958206+00	20251119000000_add_firebase_uid	\N	\N	2025-12-21 20:03:54.946166+00	1
8a46ab74-5f23-453e-991f-ccd4d2fd3701	187be9aff1cfdf15ffbc482df977d4f56e2619623df5c812d8ecf3aad1035f55	2025-12-21 20:03:54.969995+00	20251123170212_add_firebase_uid	\N	\N	2025-12-21 20:03:54.961664+00	1
03955fec-0ae2-482e-a987-15f64b11f3ec	6ff43f9ff6fb458a4366f96be7be5a209b3fa6d14b544772ea7607ffdcdd7322	2025-12-21 20:03:54.991859+00	20251123172042_add_hiker_profile_and_expand_guide	\N	\N	2025-12-21 20:03:54.971567+00	1
93d99815-41f2-4686-89d5-cb71d61bb072	75ff5682ec32edb77711de47a801e628443049a2915e0945b69d372f6117295d	2025-12-21 20:03:55.002579+00	20251124000000_add_location_to_hiker_profile	\N	\N	2025-12-21 20:03:54.994321+00	1
29ad92ba-719f-41b6-8c3b-bb1378d3f478	601687856b8eb395550eddb54ab49659beb9a5bc236f7719c1d7d0c74aa17704	2025-12-21 20:03:55.013181+00	20251128224726_add_hike_distance	\N	\N	2025-12-21 20:03:55.004553+00	1
61e14f9a-a847-4294-a583-0d6022c4a7b3	f179defaefe099a113ce4d6c15ab9983670cf333f0b384917f40ce5a482ded3b	2025-12-21 20:03:55.024812+00	20251129184529_tako	\N	\N	2025-12-21 20:03:55.014855+00	1
08217dbe-c9be-46d6-88f5-38fc267f5c22	704d4656b811a77a43902e7781a184504108ff782e3c9cbd0fbfc9cac905c737	2025-12-21 20:03:55.036503+00	20251129190307_me	\N	\N	2025-12-21 20:03:55.02648+00	1
44a7f302-1a23-46d0-9d05-50100734cd47	dc6c847be5877d3588c84dad302df090c69f314863e2b2e817219848a60a97dd	2025-12-21 20:03:55.051905+00	20251215205336_add_hike_route	\N	\N	2025-12-21 20:03:55.039539+00	1
\.


--
-- Name: Booking Booking_pkey; Type: CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_pkey" PRIMARY KEY (id);


--
-- Name: Guide Guide_pkey; Type: CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Guide"
    ADD CONSTRAINT "Guide_pkey" PRIMARY KEY (id);


--
-- Name: Hike Hike_pkey; Type: CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Hike"
    ADD CONSTRAINT "Hike_pkey" PRIMARY KEY (id);


--
-- Name: HikerProfile HikerProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."HikerProfile"
    ADD CONSTRAINT "HikerProfile_pkey" PRIMARY KEY (id);


--
-- Name: Review Review_pkey; Type: CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Guide_userId_key; Type: INDEX; Schema: public; Owner: trailhub
--

CREATE UNIQUE INDEX "Guide_userId_key" ON public."Guide" USING btree ("userId");


--
-- Name: HikerProfile_userId_key; Type: INDEX; Schema: public; Owner: trailhub
--

CREATE UNIQUE INDEX "HikerProfile_userId_key" ON public."HikerProfile" USING btree ("userId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: trailhub
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_firebaseUid_key; Type: INDEX; Schema: public; Owner: trailhub
--

CREATE UNIQUE INDEX "User_firebaseUid_key" ON public."User" USING btree ("firebaseUid");


--
-- Name: Booking Booking_hikeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES public."Hike"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Booking Booking_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Booking"
    ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Guide Guide_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Guide"
    ADD CONSTRAINT "Guide_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Hike Hike_guideId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Hike"
    ADD CONSTRAINT "Hike_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES public."Guide"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HikerProfile HikerProfile_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."HikerProfile"
    ADD CONSTRAINT "HikerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_guideId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES public."Guide"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_hikeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_hikeId_fkey" FOREIGN KEY ("hikeId") REFERENCES public."Hike"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Review Review_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: trailhub
--

ALTER TABLE ONLY public."Review"
    ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict l99EYfVLxeS7dkPevBoolBWSD2lLUElYBVuj9QyIHtpbZiCYss2uYn6TLBvGVVM

