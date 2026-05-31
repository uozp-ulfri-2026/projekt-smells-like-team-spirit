# Kratka predstavitev projekta

**Povzetek:** Kratek opis aplikacije in problema: ekstrakcija glavnega tematskega razreda ter lokacije (država/kraj) iz slovenskih MMC novic z uporabo LLM.

**1. Uvod**
- Namen: avtomatska kategorizacija in geolokacija novičnih zapisov za analizo poročanja.
- Kratek opis aplikacije (frontend + pipeline za obdelavo člankov in LLM ekstrakcijo).

**2. Podatki**
- Vir: obdelani MMC zapisi (mapa `assets/cleaned` / `public`), posebna eval množica obstaja (pot potrditi).
- Zlate oznake: imamo za 90 člankov (uporabiti za eval).
- Predobrdelava: rezanje besedila, združevanje polj (`title`, `lead`, `paragraphs`, `keywords`), omejitev dolžine vhodnega konteksta.

**3. Metode**
- Model: LLM klican preko lokalnega LM Studio (`gemma-4` v `extractor.ts`).
- Prompting: sistemski in uporabniški prompt z navodili, nizka temperatura (`temperature=0.1`).
- Odločitev: zakaj LLM in zakaj prompt (manj potrebe po ročnem označevanju, enotna ekstrakcija več polj).

**4. Eksperimenti in merjenje (evaluacija)**
- Metrične meritve (predlagano):
	- **Topic accuracy** (delež pravilno predvidenih tem)
	- **Exact-match country** (pravilno prepoznana država)
	- **Exact-match city** (pravilno prepoznan kraj)
	- **Macro / micro F1** za večrazredno klasifikacijo (topic)
	- **Confusion matrix** za topic
	- **Čas izvršitve** (povprečno na članek)
- Uporaba: izračunati na eval množici 90 zlatih oznak.

**5. Rezultati (osnutek sekcije)**
- Kratek povzetek ključnih številk (accuracy, F1, exact-match).
- Tabela z rezultati po kategorijah (če je smiselno).
- Primeri: 3 primeri pravilnih ekstrakcij, 3 primeri napak (FP/FN) z razlago.

**6. Analiza napak**
- Razvrstitev pogostih napak (npr. nepravilna tema, napačna država, invented place).
- Možni vzroki (nejasen kontekst, prekratki izvlečki, napake v promptu).

**7. Razprava in omejitve**
- Omejitve LLM (hallucination, občutljivost na prompt), omejitve eval množice (samo 90 primerov).
- Etika in zanesljivost pri avtomatskem označevanju lokacij.

**8. Zaključek in nadaljnje delo**
- Povzetek dosežkov.
- Predlogi: izboljšave prompta, več označenih podatkov, post-processing (geokodiranje in validacija).

**Priloge**
- Navodila za reproduciranje: ukazi za `extractor.ts` in pot do output datotek.
- Zaslonski posnetki aplikacije in konzole ter primeri input/output.

---

Predlog za število slide-ov v PDF: 8 (Naslov, Uvod, Podatki, Metode, Evaluacija/Metode merjenja, Rezultati, Analiza napak, Zaključek + Kontakt)

Prazna mesta/oznake za dopolnitev: `EVAL_DATASET_PATH`, `GOLD_LABELS_PATH`, glavne številke rezultatov (accuracy, F1, exact-match).

