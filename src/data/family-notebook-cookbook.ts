import { normalizeIngredientName } from "@/lib/domain/ingredients";
import { cookbookExportSchema, type CookbookExport } from "@/lib/validation";
import type { SettingsValues } from "@/lib/validation/settings";

const FIXTURE_TIMESTAMP = "2026-07-24T00:00:00.000Z";
const SOURCE_NAME = "Domači zvezek receptov";

const FIXTURE_SETTINGS: SettingsValues = {
  theme: "system",
  defaultServings: 2,
  measurementPreference: "original",
  stapleIngredientIds: [],
  additionalStapleNames: [],
  reduceMotion: false,
  enabledRetailers: ["spar-si", "hofer-si", "lidl-si"],
  preferredRetailer: null,
  allowLoyaltyPrices: false,
  allowSplitBasket: false,
  preferPromotions: false,
  preferredBrands: [],
  excludedBrands: [],
};

type IngredientCategory = CookbookExport["ingredients"][number]["category"];
type RecipeCategory = CookbookExport["recipes"][number]["category"];

interface IngredientDefinition {
  canonicalName: string;
  displayName?: string | null;
  category?: IngredientCategory;
  defaultUnit?: string | null;
  quantity?: number | null;
  unit?: string | null;
  customUnit?: string | null;
  preparationNote?: string | null;
  isOptional?: boolean;
  isGarnish?: boolean;
  sectionName?: string | null;
}

interface StepDefinition {
  instruction: string;
  timerMinutes?: number | null;
}

interface RecipeDefinition {
  title: string;
  page: number;
  category: RecipeCategory;
  servings: number;
  prepMinutes?: number;
  cookMinutes?: number;
  restMinutes?: number;
  notes?: string[];
  ingredients: IngredientDefinition[];
  steps: StepDefinition[];
}

function ingredient(
  canonicalName: string,
  quantity: number | null,
  unit: string | null,
  options: Omit<
    IngredientDefinition,
    "canonicalName" | "quantity" | "unit"
  > = {},
): IngredientDefinition {
  return { canonicalName, quantity, unit, ...options };
}

function step(
  instruction: string,
  timerMinutes: number | null = null,
): StepDefinition {
  return { instruction, timerMinutes };
}

