--
-- PostgreSQL database dump
--

\restrict gdRNlsmbAGkxK8hhLTFrQo7b8ly9f815bAPobsLpS4JAkkfO8ZD6ct0xpSKs80T

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

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
-- Data for Name: position_salaries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.position_salaries (id, position_code, position_name, total_salary, base_salary, bonus, effective_from, effective_to, created_at) FROM stdin;
1	stajyer	Stajyer	3300000	3100000	200000	2026-01-01	\N	2026-03-07 17:37:24.457621
2	bar_buddy	Bar Buddy	3600000	3100000	500000	2026-01-01	\N	2026-03-07 17:37:24.457621
3	barista	Barista	4100000	3100000	1000000	2026-01-01	\N	2026-03-07 17:37:24.457621
4	supervisor_buddy	Supervisor Buddy	4500000	3100000	1400000	2026-01-01	\N	2026-03-07 17:37:24.457621
5	supervisor	Supervisor	4900000	3100000	1800000	2026-01-01	\N	2026-03-07 17:37:24.457621
6	mudur	Müdür	5500000	3500000	2000000	2026-01-01	\N	2026-03-09 10:02:11.32769
7	fabrika_operator	Fabrika Operatör	4000000	3100000	900000	2026-01-01	\N	2026-03-09 10:02:11.334847
8	fabrika_mudur	Fabrika Müdür	5800000	3800000	2000000	2026-01-01	\N	2026-03-09 10:02:11.340609
9	muhasebe_ik	Muhasebe & İK	5200000	3500000	1700000	2026-01-01	\N	2026-03-09 10:02:11.345992
10	satinalma	Satın Alma	5000000	3500000	1500000	2026-01-01	\N	2026-03-09 10:02:11.352402
11	marketing	Pazarlama	5000000	3500000	1500000	2026-01-01	\N	2026-03-09 10:02:11.357711
12	kalite_kontrol	Kalite Kontrol	5000000	3500000	1500000	2026-01-01	\N	2026-03-09 10:02:11.36391
13	gida_muhendisi	Gıda Mühendisi	5800000	4000000	1800000	2026-01-01	\N	2026-03-09 10:02:11.369472
14	trainer	Eğitmen	5000000	3500000	1500000	2026-01-01	\N	2026-03-09 10:02:11.375252
15	coach	Koç	5500000	3800000	1700000	2026-01-01	\N	2026-03-09 10:02:11.380609
16	cgo	CGO	8000000	5000000	3000000	2026-01-01	\N	2026-03-09 10:02:11.38605
17	ceo	CEO	10000000	6000000	4000000	2026-01-01	\N	2026-03-09 10:02:11.391268
18	admin	Sistem Yöneticisi	6000000	4000000	2000000	2026-01-01	\N	2026-03-09 10:02:11.397471
19	yatirimci_branch	Yatırımcı (Şube)	0	0	0	2026-01-01	\N	2026-03-09 10:02:11.402918
\.


--
-- Name: position_salaries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.position_salaries_id_seq', 19, true);


--
-- PostgreSQL database dump complete
--

\unrestrict gdRNlsmbAGkxK8hhLTFrQo7b8ly9f815bAPobsLpS4JAkkfO8ZD6ct0xpSKs80T

