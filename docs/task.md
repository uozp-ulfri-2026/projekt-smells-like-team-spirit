Na voljo imate članke s spletne strani [Multimedijskega centra RTV slovenija](www.rtvslo.si) za zadnjih nekaj let. Podatki vključujejo URL, celotno vsebino članka in nekatere dodatke, kot so omenjene osebe in klasifikacija. Kot rezultat naloge morate oblikovati **interaktivno aplikacijo z vizualizacijami**, ki bo predstavila informacije o teh člankih na zanimiv način ter pri tem uporabila kakšno od tehnik, ki smo jo spoznali na predavanjih. Vaša interaktivna aplikacija je lahko implementirana kot **spletna stran** ali kot aplikacija, ki jo na računalniku direktno poženemo (na primer implementirano v s pomočjo pyqtgraph-a).

Kot temo si lahko izberete skoraj karkoli, kar vas zanima. Primeri tem:

- Omrežje v člankih omenjenih oseb, opremljeno s tipičnimi izjavami, citati ali konteksti.
- Katere osebe se v člankih najpogosteje pojavljajo skupaj, ter semantični iskalnik oseb po vsebinah.
- Filtriranje novic z borznimi komentarji, njihova analiza ter iskanje korelacij z gibanjem (rastjo ali padcem) npr. skladov Triglav.
- Prikaz uspešnosti slovenskih športnikov (npr. kolesarjev, nogometašev) skozi čas z dodatno razlago trendov.
- Samodejno podnaslavljanje slik iz člankov ter analiza, katere slike so slabo opisane ali ne ustrezajo vsebini članka.
- Napovedovanje števila komentarjev pri novici ter razlaga napovedi (kateri dejavniki vplivajo).
- Napovedovanje kategorije članka ter razlaga, zakaj je bil članek uvrščen v določeno kategorijo.
- Primerjava člankov MMC in portala The Guardian (tudi ti podatki so na voljo): prikaz povezanosti dnevnih tem med portaloma ter analiza morebitnih avtomatsko prevedenih ali povzetih vsebin.
- Analiza komentarjev (npr. sentiment, pogostost, odzivnost bralcev na različne teme).
- Geografska analiza novic: prikaz, kje se dogodki dogajajo in o katerih regijah se največ poroča.
- Analiza razvoja tem skozi čas (topic tracking) ter prikaz, kako se posamezne zgodbe razvijajo.
- Analiza avtorjev: kdo piše kakšne članke, o katerih temah, kdaj?

Nalogo rešite v skupini z **do tremi člani** z jasno določenimi vlogami članov, npr.:

- izbor problema in metodologije
- oblikovanje predstavitve informacij
- priprava podatkov in metodologije
- izdelava spletne strani

