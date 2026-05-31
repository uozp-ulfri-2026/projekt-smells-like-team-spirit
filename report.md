
# Poročilo 

## Povzetek:
Namen projekta je odkrivanje lokacije in tematske kategorije člankov MMC. Uporabljamo lokalno poganjano LLM storitev za ekstrakcijo strukturiranih oznak iz neurejenega besedila, rezultate pa primerjamo z ročno pripravljenim zlatim standardom (90 ročno označenih člankov). Cilj je ovrednotiti zanesljivost LLM pristopa pri kategorizaciji in geolokaciji ter identificirati pogoste napake in možnosti za izboljšave.

## 1. Uvod
- Namen: Odkrivanje pokritosti člankov po temah in lokaciji na mediju MMC. Analizirali bomo razporeditev tem in lokacij skozi čas in prikazali ugotovitve na interaktivnem zemljevidu, kar lahko pomaga pri uredniških odločitvah in nadaljnjih raziskavah.
- Podatki: izhodišče so obdelani MMC zapisi v mapi `public/` in ročno preverjeni zlatni standard v `mmc_llm_vs_mmc_lean_v6_evaluation.xlsx` (lista `Tjas`, `Tristan`, `Luka`).
- Metode: lokalnemu LLM modelu pošljemo novico z natančno oblikovanim promptom in ta vrne kombinacijo država-kraj in temo; dodatna orodja v repozitoriju združujejo, filtrirajo in pripevnajo LLM izhode.
- Prispevek tega poročila: jasno predstaviti pipeline, opisati uporabljene tehnike in metrike ter podrobno analizirati rezultate in napake na testni množici.

## 2. Podatki
- Vir: obdelani MMC zapisi (mapa `assets/cleaned` / `public`), posebna eval množica obstaja (pot potrditi).
- Zlate oznake: ročno pregledaih 90 naključih člankov - testna množica.

V podatkovnem sklopu zajemamo izvorne MMC članke, ki jih nato očistimo in normaliziramo — ohranimo le ključna polja in metapodatke, da zagotovimo relevantnost informacij ter zmanjšamo šum v kontekstu, saj morajo biti prečiščeni podatki nadalje analizirani z LLM modelom. Na očiščenih besedilih izvajamo avtomatsko ekstrakcijo strukturiranih oznak, kot so glavna tema, država in kraj. Hkrati pripravimo podatke za prikaz z izbranimi značilkami iz surovih podatkov ter jim pripnemo rezultate analize LLM modela. Natančnost ocenjevanja preverjamo na ročno pripravljeni evalvacijski množici, nato pa na podlagi agregiranih rezultatov pripravljamo vizualizacije in metrike za analizo poročanja skozi čas in po lokacijah. Takšen pristop zagotavlja reproducibilen potek od surovih podatkov do interpretabilnih vpogledov in uredniških zaključkov.

Ker smo pri izbiri LLM modela naredili kompromis glede njegove zmogljivosti, smo izgubili del člankov. Pogosto se je namreč zgodilo, da je model ustvaril nesmiselne kombinacije država–kraj. Posledično takšni članki niso prejeli veljavnega odziva pri klicu API-ja za pretvorbo kombinacij država–kraj v geografske koordinate, zato so bili izločeni iz končnega nabora podatkov. Z uporabo zmogljivejšega LLM modela bi ohranili več člankov, saj bi bile kombinacije država–kraj natančnejše in semantično bolj smiselne.


## 3. Metode
Verzija 1:
- Prva izvedba projekta je vključevala uporabo LLM za ekstrakcijo (`topic`, `country`, `city`) iz očiščenih MMC zapisov, takoj za tem pa vizualizacijo rezultatov v aplikaciji. Rezultati so bili tudi ovrednoteni na testni množici (ročno označeni primeri) za osnovno merjenje natančnosti.

Verzija 6 (trenutni pristop):
- `todo TJAS`

Opomba o odkrivanju znanja:
- Večina odkritij iz podatkov izhaja iz raziskovanja agregiranih izhodov preko vizualizacij (zemljevidi, časovne vrstice, tabele s pogostostmi). Vizualizacije pomagajo hitro identificirati vzorce, anomalije in prednostna področja za nadaljnjo analizo.

### Evalvacija LLM izhodov

## Primeri odkrivanja znanj iz vizualizacij

## Refleksija

## Zaključek

