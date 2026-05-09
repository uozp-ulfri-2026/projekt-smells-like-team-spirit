// bunx quicktype -s json .\assets\mmc-llm.json -o types.ts --just-types

export interface Article {
	_id: string;
	url: string;
	authors?: string[];
	date?: Date;
	title?: string;
	paragraphs?: string[];
	figures?: ArticleFigure[];
	lead?: string;
	mention?: string[];
	topics?: ArticleCategory;
	keywords?: string[];
	gpt_keywords?: string[];
	id?: string;
	n_comments?: number;
	llm?: ArticleLlm;
	category?: ArticleCategory;
}

export enum ArticleCategory {
	CrnaKronika = "crna-kronika",
	Gospodarstvo = "gospodarstvo",
	Kolumne = "kolumne",
	Kultura = "kultura",
	Okolje = "okolje",
	Slovenija = "slovenija",
	Sport = "sport",
	Stevilke = "stevilke",
	Svet = "svet",
	ZabavaInSlog = "zabava-in-slog",
	ZnanostInTehnologija = "znanost-in-tehnologija",
}

export interface ArticleFigure {
	caption?: string;
	img: string;
	source: string;
	"caption.en"?: string;
}

export interface ArticleLlm {
	_id?: string;
	topic?: ArticleTopic;
	country?: null | string;
	city?: null | string;
}

export enum ArticleTopic {
	Drugo = "drugo",
	Gastronomija = "gastronomija",
	Gospodarstvo = "gospodarstvo",
	Kriminal = "kriminal",
	Kultura = "kultura",
	NaravneNesrece = "naravne_nesrece",
	Okolje = "okolje",
	Politika = "politika",
	PrometneNesrece = "prometne_nesrece",
	Sport = "sport",
	Tehnologija = "tehnologija",
	Turizem = "turizem",
	VojnaInKonflikti = "vojna_in_konflikti",
	Zabava = "zabava",
	Zdravje = "zdravje",
}
