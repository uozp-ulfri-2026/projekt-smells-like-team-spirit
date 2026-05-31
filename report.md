# Poročilo

## Povzetek:

Namen projekta je odkrivanje lokacije in tematske kategorije člankov MMC. Uporabljamo lokalno poganjano LLM storitev za ekstrakcijo strukturiranih oznak iz neurejenega besedila, rezultate pa primerjamo z ročno pripravljenim zlatim standardom (90 ročno označenih člankov). Poleg glavnih tem smo uvedli tudi podteme, ki omogočajo podrobnejši vpogled v vsebinsko sestavo posamezne kategorije. Cilj je razumeti, kako je pozornost novic razširjena preko držav in časa. O čem MMC govori, kako intenzivno in iz katerih vsebinskih podskupin je posamezna tema sestavljena?

## 1. Uvod

- Namen: Odkrivanje pokritosti člankov po temah, podtemah in lokaciji na mediju MMC. Analizirali bomo razporeditev tem in lokacij skozi čas in prikazali ugotovitve na interaktivnem zemljevidu, kar lahko pomaga pri uredniških odločitvah in nadaljnjih raziskavah.
- Metode: lokalnemu LLM modelu pošljemo novico z natančno oblikovanim promptom in ta vrne kombinacijo država-kraj, temo in podtemo; dodatna orodja v repozitoriju združujejo, filtrirajo in pripenjajo LLM-izhode. Za starejše že obdelane zapise, ki še nimajo shranjene podteme, aplikacija uporabi nadzorovana pravila na podlagi naslova in uvoda članka.
- Prispevek tega poročila: jasno predstaviti pipeline, opisati uporabljene tehnike in metrike ter podrobno analizirati rezultate in napake na testni množici.

## 2. Podatki

- Vir: obdelani MMC zapisi (mapa `assets/cleaned` / `public`), posebna eval množica obstaja (pot potrditi).

V podatkovnem sklopu zajemamo izvorne MMC članke, ki jih nato očistimo in normaliziramo — ohranimo le ključna polja in metapodatke, da zagotovimo relevantnost informacij ter zmanjšamo šum v kontekstu, saj morajo biti prečiščeni podatki nadalje analizirani z LLM modelom. Na očiščenih besedilih izvajamo avtomatsko ekstrakcijo strukturiranih oznak, kot so glavna tema, podtema, država in kraj. Hkrati pripravimo podatke za prikaz z izbranimi značilkami iz surovih podatkov ter jim pripnemo rezultate analize LLM modela. Natančnost ocenjevanja preverjamo na ročno pripravljeni evalvacijski množici, nato pa na podlagi agregiranih rezultatov pripravljamo vizualizacije in metrike za analizo poročanja skozi čas in po lokacijah. Takšen pristop zagotavlja reproducibilen potek od surovih podatkov do interpretabilnih vpogledov in uredniških zaključkov.

Javni podatkovni zapis članka je razširjen s poljem `llm-subtopic`. Ker že obdelani arhiv tega polja še ne vsebuje, je v aplikaciji dodan prehodni deterministični klasifikator. Ta normalizira naslov in uvod članka, nato pa znotraj že določene glavne teme preveri nadzorovan seznam ključnih besed. Članek lahko na primer znotraj teme `Nesreče in incidenti` uvrsti med prometne nesreče, delovne nesreče, tehnične okvare, eksplozije, reševanje ali nesreče v naravi. Če ni dovolj jasnega zadetka, dobi podtemo `Ostalo`.

Odkrit je bil tudi bias v podatkih - pred letom 2021 je zajetih bistveno manj člankov v vsakem mesecu, kot kasneje. Kako to vpliva na naše rezultate ni jasno, saj profesor ni omenil če so bili pred letom 2022 zajeti le določeni članki, in po kakšnem kriteriju so prišli v izbor.

## 3. Metode

Verzija 1:

- Prva izvedba projekta je vključevala uporabo LLM za ekstrakcijo (`topic`, `country`, `city`) iz očiščenih MMC zapisov. V promptu smo podali modelu seznam dovoljenih tem, s katerimi lahko označi članek. Potem je že sledila vizualizacija rezultatov v aplikaciji. Rezultati so bili tudi ovrednoteni na testni množici (ročno označeni primeri) za osnovno merjenje natančnosti.

Verzija 6 (trenutni pristop):

- V verziji 6 smo LLM nadomestili s kombinacijo slovarja krajev, točkovanja kandidatov in pravil. Slovar vsebuje mesta iz zbirke GeoNames, obstoječih koordinat ter ročno pripravljenih podatkov. Upošteva tudi nekatere slovenske sklanjatve imen krajev, na primer `Denver`, `Denverju` in `Denverjem`.

- Sistem pregleda naslov, povzetek, ključne besede, opise slik, URL in odstavke članka. Posamezna polja imajo različne uteži: omemba kraja v naslovu ali povzetku je pomembnejša od omembe v običajnem odstavku. Kandidati dobijo dodatne točke, če se v članku pojavi tudi država ali če je kraj naveden v lokacijskem kontekstu, na primer za besedami `v`, `na`, `iz` ali `pri`.

