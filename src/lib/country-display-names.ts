const REGION_CODES = `
AF AL DZ AD AO AR AU AT AZ BH BD BY BE BJ BT BO BA BW BR BG BF BI CM CA CF TD
CL CN CO CR HR CU CY CZ CD DK DM DO EC EG GQ EE ET FK FJ FI FR GE DE GH GR GL
GT GN GW GY HT HN HU IS IN ID IR IQ IE IL IT CI JM JP JE JO KZ KE KI XK LA LV
LB LR LY LI LT MO MG MW MY ML MT MX MD MN ME MA MM NA NP NL NZ NI NE NG KP MK
NO OM PK PS PA PG PE PH PL PT PR QA CG RO RU RW WS SA SN RS SC SL SG SK SI ZA
KR ES SD SE CH SY TW TZ TH TG TO TN TR TM UG UA AE GB US UY UZ VE VN ZM ZW
`
  .trim()
  .split(/\s+/);

const englishRegionNames = new Intl.DisplayNames(["en"], { type: "region" });
const slovenianRegionNames = new Intl.DisplayNames(["sl"], { type: "region" });

const REGION_CODE_BY_COUNTRY_NAME = new Map(
  REGION_CODES.map((code) => [englishRegionNames.of(code), code])
);

const REGION_CODE_BY_ALIAS: Record<string, string> = {
  "Bosnia and Herzegovina": "BA",
  "Democratic Republic of the Congo": "CD",
  "Falkland Islands": "FK",
  "Ivory Coast": "CI",
  Laos: "LA",
  Macao: "MO",
  "North Korea": "KP",
  "Palestinian Territories": "PS",
  "Palestinian Territory": "PS",
  "Republic of the Congo": "CG",
  Russia: "RU",
  "South Korea": "KR",
  Syria: "SY",
  Taiwan: "TW",
  Tanzania: "TZ",
  Turkey: "TR",
  "United States": "US",
  Vietnam: "VN",
};

export function getCountryDisplayName(country: string): string {
  const regionCode =
    REGION_CODE_BY_COUNTRY_NAME.get(country) ?? REGION_CODE_BY_ALIAS[country];

  return regionCode
    ? (slovenianRegionNames.of(regionCode) ?? country)
    : country;
}
