# Allowed LLM Topics

This document lists the LLM topic keys recognized by the project (uppercase keys used as canonical identifiers).

- BREZ TEME
- DRUGO
- GOSPODARSTVO
- KULTURA
- NARAVNE NESRECE
- OKOLJE
- POLITIKA
- PROMETNE NESRECE
- SPORT
- TEHNOLOGIJA
- TURIZEM
- VOJNA IN KONFLIKTI
- KRIMINAL
- ZABAVA
- ZDRAVJE
- GASTRONOMIJA

Notes:
- Topics originate from [src/lib/topic-colors.ts](src/lib/topic-colors.ts) and are mapped/normalized when processing LLM output in [scripts/build-mainlocation-v2-public.ts](scripts/build-mainlocation-v2-public.ts).
- Unknown topics are given a fallback color and label by `getTopicStyle()` in [src/lib/topic-colors.ts](src/lib/topic-colors.ts).