- Če je več krajev ocenjenih podobno, sistem označi rezultat kot dvoumen in zahteva močnejše dokaze. Če zanesljivega kraja ni mogoče določiti, uporabi previdne rezervne strategije. Med njimi so šibkejši, vendar še vedno podprti kandidati in porazdelitev člankov med že znane kraje znotraj države. Takšni približni rezultati imajo nižjo stopnjo zaupanja.

- Tematske kategorije določimo ločeno s pomočjo izvorne kategorije članka in uteženih ključnih besed. Končni podatki se izvozijo v obliki JSON in GeoJSON, ki ju uporablja spletna aplikacija.

### 3.1 Razširitev s podtemami

Za podrobnejšo analizo smo hierarhični podatkovni model razširili z oznako `subtopic`. Glavna tema ostaja širša kategorija članka, podtema pa opiše konkretnejši tip dogodka. Pri temi `Naravne nesreče` so podteme na primer poplave, požari, potresi, neurja, suše in plazovi. Pri temi `Nesreče in incidenti` ločujemo med prometnimi nesrečami, delovnimi nesrečami, tehničnimi okvarami, eksplozijami, reševanjem in nesrečami v naravi.

Uporabljamo dva načina določanja podtem:

1. Ekstraktor za nove članke od LLM-modela zahteva polje `subtopic`. Model mora izbrati natanko eno vrednost iz nadzorovanega seznama dovoljenih podtem in ne sme ustvarjati novih poljubnih oznak.
2. Za obstoječi arhiv brez polja `llm-subtopic` aplikacija uporabi prehodni deterministični klasifikator. Ta preišče najprej naslov, nato še kombinacijo naslova in uvoda. Ključne besede preverja samo znotraj že izbrane glavne teme in samo na začetku besede, da zmanjša lažno pozitivne zadetke. Tak pristop na primer prepreči, da bi beseda `Gorišnica` zaradi podniza `gori` članek napačno uvrstila med požare.

Taksonomija je namenoma nadzorovana in razložljiva. Uporabnik lahko v aplikaciji podteme vključi ali izključi v nastavitvah. Ko izbere glavno temo, lahko dodatno filtrira podteme. Statistika v levem stolpcu pri pogledu vseh tem kaže deleže glavnih tem, pri izbrani temi pa jo nadomesti statistika pripadajočih podtem. Statistika se prilagodi trenutnemu časovnemu obdobju in obsegu pogleda: celotnemu svetu ali izbrani državi.

Opomba o odkrivanju znanja:

- Večina odkritij iz podatkov izhaja iz raziskovanja agregiranih izhodov preko vizualizacij (zemljevidi, časovne vrstice, tabele s pogostostmi). Vizualizacije pomagajo hitro identificirati vzorce, anomalije ipd.

## 4. Evalvacija LLM izhodov

Za evalvacijo LLM izhodov smo uporabili ročno označeno eval množico (n = 90). Osredotočili smo se na tri metrične kazalnike: exact-match za `topic`, exact-match za `country` in exact-match za `city` (city vrednotimo neodvisno od pravilne države).

### 4.1 Verzija 1 (V1)

- Topic (exact-match): 0.93
- City (exact-match): 0.94
- Country (exact-match): 0.84

### 4.2 Verzija 6 (V6)

- Topic (exact-match): 0.74
- City (exact-match): 0.70
- Country (exact-match): 0.76

### Opombe

- Za per class metrike nismo označili dovolj člankov, kajti imamo zelo veliko tem in bi bile vrednosti teh metrik nezanesljive.
- Trenutna ročno označena evalvacijska množica ne vsebuje zlatega standarda za podteme. Natančnost oznak `subtopic` zato še ni vključena v navedene exact-match metrike. Pred uporabo podtem za strožje kvantitativne zaključke bi bilo treba pripraviti dodatno ročno označeno evalvacijsko množico.

### Primerjava in interpretacija

Verzija 1 z uporabo LLM dosega dosti višjo natančnost, saj lahko model bolje razume širši pomen članka in presodi, kateri kraj je za zgodbo dejansko najpomembnejši. Verzija 6 uporablja hitrejši in bolj ponovljiv pristop, vendar temelji predvsem na prisotnosti imen krajev, uteženih poljih in kontekstnih pravilih. Zato težje loči med glavnim krajem dogodka in krajem, ki je v članku omenjen le posredno.

Prednost verzije 6 je večja pokritost podatkov. Pri verziji 1 smo zaradi manjkajočih ali neveljavnih kombinacij država-kraj izgubili približno polovico člankov, medtem ko jih pri verziji 6 izgubimo le približno 15 %. Del dodatne pokritosti dobimo z rezervnimi strategijami, kar pojasni nižji exact-match pri mestih.