Vaše delo sproti oddajajte v repozitorij, ki se bo za vsako skupino ustvaril, ko sprejmete nalogo na [GitHub Classroomu](https://classroom.github.com/a/tq-dhw8N) (tam tudi ustvarite oz. izberete svojo skupino). Zgodovina commitov nam bo pomagala oceniti delo posameznikov, zato jo skrbno vzdržujte. Podatkov in (zelo velikih) modelov raje ne dodajajte v repozitorij, ker vam bo sicer zmanjkalo prostora v repozitoriju (prosim, ne uporabljajte Git-LFS).

**Predvideni roki in časi predstavitev.** Za vsak konkreten rok bomo sicer odprli novo oddajo na učilnici.

- **čim prej**: prijava v skupine na [GitHub Classroom](https://classroom.github.com/a/tq-dhw8N) (izberite oz. ustvarite svojo skupino); to je nujno, da lahko oddate naslednje materiale (če se kaj zaplete, pišite na marko.toplak@fri.uni-lj.si)
- **20\. april**: predstavitev problema (kratek pitch) in diskusija (predstavitev vlog v skupini, izbranih vizualizacij, uporabljenih metod za odkrivanje znanj, pričakovanih interakcij)
- **11\. maj**: vmesna predstavitev, kjer predstavite že dejanske rezultate in vizualizacije, rezultate interakcij)
- **1\. junij**, zadnje predavanje: predstavitve in zagovori

**Podatki**

Datoteke s podatki so dostopne na [https://file.biolab.si/tmp/uozp-data](https://file.biolab.si/tmp/uozp-data):

- mmc-10.yaml: vzorec 10 člankov iz portala MMC, https://www.rtvslo.si/
- mmc-100.yaml: vzorec 100 člankov iz portala MMC
- mmc.yaml.zip: ~73,000 člankov iz portala MMC, večina iz obdobja med aprilom 2023 in marcem 2026
- theguardian-10.yaml: vzorec 10 člankov iz portala The Guardian, https://www.theguardian.com/
- theguardian.yaml.zip: ~45,000 člankov iz portala The Guardian, večina iz obdobja med junijem 2023 in marcem 2026 (članke iz The Guardian bomo na strežnik postavili v kratkem)

**Opombe**

Manjše število člankov na MMC-ju ima tudi ključne besede generirane z LLM-ji (atribut gpt_keywords). Če je to potrebno, lahko taka gesla generiramo za vse članke. Pri nekaterih člankih smo opazili, da podnaslovi manjkajo (manjka polje subtitle); bomo dodali. Zapise sicer lahko preverite, ker ima vsak članek v yaml datoteki tudi polje url. Če kaj koristnega manjka, nam to sporočite (obvestite nas ustno ali na forumu).

**Oddaja**

Na spletno učilnico (v to nalogo) oddajte kratko `.pdf` predstavitev, kjer najprej skozi **zaslonske posnetke predstavite svojo aplikacijo** in problematiko, ki jo rešuje, nadaljujte pa s **predstavitvijo uporabljenih tehnik** (izbiro argumentirajte in evaluirajte). Pri tem se osredotočite predvsem na strojno učenje in razlago rezultatov.

Vašo programsko kodo shranite v pripadajoči repozitorij na Github Classroom. Vsaka skupina mora imeti en repozitorij - če do njega nimate dostopa, čim prej pišite na `marko.toplak@fri.uni-lj.si`.

Aplikacijo boste na predavanjih **1\. junija** predstavili na svojem računalniku: v **treh minutah** na primeru prikažite vašo aplikacijo (samo aplikacijo, brez prosojnic). Računalnik, s katerega boste predstavljali, naj ima izhod HDMI. Dovolj je, če aplikacijo predstavi en član skupine.

V istem tednu sledijo [zagovori](https://ucilnica.fri.uni-lj.si/mod/scheduler/view.php?id=63501) (15 minut na skupino, pridete vsi člani, s termini po razporedu).

**Ocenjevanje projekta**

**Predstavitev z demonstracijo delovanja rešitve** (3 min, 50 % skupne ocene)

25 % **Preglednost informacij in kakovost vizualizacij**  
Vizualizacije so pregledne, smiselno izbrane, pravilno označene in podpirajo razumevanje predstavljene vsebine.

25 % **Popolnost in uporabnost rešitve**  
Avditorij dobi celovit pogled v izbrano temo, spozna zanimive primere uporabe in so mu na primerih predstavljene bistvene komponente interaktivega vmesnika.

**Zagovor** (15 min, 50 % skupne ocene)

25 % **Uporaba tehnik odkrivanja znanja iz podatkov**  
Projektna skupina zna pojasniti, katere tehnike so uporabili, zakaj so te primerne za izbrani problem in kako so te povezane z uporabniškim vmesnikom. Člani skupine razumejo uporabljene metode, njihove predpostavke, omejitve in vlogo pri analizi podatkov.

25 % **Vrednotenje rezultatov**  
Projektna skupina zna pojasniti, kako so ovrednotili rezultate, kateri kriteriji oziroma mere so bili pri tem uporabljeni in zakaj. Pojasniti zna, zakaj so izbrali ravno te tehnike, ki so jih vključili v aplikacijo, med kakšnimi alternativami so izbirali in kaj jih je vodilo pri izboru. Skupina zna interpretirati rezultate vrednotenja.