const recipeDefinitions: RecipeDefinition[] = [
  {
    title: "Borovničevi mafini",
    page: 1,
    category: "dessert",
    servings: 1,
    cookMinutes: 20,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno serijo.",
      "Na strani je pripis: dvojna masa za 3 pekače.",
      'Zapis "1 vanili" je ohranjen dobesedno, ker vrsta vanilijeve sestavine ni natančneje navedena.',
    ],
    ingredients: [
      ingredient("navadni jogurt", 1, "lonček", {
        displayName: "navadnega jogurta (180 g)",
        category: "dairy",
        preparationNote: "lonček vsebuje 180 g",
      }),
      ingredient("moka", 2, "lonček", { category: "grains" }),
      ingredient("jajce", 3, "piece", { category: "eggs" }),
      ingredient("sladkor", 1, "lonček", { category: "baking" }),
      ingredient("vanili", 1, null, { category: "baking" }),
      ingredient("maslo ali kokosovo olje", 0.5, "lonček", {
        category: "oils",
        preparationNote: "stopljeno",
      }),
      ingredient("pecilni prašek", 1, null, {
        displayName: "pecilni",
        category: "baking",
      }),
      ingredient("sol", null, "ščepec", { category: "spices" }),
      ingredient("borovnice", null, null, {
        category: "produce",
        preparationNote: "zamrznjene ali sveže",
      }),
      ingredient("limonina lupina", null, null, {
        category: "produce",
      }),
    ],
    steps: [
      step(
        "Penasto vmešamo jajca s sladkorjem in vanilijem. Dodamo jogurt, maslo ali kokosovo olje, moko s pecilnim praškom, sol in limonino lupino.",
      ),
      step("Nazadnje masi dodamo še borovnice."),
      step(
        "Papirčke obložimo z maso in mafine pečemo v prej segreti pečici na 180 °C približno 15-20 minut.",
        20,
      ),
    ],
  },
  {
    title: "Kvašeni rogljički z marmelado",
    page: 2,
    category: "dessert",
    servings: 1,
    prepMinutes: 0,
    cookMinutes: 20,
    restMinutes: 120,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno serijo.",
    ],
    ingredients: [
      ingredient("sveži kvas", 40, "g", {
        category: "baking",
        sectionName: "Za kvasec",
      }),
      ingredient("mleko", 14, "tbsp", {
        category: "dairy",
        preparationNote: "mlačno",
        sectionName: "Za kvasec",
      }),
      ingredient("sladkor", 2, "tbsp", {
        category: "baking",
        sectionName: "Za kvasec",
      }),
      ingredient("gladka moka", 1, "kg", {
        category: "grains",
        sectionName: "Testo",
      }),
      ingredient("sladkor", 4, "tbsp", {
        category: "baking",
        sectionName: "Testo",
      }),
      ingredient("sol", null, "ščepec", {
        category: "spices",
        sectionName: "Testo",
      }),
      ingredient("maslo", 120, "g", {
        category: "dairy",
        preparationNote: "stopljeno",
        sectionName: "Testo",
      }),
      ingredient("mleko", 4, "dl", {
        displayName: "mleka (4-6 dl)",
        category: "dairy",
        sectionName: "Testo",
        preparationNote: "dodajamo postopoma; izvirnik navaja 4-6 dl",
      }),
      ingredient("marmelada", null, null, {
        category: "condiments",
        sectionName: "Testo",
      }),
    ],
    steps: [
      step(
        "Pripravimo kvasec z mlačnim mlekom in ga pustimo stati 10 minut.",
        10,
      ),
      step(
        "V veliko skledo damo moko in naredimo jamico. V jamico damo sladkor, stopljeno maslo in kvasec, sol pa stresemo ob strani, da se ne stika s kvasom.",
      ),
      step(
        "Vse zgnetemo in postopoma dodajamo mleko. Pokrijemo in pustimo stati 1 uro.",
        60,
      ),
      step("Testo razdelimo na 4 dele in jih malo pustimo."),
      step(
        "Vsak del razvaljamo in razdelimo na trikotnike. Marmelado damo na širši del, dobro zatisnemo in zamotamo.",
      ),
      step(
        "Rogljičke premažemo z mlekom, pokrijemo in pustimo vzhajati še 20-30 minut.",
        30,
      ),
      step("Pečemo 20 minut na 180 °C. Vroče rogljičke pokrijemo.", 20),
    ],
  },
  {
    title: "Testo za pico",
    page: 3,
    category: "other",
    servings: 1,
    cookMinutes: 25,
    restMinutes: 70,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno serijo testa.",
    ],
    ingredients: [
      ingredient("moka", 500, "g", { category: "grains" }),
      ingredient("sveži kvas", 25, "g", { category: "baking" }),
      ingredient("sladkor", 1, "tsp", { category: "baking" }),
      ingredient("voda", 3, "dl", {
        category: "beverages",
        preparationNote: "mlačna",
      }),
      ingredient("olivno olje", 2, "tbsp", { category: "oils" }),
      ingredient("sol", null, null, { category: "spices" }),
    ],
    steps: [
      step(
        "V kozarec nadrobimo kvas, prilijemo 2 dl mlačne vode, dodamo sladkor in 1 žlico moke. Pustimo 10 minut.",
        10,
      ),
      step(
        "V moko naredimo jamico, po strani posipamo sol ter prilijemo olje in kvasec. Ob gnetenju dolivamo preostalo vodo.",
      ),
      step("Testo pustimo vzhajati na toplem vsaj eno uro.", 60),
      step("Pico pečemo 20-25 minut na 200 °C.", 25),
    ],
  },
  {
    title: "Sirove štručke",
    page: 4,
    category: "snack",
    servings: 8,
    cookMinutes: 20,
    restMinutes: 20,
    notes: [
      "Izvirnik navaja 8-10 štručk; servings je nastavljen na spodnjo izrecno navedeno količino (8).",
    ],
    ingredients: [
      ingredient("gladka moka", 500, "g", {
        category: "grains",
        sectionName: "Testo",
      }),
      ingredient("kvas", 20, "g", {
        category: "baking",
        sectionName: "Testo",
      }),
      ingredient("mleko", 150, "ml", {
        category: "dairy",
        preparationNote: "toplo",
        sectionName: "Testo",
      }),
      ingredient("svetlo pivo", 100, "ml", {
        category: "beverages",
        sectionName: "Testo",
      }),
      ingredient("sol", 1, "tsp", {
        category: "spices",
        sectionName: "Testo",
      }),
      ingredient("sladkor", 1, "tsp", {
        category: "baking",
        sectionName: "Testo",
      }),
      ingredient("rumenjak", 2, "piece", {
        category: "eggs",
        sectionName: "Testo",
      }),
      ingredient("grški jogurt", 100, "g", {
        category: "dairy",
        sectionName: "Testo",
      }),
      ingredient("maslo", 200, "g", {
        category: "dairy",
        preparationNote: "stopljeno",
        sectionName: "Testo",
      }),
      ingredient("jajce", 1, "piece", {
        category: "eggs",
        sectionName: "Premaz",
      }),
      ingredient("mleko", 1, "tbsp", {
        category: "dairy",
        sectionName: "Premaz",
      }),
      ingredient("sir", 300, "g", {
        category: "dairy",
        preparationNote: "nariban",
        sectionName: "Premaz",
      }),
    ],
    steps: [
      step(
        "V moko naredimo jamico in vanjo nadrobimo kvas. Dodamo sladkor in polovico toplega mleka ter pustimo vzhajati 10 minut.",
        10,
      ),
      step(
        "V drugi skledi zmešamo rumenjake, sol, stopljeno maslo in preostalo mleko.",
      ),
      step(
        "Ko kvasec začne delovati, pregnetemo mokino zmes in postopoma dodajamo jogurt, rumenjakovo zmes in pivo. Gnetemo tako dolgo, da je testo gladko in mehko, vendar še nekoliko lepljivo.",
      ),
      step("Testo pomokamo in pustimo vzhajati."),
      step(
        "Pekač obložimo s papirjem in nanj polagamo oblikovane štručke. Pečico segrejemo na 180 °C in štručke še malo pustimo vzhajati.",
      ),
      step(
        "Vzhajane štručke premažemo s premazom. Po sredini zarežemo ter zapolnimo z naribanim sirom.",
      ),
      step(
        "Pečemo 20 minut; zadnjih 5 minut povišamo temperaturo za bolj popečen sir. Pečene pokrijemo.",
        20,
      ),
    ],
  },
  {
    title: "Slivova pita",
    page: 5,
    category: "dessert",
    servings: 1,
    cookMinutes: 45,
    restMinutes: 60,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno pito.",
    ],
    ingredients: [
      ingredient("moka", 500, "g", {
        category: "grains",
        sectionName: "Krhko testo",
      }),
      ingredient("maslo", 300, "g", {
        category: "dairy",
        preparationNote: "hladno",
        sectionName: "Krhko testo",
      }),
      ingredient("rumenjak", 2, "piece", {
        category: "eggs",
        sectionName: "Krhko testo",
      }),
      ingredient("sladkor v prahu", 120, "g", {
        category: "baking",
        sectionName: "Krhko testo",
      }),
      ingredient("limonina lupina", null, null, {
        category: "produce",
        preparationNote: "naribana",
        sectionName: "Krhko testo",
      }),
      ingredient("sliva", 800, "g", {
        category: "produce",
        preparationNote: "izkoščičena",
        sectionName: "Nadev",
      }),
      ingredient("koruzni škrob", 2, "tbsp", {
        category: "baking",
        sectionName: "Nadev",
      }),
      ingredient("sladkor", 100, "g", {
        category: "baking",
        sectionName: "Nadev",
      }),
      ingredient("cimet", null, "ščepec", {
        category: "spices",
        sectionName: "Nadev",
      }),
      ingredient("sol", null, "ščepec", {
        category: "spices",
        sectionName: "Nadev",
      }),
      ingredient("limonin sok", 1, "kos", {
        displayName: "sok ene limone",
        category: "produce",
        sectionName: "Nadev",
      }),
    ],
    steps: [
      step(
        "Moki in sladkorju dodamo hladno maslo. Dodamo še ostale sestavine in pokrito testo s folijo postavimo v hladilnik vsaj za 1 uro.",
        60,
      ),
      step(
        "Ko je testo dobro ohlajeno, ga razdelimo na 2 dela. Enega razvaljamo in položimo v namaščen pekač.",
      ),
      step("Sestavine za nadev zmešamo in z njimi obložimo testo."),
      step("Iz drugega dela testa naredimo trakove in jih položimo na pito."),
      step("Pečico segrejemo na 200 °C in pito pečemo približno 45 minut.", 45),
    ],
  },
  {
    title: "Jabolčna pita",
    page: 6,
    category: "dessert",
    servings: 1,
    cookMinutes: 45,
    restMinutes: 60,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno pito.",
      'Zapis "1 vanili" je ohranjen dobesedno, ker vrsta vanilijeve sestavine ni natančneje navedena.',
      "Količina jabolk, drobtin oziroma koruznega zdroba in cimeta v izvirniku ni navedena.",
    ],
    ingredients: [
      ingredient("moka", 350, "g", {
        category: "grains",
        sectionName: "Testo",
      }),
      ingredient("pecilni prašek", 0.5, null, {
        displayName: "pecilnega",
        category: "baking",
        sectionName: "Testo",
      }),
      ingredient("vanili", 1, null, {
        category: "baking",
        sectionName: "Testo",
      }),
      ingredient("sladkor v prahu", 120, "g", {
        category: "baking",
        sectionName: "Testo",
      }),
      ingredient("margarina", 150, "g", {
        category: "dairy",
        sectionName: "Testo",
      }),
      ingredient("rumenjak", 2, "piece", {
        category: "eggs",
        sectionName: "Testo",
      }),
      ingredient("kisla smetana", 4, "tbsp", {
        category: "dairy",
        sectionName: "Testo",
      }),
      ingredient("jabolko", null, null, {
        category: "produce",
        preparationNote: "naribano",
        sectionName: "Nadev",
      }),
      ingredient("sladkor", 80, "g", {
        category: "baking",
        sectionName: "Nadev",
      }),
      ingredient("drobtine ali koruzni zdrob", null, null, {
        category: "grains",
        sectionName: "Nadev",
      }),
      ingredient("cimet", null, null, {
        category: "spices",
        sectionName: "Nadev",
      }),
      ingredient("sladkor v prahu", null, null, {
        category: "baking",
        preparationNote: "za posip",
        sectionName: "Nadev",
      }),
    ],
    steps: [
      step(
        "Zamesimo testo in ga pustimo na hladnem vsaj 1 uro. Pripravimo nadev.",
        60,
      ),
      step(
        "Testo razdelimo na 2 dela. Prvega položimo na pekač in ga najprej pečemo 5 minut na 200 °C.",
        5,
      ),
      step(
        "Pekač vzamemo iz pečice in testo obložimo z nadevom. Drugi del testa razvaljamo in izrežemo trakce, ki jih polagamo na pito.",
      ),
      step("Pečemo še 35-40 minut na 200 °C.", 40),
      step("Ohlajeno pito posujemo s sladkorjem v prahu."),
    ],
  },
  {
    title: "Orehova in makova potica",
    page: 7,
    category: "dessert",
    servings: 1,
    cookMinutes: 90,
    restMinutes: 195,
    notes: [
      "Izvirnik navaja testo za 1 potico.",
      'Pri orehovem nadevu je zapisano "½ žličke cimeta & ½ kave"; beseda "kave" je ohranjena v opombi, ker ni jasno, ali pomeni ½ žličke kave.',
      "Pri makovem nadevu so vanili, cimet in rum navedeni po okusu brez količin.",
    ],
    ingredients: [
      ingredient("moka", 600, "g", {
        category: "grains",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("sol", 0.5, "tsp", {
        category: "spices",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("rumenjak", 4, "piece", {
        category: "eggs",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("sladkor", 50, "g", {
        category: "baking",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("rum", 1, "tbsp", {
        category: "beverages",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("mleko", 3, "dl", {
        category: "dairy",
        preparationNote: "toplo",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("maslo", 50, "g", {
        category: "dairy",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("sveži kvas", 30, "g", {
        displayName: "svežega kvasa (ali 8 g suhega)",
        category: "baking",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("vanili", 1, null, {
        category: "baking",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("limonina lupina", null, null, {
        category: "produce",
        sectionName: "Testo za 1 potico",
      }),
      ingredient("mleti orehi", 400, "g", {
        displayName: "mletih orehov (400-600 g)",
        category: "baking",
        preparationNote: "izvirnik navaja 400-600 g",
        sectionName: "Orehov nadev",
      }),
      ingredient("sladkor", 150, "g", {
        category: "baking",
        sectionName: "Orehov nadev",
      }),
      ingredient("mleko", 2, "dl", {
        category: "dairy",
        sectionName: "Orehov nadev",
      }),
      ingredient("rum", 2, "tbsp", {
        category: "beverages",
        sectionName: "Orehov nadev",
      }),
      ingredient("cimet", 0.5, "tsp", {
        category: "spices",
        sectionName: "Orehov nadev",
      }),
      ingredient("kava", null, "nejasno: ½ kave", {
        category: "beverages",
        sectionName: "Orehov nadev",
      }),
      ingredient("beljak", 3, "piece", {
        category: "eggs",
        preparationNote: "sneg",
        sectionName: "Orehov nadev",
      }),
      ingredient("mak", 400, "g", {
        displayName: "maka (400-600 g)",
        category: "baking",
        preparationNote: "izvirnik navaja 400-600 g",
        sectionName: "Makov nadev",
      }),
      ingredient("sladkor", 150, "g", {
        category: "baking",
        sectionName: "Makov nadev",
      }),
      ingredient("jajce", 2, "piece", {
        category: "eggs",
        sectionName: "Makov nadev",
      }),
      ingredient("kisla smetana", 2, "dl", {
        category: "dairy",
        sectionName: "Makov nadev",
      }),
      ingredient("drobtine", 100, "g", {
        category: "grains",
        sectionName: "Makov nadev",
      }),
      ingredient("vanili", null, "po okusu", {
        category: "baking",
        sectionName: "Makov nadev",
      }),
      ingredient("cimet", null, "po okusu", {
        category: "spices",
        sectionName: "Makov nadev",
      }),
      ingredient("rum", null, "po okusu", {
        category: "beverages",
        sectionName: "Makov nadev",
      }),
    ],
    steps: [
      step(
        "Kvas nadrobimo v 1,5 dl toplega mleka. Dodamo žlico moke in žličko sladkorja ter pustimo 15 minut.",
        15,
      ),
      step(
        "Moki dodamo maslo in sol ter premešamo. Nato dodamo še vanili, rum, limonino lupino, sladkor, rumenjake, kvasec in preostalo mleko.",
      ),
      step("Testo zgnetemo, pomokamo in pokrito pustimo na toplem 2 uri.", 120),
      step("Za izbrani nadev zmešamo suhe sestavine in jim dodamo mokre."),
      step(
        "Testo razvaljamo na 0,5-1 cm in čim bolj enakomerno namažemo nadev. Zavijemo kot rolado.",
      ),
      step("Potico nastavimo v pekač in pustimo še 40-60 minut.", 60),
      step("Premažemo jo z beljakom in prepikamo z vilico."),
      step(
        "V ogreti ventilacijski pečici pečemo 60-90 minut na 180 °C. Ohlajeno režemo.",
        90,
      ),
    ],
  },
  {
    title: "Limonini razpokančki",
    page: 8,
    category: "dessert",
    servings: 1,
    cookMinutes: 10,
    restMinutes: 180,
    notes: [
      "Izvirnik navaja eno maso za en pekač.",
      'Zapis "1 vanili" je ohranjen dobesedno, ker vrsta vanilijeve sestavine ni natančneje navedena.',
    ],
    ingredients: [
      ingredient("moka", 270, "g", { category: "grains" }),
      ingredient("pecilni prašek", 1, null, {
        displayName: "pecilni",
        category: "baking",
      }),
      ingredient("sol", null, "malo", { category: "spices" }),
      ingredient("maslo", 100, "g", { category: "dairy" }),
      ingredient("sladkor", 125, "g", { category: "baking" }),
      ingredient("jajce", 1, "piece", {
        category: "eggs",
        preparationNote: "večje",
      }),
      ingredient("rumenjak", 1, "piece", { category: "eggs" }),
      ingredient("limonin sok", 0.5, "kos", {
        displayName: "sok ½ limone",
        category: "produce",
      }),
      ingredient("limonina lupina", null, "malo", {
        category: "produce",
      }),
      ingredient("vanili", 1, null, { category: "baking" }),
      ingredient("sladkor v prahu", null, null, {
        category: "baking",
        preparationNote: "za povaljanje",
      }),
    ],
    steps: [
      step("V posodi zmešamo moko, pecilni prašek in sol."),
      step(
        "V drugi posodi zmešamo maslo, sladkor in limonin sok. Primešamo jajce, rumenjak, limonino lupino in vanili.",
      ),
      step("Maso pustimo pokrito na hladnem vsaj 3 ure.", 180),
      step(
        "Pečico segrejemo na 180 °C. Oblikujemo kroglice in jih povaljamo v sladkorju v prahu.",
      ),
      step("Pečemo 10 minut.", 10),
    ],
  },
  {
    title: "Mafini s pomarančo in čokolado",
    page: 9,
    category: "dessert",
    servings: 12,
    cookMinutes: 20,
    notes: ["Izvirnik navaja 12 kosov."],
    ingredients: [
      ingredient("moka", 250, "g", { category: "grains" }),
      ingredient("sladkor", 120, "g", { category: "baking" }),
      ingredient("pecilni prašek", 1, null, {
        displayName: "pecilni",
        category: "baking",
      }),
      ingredient("pomaranča", 2, "piece", {
        category: "produce",
        preparationNote: "sok 125 ml in lupina",
      }),
      ingredient("sol", null, "ščepec", { category: "spices" }),
      ingredient("mleko", 1, "dl", { category: "dairy" }),
      ingredient("marmelada", 2, "tbsp", {
        displayName: "marmelade (pomaranča ali marelica)",
        category: "condiments",
      }),
      ingredient("jajce", 1, "piece", { category: "eggs" }),
      ingredient("čokoladni koščki", 100, "g", { category: "baking" }),
    ],
    steps: [
      step("Moko, sladkor, pecilni prašek in sol zmešamo."),
      step("Pomarančo nastrgamo in iztisnemo sok."),
      step("Soku dodamo mleko, marmelado, jajce in pomarančno lupino."),
      step("Zmes dodamo k moki in nazadnje vmešamo še čokoladne koščke."),
      step("Pečemo 20 minut na 200 °C.", 20),
    ],
  },
  {
    title: "Rahlo pecivo",
    page: 10,
    category: "dessert",
    servings: 1,
    cookMinutes: 40,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno serijo.",
      "Količine vanilija, pecilnega praška, marmelade, čokolade in masla za preliv v izvirniku niso navedene.",
    ],
    ingredients: [
      ingredient("pšenični zdrob", 1, "jogurtov lonček", {
        displayName: "gres",
        category: "grains",
      }),
      ingredient("mleti orehi", 1, "lonček", { category: "baking" }),
      ingredient("mleko", 1, "lonček", { category: "dairy" }),
      ingredient("olje", 0.5, "lonček", { category: "oils" }),
      ingredient("sladkor", 1, "lonček", { category: "baking" }),
      ingredient("moka", 3, "tbsp", { category: "grains" }),
      ingredient("vanili", null, null, { category: "baking" }),
      ingredient("pecilni prašek", null, null, { category: "baking" }),
      ingredient("jajce", 2, "piece", { category: "eggs" }),
      ingredient("jabolko", 2, "piece", {
        category: "produce",
        preparationNote: "naribano",
      }),
      ingredient("marmelada", null, null, {
        category: "condiments",
        sectionName: "Preliv",
      }),
      ingredient("čokolada", null, null, {
        category: "baking",
        sectionName: "Preliv",
      }),
      ingredient("maslo", null, null, {
        category: "dairy",
        sectionName: "Preliv",
      }),
    ],
    steps: [
      step("Zmešamo sestavine in na koncu vmešamo še naribani jabolki."),
      step("Pečemo 40 minut na 180 °C.", 40),
      step(
        "Ko se biskvit ohladi, ga premažemo z marmelado in polijemo s čokoladnim prelivom.",
      ),
    ],
  },
  {
    title: "Višnjevo pecivo",
    page: 11,
    category: "dessert",
    servings: 1,
    cookMinutes: 30,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno serijo.",
    ],
    ingredients: [
      ingredient("višnje", 300, "g", {
        category: "produce",
        preparationNote: "izkoščičene",
      }),
      ingredient("jajce", 4, "piece", { category: "eggs" }),
      ingredient("sladkor", 8, "tbsp", { category: "baking" }),
      ingredient("jogurt", 16, "tbsp", { category: "dairy" }),
      ingredient("moka", 16, "tbsp", { category: "grains" }),
      ingredient("olje", 14, "tbsp", { category: "oils" }),
      ingredient("pecilni prašek", 1, null, {
        displayName: "pecilni",
        category: "baking",
      }),
      ingredient("sladkor v prahu", null, null, {
        category: "baking",
        preparationNote: "za posip",
      }),
    ],
    steps: [
      step("Pečico segrejemo na 200 °C."),
      step(
        "V skledi stepemo jajca s sladkorjem. Masi dodamo jogurt in olje. Pripravimo moko in pecilni prašek ter ju dodamo jajčni zmesi.",
      ),
      step(
        "Maso najprej pečemo 10 minut, nato jo vzamemo iz pečice in po njej razporedimo višnje.",
        10,
      ),
      step("Pečemo še 20 minut.", 20),
      step("Ko se pecivo ohladi, ga posujemo s sladkorjem v prahu."),
    ],
  },
  {
    title: "Pijana nevesta",
    page: 12,
    category: "dessert",
    servings: 1,
    cookMinutes: 15,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno serijo.",
      "Vrsta dveh pudingov, količina banan in količina smetane za stepanje v izvirniku niso navedene.",
      'Zapis "1 vanili" je ohranjen dobesedno, ker vrsta vanilijeve sestavine ni natančneje navedena.',
    ],
    ingredients: [
      ingredient("jajce", 3, "piece", {
        category: "eggs",
        sectionName: "Biskvit",
      }),
      ingredient("sladkor", 9, "tbsp", {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("olje", 9, "tbsp", {
        category: "oils",
        sectionName: "Biskvit",
      }),
      ingredient("mleko", 9, "tbsp", {
        category: "dairy",
        sectionName: "Biskvit",
      }),
      ingredient("moka", 9, "tbsp", {
        category: "grains",
        sectionName: "Biskvit",
      }),
      ingredient("pecilni prašek", 1, null, {
        displayName: "pecilni",
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("vanili", 1, null, {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("kakav", 4, "tbsp", {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("mleko", 1.5, "dl", {
        category: "dairy",
        sectionName: "Preliv",
      }),
      ingredient("sladkor", 3, "tbsp", {
        category: "baking",
        sectionName: "Preliv",
      }),
      ingredient("rum", 2, "tbsp", {
        category: "beverages",
        sectionName: "Preliv",
      }),
      ingredient("puding", 2, "packet", {
        category: "baking",
        sectionName: "Drugo",
      }),
      ingredient("mleko", 700, "ml", {
        category: "dairy",
        preparationNote: "za puding",
        sectionName: "Drugo",
      }),
      ingredient("banana", null, null, {
        category: "produce",
        preparationNote: "narezana",
        sectionName: "Drugo",
      }),
      ingredient("smetana za stepanje", null, null, {
        category: "dairy",
        preparationNote: "stepena",
        sectionName: "Drugo",
      }),
      ingredient("sadje ali mrvice", null, null, {
        category: "other",
        isOptional: true,
        preparationNote: "za okras",
        sectionName: "Drugo",
      }),
    ],
    steps: [
      step("Sestavine za biskvit zmešamo in pečemo 12-15 minut na 180 °C.", 15),
      step("Na ohlajen biskvit polivamo preliv in narežemo banane."),
      step("Skuhamo puding in ga prelijemo po biskvitu."),
      step("Postavimo v hladilnik, da se strdi."),
      step(
        "Nazadnje premažemo s stepeno smetano in okrasimo s sadjem ali mrvicami.",
      ),
    ],
  },
  {
    title: "Browniji",
    page: 13,
    category: "dessert",
    servings: 1,
    cookMinutes: 30,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno serijo.",
      "Količina čokoladnih koščkov in zamrznjenih malin v izvirniku ni navedena.",
      'Zapis "1 vanili" je ohranjen dobesedno, ker vrsta vanilijeve sestavine ni natančneje navedena.',
    ],
    ingredients: [
      ingredient("maslo", 145, "g", {
        category: "dairy",
        sectionName: "Biskvit",
      }),
      ingredient("beli sladkor", 100, "g", {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("rjavi sladkor", 120, "g", {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("jajce", 2, "piece", {
        category: "eggs",
        sectionName: "Biskvit",
      }),
      ingredient("kakav v prahu", 45, "g", {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("temna čokolada", 60, "g", {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("moka", 125, "g", {
        category: "grains",
        sectionName: "Biskvit",
      }),
      ingredient("vanili", 1, null, {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("sol", null, "ščepec", {
        category: "spices",
        sectionName: "Biskvit",
      }),
      ingredient("pecilni prašek", 0.75, "tsp", {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("soda bikarbona", 0.5, "tsp", {
        category: "baking",
        sectionName: "Biskvit",
      }),
      ingredient("čokoladni koščki", null, null, {
        category: "baking",
        sectionName: "Drugo",
      }),
      ingredient("maline", null, null, {
        category: "produce",
        preparationNote: "zamrznjene",
        sectionName: "Drugo",
      }),
    ],
    steps: [
      step("V posodi zmešamo jajca, beli in rjavi sladkor."),
      step(
        "Stopimo maslo ter temno čokolado, vsako posebej, in ju dodamo jajčni zmesi.",
      ),
      step(
        "V drugi posodi zmešamo suhe sestavine: moko, kakav v prahu, vanili, sol, pecilni prašek in sodo.",
      ),
      step(
        "Suhe in mokre sestavine združimo ter maso vlijemo v namaščen pekač. Dodamo maline in koščke čokolade.",
      ),
      step("Pečemo 30 minut na 180 °C.", 30),
    ],
  },
  {
    title: "Skutne kocke z limono in jagodami",
    page: 14,
    category: "dessert",
    servings: 1,
    restMinutes: 300,
    notes: [
      "Izvirni donos ni naveden; ena porcija v aplikaciji pomeni eno serijo.",
      "Izvirnik navaja, da je recept primeren za tortni pekač premera 26 cm ali pekač 30 × 40 cm.",
      "Količina sladkorja v prahu za podlago in sladkorja za jagodni vrh je navedena le kot po okusu.",
    ],
    ingredients: [
      ingredient("gladka moka", 180, "g", {
        category: "grains",
        sectionName: "Podlaga",
      }),
      ingredient("maslo", 90, "g", {
        category: "dairy",
        sectionName: "Podlaga",
      }),
      ingredient("mleti mandlji", 80, "g", {
        category: "baking",
        sectionName: "Podlaga",
      }),
      ingredient("sladkor v prahu", null, "po okusu", {
        category: "baking",
        sectionName: "Podlaga",
      }),
      ingredient("nepasirana skuta", 500, "g", {
        category: "dairy",
        sectionName: "Krema",
      }),
      ingredient("sladka smetana", 250, "ml", {
        category: "dairy",
        sectionName: "Krema",
      }),
      ingredient("želatina", 1, "packet", {
        category: "baking",
        sectionName: "Krema",
      }),
      ingredient("sladkor v prahu", 150, "g", {
        category: "baking",
        sectionName: "Krema",
      }),
      ingredient("limona", 2, "piece", {
        category: "produce",
        preparationNote: "sok in naribana lupina",
        sectionName: "Krema",
      }),
      ingredient("koščki sadja", null, null, {
        category: "produce",
        isOptional: true,
        sectionName: "Krema",
      }),
      ingredient("jagode", 400, "g", {
        category: "produce",
        preparationNote: "zamrznjene",
        sectionName: "Na vrhu",
      }),
      ingredient("sladkor", null, "po okusu", {
        category: "baking",
        sectionName: "Na vrhu",
      }),
      ingredient("želatina", 1, "packet", {
        category: "baking",
        sectionName: "Na vrhu",
      }),
    ],
    steps: [
      step(
        "Moko prepražimo na zmernem ognju. Dodamo mandlje, sladkor po okusu in nazadnje maslo.",
      ),
      step(
        "Premešamo, da se nekoliko sprime, nato maso položimo na dno namaščenega pekača in jo stisnemo.",
      ),
      step(
        "Za kremo zmešamo skuto, preostalo sladko smetano, sladkor v prahu, limonin sok in naribano lupino. Nazadnje dodamo želatino, raztopljeno v 100 ml sladke smetane. Po želji vmešamo še koščke sadja.",
      ),
      step(
        "Za vrh segrevamo jagode in jih pretlačimo s paličnim mešalnikom. Vmešamo sladkor in želatino ter počakamo, da se želatina stopi.",
      ),
      step(
        "Jagodno maso odstavimo z ognja in pustimo, da se nekoliko ohladi. Nato jo polijemo čez skutno kremo.",
      ),
      step(
        "Postavimo v hladilnik vsaj za 5 ur, najbolje čez noč, nato narežemo na majhne kocke.",
        300,
      ),
    ],
  },
  {
    title: "Marry Me Piščanec",
    page: 15,
    category: "dinner",
    servings: 8,
    cookMinutes: 30,
    notes: [
      "Izvirnik navaja 8 piščančjih filejev.",
      "Količine soli, popra, mletega čilija, origana, češnjevih paradižnikov, bazilike, naribanega sira in testenin v izvirniku niso navedene.",
    ],
    ingredients: [
      ingredient("piščančji file", 8, "piece", { category: "meat" }),
      ingredient("moka", 100, "g", { category: "grains" }),
      ingredient("sol", null, "po okusu", { category: "spices" }),
      ingredient("mleti poper", null, "po okusu", { category: "spices" }),
      ingredient("olje", 3, "tbsp", { category: "oils" }),
      ingredient("maslo", 3, "tbsp", { category: "dairy" }),
      ingredient("česen", 3, "clove", {
        category: "produce",
        preparationNote: "nasekljan",
      }),
      ingredient("paradižnikova mezga", 1, "tbsp", {
        category: "condiments",
      }),
      ingredient("mleti čili", null, "ščepec", { category: "spices" }),
      ingredient("origano", null, null, { category: "herbs" }),
      ingredient("mleta rdeča paprika", 1, "tsp", {
        category: "spices",
      }),
      ingredient("voda", 400, "ml", { category: "beverages" }),
      ingredient("jušna kocka", 1, "piece", { category: "condiments" }),
      ingredient("češnjev paradižnik", null, null, {
        category: "produce",
        preparationNote: "narezan",
      }),
      ingredient("bazilika", null, null, {
        category: "herbs",
        preparationNote: "sveža ali sušena",
      }),
      ingredient("sladka smetana", 200, "ml", { category: "dairy" }),
      ingredient("sir", null, null, {
        category: "dairy",
        preparationNote: "nariban",
      }),
      ingredient("testenine", null, null, {
        category: "pasta",
        preparationNote: "skuhane",
      }),
    ],
    steps: [
      step(
        "V krožniku pripravimo moko, sol in poper ter v mešanici povaljamo fileje.",
      ),
      step(
        "V večji ponvi segrejemo olje in fileje pokrito popečemo 7 minut na vsaki strani. Proti koncu v ponev dodamo maslo.",
        14,
      ),
      step(
        "Meso preložimo na krožnik. V ponev dodamo nasekljan česen in ga rahlo popražimo 1 minuto.",
        1,
      ),
      step(
        "Dodamo ostale začimbe - paradižnikovo mezgo, čili, origano in papriko - ter jušno osnovo. Postrgamo dno ponve.",
      ),
      step(
        "Ko omaka zavre, ponovno dodamo meso in ga pokritega kuhamo na nižji temperaturi približno 15 minut.",
        15,
      ),
      step("Dodamo narezan češnjev paradižnik ter svežo ali sušeno baziliko."),
      step(
        "Na kratko pokuhamo, nato dodamo še sir. Primešamo skuhane testenine in postrežemo.",
      ),
    ],
  },
];

function stableUuid(prefix: string, index: number): string {
  return `${prefix}-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

const ingredientMetadata = new Map<
  string,
  Pick<
    IngredientDefinition,
    "canonicalName" | "displayName" | "category" | "defaultUnit"
  >
>();

for (const recipe of recipeDefinitions) {
  for (const item of recipe.ingredients) {
    const key = normalizeIngredientName(item.canonicalName);
    if (!ingredientMetadata.has(key)) {
      ingredientMetadata.set(key, {
        canonicalName: item.canonicalName,
        displayName: item.canonicalName,
        category: item.category ?? "other",
        defaultUnit: item.defaultUnit ?? item.unit ?? null,
      });
    }
  }
}

const sortedIngredientMetadata = [...ingredientMetadata.entries()].sort(
  ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0),
);

const ingredientIdByName = new Map(
  sortedIngredientMetadata.map(([key], index) => [
    key,
    stableUuid("20000000", index + 1),
  ]),
);

function ingredientId(canonicalName: string): string {
  const id = ingredientIdByName.get(normalizeIngredientName(canonicalName));
  if (!id) {
    throw new Error(
      `Missing deterministic ingredient ID for ${canonicalName}.`,
    );
  }
  return id;
}

let recipeIngredientIndex = 0;
let stepIndex = 0;

const rawFixture = {
  schemaVersion: 2,
  product: "Nana's Recipes",
  exportedAt: FIXTURE_TIMESTAMP,
  ingredients: sortedIngredientMetadata.map(
    ([normalizedName, item], index) => ({
      id: stableUuid("20000000", index + 1),
      canonicalName: item.canonicalName,
      displayName: item.displayName ?? item.canonicalName,
      normalizedName,
      category: item.category ?? "other",
      defaultUnit: item.defaultUnit ?? null,
      aliases: [],
      isStaple: false,
      notes: `Pregledana sestavina iz vira ${SOURCE_NAME}.`,
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP,
    }),
  ),
  tags: [],
  recipes: recipeDefinitions.map((recipe, recipeIndex) => ({
    id: stableUuid("10000000", recipeIndex + 1),
    title: recipe.title,
    description: `Domači recept, ročno prepisan iz družinskega zvezka (stran ${recipe.page}).`,
    imagePath: null,
    category: recipe.category,
    cuisine: "slovenska",
    difficulty: null,
    prepMinutes: recipe.prepMinutes ?? 0,
    cookMinutes: recipe.cookMinutes ?? 0,
    restMinutes: recipe.restMinutes ?? 0,
    servings: recipe.servings,
    sourceName: SOURCE_NAME,
    sourceUrl: null,
    notes: [`Izvor: PDF stran ${recipe.page}.`, ...(recipe.notes ?? [])].join(
      "\n",
    ),
    isFavorite: false,
    status: "published",
    cookedCount: 0,
    lastCookedAt: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ingredients: recipe.ingredients.map((item, sortOrder) => ({
      id: stableUuid("30000000", ++recipeIngredientIndex),
      ingredientId: ingredientId(item.canonicalName),
      canonicalName: item.canonicalName,
      displayName: item.displayName ?? item.canonicalName,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      customUnit: item.customUnit ?? null,
      preparationNote: item.preparationNote ?? null,
      isOptional: item.isOptional ?? false,
      isGarnish: item.isGarnish ?? false,
      sectionName: item.sectionName ?? null,
      sortOrder,
    })),
    steps: recipe.steps.map((item, sortOrder) => ({
      id: stableUuid("40000000", ++stepIndex),
      instruction: item.instruction,
      timerMinutes: item.timerMinutes ?? null,
      imagePath: null,
      sortOrder,
    })),
    tagIds: [],
  })),
  pantryItems: [],
  shoppingListItems: [],
  cookingHistory: [],
  settings: FIXTURE_SETTINGS,
} satisfies CookbookExport;

/**
 * Reviewed, deterministic and schema-validated before any import request can
 * reach Supabase. The API replaces settings with the owner's current settings.
 */
export const familyNotebookCookbook = cookbookExportSchema.parse(rawFixture);

export const FAMILY_NOTEBOOK_RECIPE_TITLES = recipeDefinitions.map(
  (recipe) => recipe.title,
);

export const FAMILY_NOTEBOOK_RECIPE_COUNT =
  FAMILY_NOTEBOOK_RECIPE_TITLES.length;