Za naš namen je LLM načeloma primernejši, ker nas ne zanima le omemba kraja, temveč glavna lokacija članka. Najboljša nadaljnja rešitev bi bil hibridni pristop: zmogljivejši LLM bi določil glavno lokacijo, slovar krajev in GeoNames pa bi rezultat preverila, popravila zapise imen ter zavrnila neveljavne kombinacije država-kraj.


## 5. Primeri odkrivanja znanj iz vizualizacij

Spodnji primeri prikazujejo, kako interaktivni zemljevid pretvori surov arhiv člankov v razumljive vzorce, ki jih iz seznama naslovov težko opazimo.

### 5.1 Globalna pokritost in lokalna natančnost

Preklapljanje med načini prikaza razkrije dva komplementarna pogleda na iste podatke.

- Heatmap (slika 1a) takoj pokaže, katere države prevladujejo v arhivu: ZDA, večje evropske države in Rusija so intenzivneje obarvane.
- Način pik (slika 1b) razkrije, da znotraj teh držav poročanje ni enakomerno porazdeljeno; novice se kopičijo v določenih mestih, druge regije pa ostajajo prazne.

| Slika 1a                                  | Slika 1b                                                  |
| ----------------------------------------- | --------------------------------------------------------- |
| ![Heatmap](assets/images/01a-heatmap.png) | ![Pike s sidebari](assets/images/01b-dots-w-sidebars.png) |

### 5.2 Geografska ločitev iste tematske kategorije

Ko izberemo filter "vojna & konflikti", zemljevid ne pokaže ene razmazane lise, temveč jasno ločena žarišča.

- Slika 2a prikazuje gosto pokritost vzhodne Evrope in Ukrajine.
- Slika 2b prikazuje intenzivno pokritost Bližnjega vzhoda.

Iz časovnega seznama bi težko takoj ugotovili, da isto tematsko oznako sestavljata dva povsem ločena geografska konflikta. Vizualizacija to razkrije brez branja posameznih člankov.

| Slika 2a                                             | Slika 2b                                                |
| ---------------------------------------------------- | ------------------------------------------------------- |
| ![Vojna Ukrajina](assets/images/02a-war-ukraine.png) | ![Vojna Palestina](assets/images/02b-war-palestine.png) |

### 5.3 Odkrivanje uredniških praznin

Aplikacija ni uporabna le za potrjevanje očitnega, temveč tudi za odkrivanje česa ni. Ob izbiri teme "gospodarstvo" (slika 3) postane presenetljivo, kako redke so pike zunaj Evrope, Severne Amerike in vzhodne Azije. Veliki deli Afrike, Južne Amerike in Srednje Azije so skoraj prazni. To zahteva vprašanje, ali se gre za resnično manjše število ekonomskih dogodkov v teh regijah ali za uredniško pristranskost pri izbiranju virov? Vizualizacija samega seznama tega ne bi razkrila.

![Ekonomija](assets/images/03-economy.png)  
_Slika 3: Tematski filter "gospodarstvo" – opazna redkost zunaj tradicionalnih ekonomskih središč._

### 5.4 Podrobnejši vpogled s podtemami

Glavne teme so uporabne za pregled celotnega arhiva, vendar lahko združujejo med seboj precej različne dogodke. Podteme omogočajo dodatno raven raziskovanja brez branja vsakega posameznega članka. Ko uporabnik izbere glavno temo, se v statističnem oknu namesto deležev glavnih tem prikažejo deleži njenih podtem. Če nato izbere državo, se isti prikaz omeji samo na članke iz te države in izbranega časovnega obdobja.

V načinu heatmap splošni pogled še vedno prikazuje intenzivnost poročanja po državah. Po kliku na državo se prikažejo tudi pike po mestih; kadar je izbrana glavna tema in je prikaz podtem vključen, barve teh pik predstavljajo posamezne podteme. Tako lahko na primer pri temi `Naravne nesreče` ločimo poplave od požarov ali potresov, pri temi `Nesreče in incidenti` pa prometne nesreče od delovnih nesreč in tehničnih okvar.

## 6. Refleksija

- LLM (verzija 1) je lahko vračal nesmiselne pare država-kraj, zato smo izgubili dokaj velik delež člankov (približno 50%).
- Zato smo poskusili tudi z drugačnim pristopom (verzija 6). Ta metoda je izgubila le 15% člankov, a so podatki manj točni.
- Za najboljše rezultate bi morali poganjati močnejši in dražji model, tako bi imeli več člankov in ohranili kvaliteto podatkov, ki jih model vrne.
- Podteme trenutno izboljšujejo raziskovanje podatkov, vendar njihova kakovost še ni neposredno ovrednotena z ročno označenim zlatim standardom. Prehodni klasifikator je pregleden in omogoča hitro popravljanje pravil, vendar ne razume konteksta tako dobro kot zmogljivejši model. Smiselna nadaljnja izboljšava je ročno označiti vzorec podtem, izmeriti natančnost ter na podlagi napak dopolniti taksonomijo in prompt.
