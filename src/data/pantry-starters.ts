import { normalizeIngredientName } from "@/lib/domain/ingredients";
import type {
  Ingredient,
  IngredientCategory,
  PantryItem,
  StorageLocation,
} from "@/types/domain";

export type SupportedLocale = "sl" | "en";

export interface IngredientDefinition {
  id: string;
  slug: string;
  names: Record<SupportedLocale, string>;
  aliases: readonly string[];
  category: IngredientCategory;
  defaultUnit: string;
  incrementStep: number;
  starterQuantity: number;
  storageLocation: StorageLocation;
}

type IngredientDefinitionInput = Omit<
  IngredientDefinition,
  "id" | "starterQuantity"
> & {
  starterQuantity?: number;
};

const defineIngredient = (
  definition: IngredientDefinitionInput,
): IngredientDefinition => ({
  ...definition,
  id: `catalog:${definition.slug}`,
  starterQuantity: definition.starterQuantity ?? 0,
});

/**
 * Small, versioned household vocabulary used before an owner has created any
 * database ingredients. English names are stable canonical identities;
 * Slovenian names and aliases are presentation and search terms.
 */
export const pantryStarters: readonly IngredientDefinition[] = [
  defineIngredient({
    slug: "eggs",
    names: { en: "Eggs", sl: "Jajca" },
    aliases: ["egg", "jajce"],
    category: "eggs",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "milk",
    names: { en: "Milk", sl: "Mleko" },
    aliases: ["whole milk", "fresh milk", "sveže mleko", "trajno mleko"],
    category: "dairy",
    defaultUnit: "ml",
    incrementStep: 250,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "coconut-milk",
    names: { en: "Coconut milk", sl: "Kokosovo mleko" },
    aliases: ["coconut cream"],
    category: "canned_goods",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "butter",
    names: { en: "Butter", sl: "Maslo" },
    aliases: ["čajno maslo"],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 50,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "cooking-cream",
    names: { en: "Cooking cream", sl: "Smetana za kuhanje" },
    aliases: ["cream", "smetana", "heavy cream"],
    category: "dairy",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "sour-cream",
    names: { en: "Sour cream", sl: "Kisla smetana" },
    aliases: [],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "yoghurt",
    names: { en: "Yoghurt", sl: "Jogurt" },
    aliases: ["yogurt", "plain yoghurt", "navadni jogurt"],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "cottage-cheese",
    names: { en: "Cottage cheese", sl: "Skuta" },
    aliases: ["curd cheese"],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "mozzarella",
    names: { en: "Mozzarella", sl: "Mocarela" },
    aliases: ["mozzarella cheese"],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "parmesan",
    names: { en: "Parmesan", sl: "Parmezan" },
    aliases: ["parmigiano reggiano"],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 50,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "gouda",
    names: { en: "Gouda", sl: "Gavda" },
    aliases: ["gouda cheese", "sir gavda"],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "cheddar",
    names: { en: "Cheddar", sl: "Čedar" },
    aliases: ["cheddar cheese"],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "feta",
    names: { en: "Feta", sl: "Feta" },
    aliases: ["feta cheese"],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "cheese",
    names: { en: "Cheese", sl: "Sir" },
    aliases: ["edam", "brie", "maasdam", "tilsit", "topljeni sir", "kajmak"],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "bread",
    names: { en: "Bread", sl: "Kruh" },
    aliases: ["loaf", "hleb", "toast"],
    category: "grains",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "counter",
  }),
  defineIngredient({
    slug: "flour",
    names: { en: "Wheat flour", sl: "Pšenična moka" },
    aliases: ["flour", "white flour", "moka", "bela moka"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "whole-wheat-flour",
    names: { en: "Whole wheat flour", sl: "Polnozrnata moka" },
    aliases: ["wholemeal flour"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "breadcrumbs",
    names: { en: "Breadcrumbs", sl: "Drobtine" },
    aliases: ["bread crumbs", "krušne drobtine"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 50,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "sugar",
    names: { en: "Sugar", sl: "Sladkor" },
    aliases: ["white sugar", "beli sladkor"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "brown-sugar",
    names: { en: "Brown sugar", sl: "Rjavi sladkor" },
    aliases: [],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "salt",
    names: { en: "Salt", sl: "Sol" },
    aliases: ["sea salt", "morska sol"],
    category: "spices",
    defaultUnit: "g",
    incrementStep: 50,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "black-pepper",
    names: { en: "Black pepper", sl: "Črni poper" },
    aliases: ["pepper", "poper"],
    category: "spices",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "cooking-oil",
    names: { en: "Cooking oil", sl: "Jedilno olje" },
    aliases: [
      "vegetable oil",
      "sunflower oil",
      "rastlinsko olje",
      "sončnično olje",
    ],
    category: "oils",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "olive-oil",
    names: { en: "Olive oil", sl: "Oljčno olje" },
    aliases: ["olivno olje", "extra virgin olive oil"],
    category: "oils",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "vinegar",
    names: { en: "Vinegar", sl: "Kis" },
    aliases: [
      "wine vinegar",
      "vinski kis",
      "apple cider vinegar",
      "jabolčni kis",
    ],
    category: "condiments",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "rice",
    names: { en: "Rice", sl: "Riž" },
    aliases: ["long grain rice", "dolgozrnati riž"],
    category: "grains",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "basmati-rice",
    names: { en: "Basmati rice", sl: "Basmati riž" },
    aliases: ["basmati"],
    category: "grains",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "spaghetti",
    names: { en: "Spaghetti", sl: "Špageti" },
    aliases: ["spagetti"],
    category: "pasta",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "penne",
    names: { en: "Penne", sl: "Peresniki" },
    aliases: ["penne rigate"],
    category: "pasta",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "macaroni",
    names: { en: "Macaroni", sl: "Makaroni" },
    aliases: ["elbow pasta"],
    category: "pasta",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "pasta",
    names: { en: "Pasta", sl: "Testenine" },
    aliases: ["linguine", "fusilli", "tagliatelle", "testenina"],
    category: "pasta",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "noodles",
    names: { en: "Noodles", sl: "Rezanci" },
    aliases: [
      "egg noodles",
      "jajčni rezanci",
      "rice noodles",
      "riževi rezanci",
    ],
    category: "pasta",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "barley",
    names: { en: "Pearl barley", sl: "Ješprenj" },
    aliases: ["barley"],
    category: "grains",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "polenta",
    names: { en: "Polenta", sl: "Polenta" },
    aliases: ["cornmeal", "koruzni zdrob"],
    category: "grains",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "millet",
    names: { en: "Millet", sl: "Prosena kaša" },
    aliases: ["proso"],
    category: "grains",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "potatoes",
    names: { en: "Potatoes", sl: "Krompir" },
    aliases: ["potato", "krompirji"],
    category: "produce",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "onions",
    names: { en: "Onions", sl: "Čebula" },
    aliases: ["onion", "čebule"],
    category: "produce",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "garlic",
    names: { en: "Garlic", sl: "Česen" },
    aliases: ["garlic cloves", "stroki česna"],
    category: "produce",
    defaultUnit: "clove",
    incrementStep: 1,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "carrots",
    names: { en: "Carrots", sl: "Korenje" },
    aliases: ["carrot", "korenček"],
    category: "produce",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "tomatoes",
    names: { en: "Tomatoes", sl: "Paradižnik" },
    aliases: ["tomato", "paradižniki"],
    category: "produce",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "counter",
  }),
  defineIngredient({
    slug: "broccoli",
    names: { en: "Broccoli", sl: "Brokoli" },
    aliases: [],
    category: "produce",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "canned-tomatoes",
    names: { en: "Canned tomatoes", sl: "Paradižnik v pločevinki" },
    aliases: [
      "tinned tomatoes",
      "chopped tomatoes",
      "pelati",
      "sesekljan paradižnik",
    ],
    category: "canned_goods",
    defaultUnit: "g",
    incrementStep: 400,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "tomato-paste",
    names: { en: "Tomato paste", sl: "Paradižnikov koncentrat" },
    aliases: ["tomato puree", "paradižnikova mezga"],
    category: "canned_goods",
    defaultUnit: "g",
    incrementStep: 50,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "kidney-beans",
    names: { en: "Kidney beans", sl: "Rdeči fižol" },
    aliases: ["red beans"],
    category: "canned_goods",
    defaultUnit: "g",
    incrementStep: 400,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "white-beans",
    names: { en: "White beans", sl: "Beli fižol" },
    aliases: ["cannellini beans"],
    category: "canned_goods",
    defaultUnit: "g",
    incrementStep: 400,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "green-beans",
    names: { en: "Green beans", sl: "Stročji fižol" },
    aliases: ["string beans"],
    category: "frozen",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "freezer",
  }),
  defineIngredient({
    slug: "peas",
    names: { en: "Peas", sl: "Grah" },
    aliases: ["green peas"],
    category: "frozen",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "freezer",
  }),
  defineIngredient({
    slug: "corn",
    names: { en: "Sweetcorn", sl: "Koruza" },
    aliases: ["corn", "sladka koruza"],
    category: "canned_goods",
    defaultUnit: "g",
    incrementStep: 300,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "lentils",
    names: { en: "Lentils", sl: "Leča" },
    aliases: ["red lentils", "rdeča leča", "green lentils"],
    category: "canned_goods",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "chickpeas",
    names: { en: "Chickpeas", sl: "Čičerika" },
    aliases: ["garbanzo beans"],
    category: "canned_goods",
    defaultUnit: "g",
    incrementStep: 400,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "chicken-breast",
    names: { en: "Chicken breast", sl: "Piščančje prsi" },
    aliases: ["chicken fillet", "piščančji file"],
    category: "meat",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "chicken",
    names: { en: "Chicken", sl: "Piščanec" },
    aliases: ["chicken meat", "piščančje meso", "piščančje peruti"],
    category: "meat",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "chicken-thighs",
    names: { en: "Chicken thighs", sl: "Piščančja stegna" },
    aliases: ["chicken thigh"],
    category: "meat",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "beef",
    names: { en: "Beef", sl: "Govedina" },
    aliases: ["beef steak", "goveje meso"],
    category: "meat",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "pork",
    names: { en: "Pork", sl: "Svinjina" },
    aliases: ["pork meat", "svinjsko meso"],
    category: "meat",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "minced-meat",
    names: { en: "Minced meat", sl: "Mleto meso" },
    aliases: ["ground meat", "ground beef", "mešano mleto meso"],
    category: "meat",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "tuna",
    names: { en: "Tuna", sl: "Tuna" },
    aliases: ["canned tuna", "tuna v konzervi"],
    category: "seafood",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "fish",
    names: { en: "Fish", sl: "Ribe" },
    aliases: [
      "salmon",
      "losos",
      "postrv",
      "ribji file",
      "seafood",
      "morski sadeži",
    ],
    category: "seafood",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "freezer",
  }),
  defineIngredient({
    slug: "ham",
    names: { en: "Ham", sl: "Šunka" },
    aliases: ["cooked ham", "kuhana šunka"],
    category: "meat",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "salami",
    names: { en: "Salami", sl: "Salama" },
    aliases: [],
    category: "meat",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "sausages",
    names: { en: "Sausages", sl: "Klobase" },
    aliases: ["sausage", "klobasa", "hrenovke"],
    category: "meat",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "frozen-vegetables",
    names: { en: "Frozen mixed vegetables", sl: "Zamrznjena mešana zelenjava" },
    aliases: ["frozen vegetables", "zamrznjena zelenjava"],
    category: "frozen",
    defaultUnit: "g",
    incrementStep: 250,
    storageLocation: "freezer",
  }),
  defineIngredient({
    slug: "olives",
    names: { en: "Olives", sl: "Olive" },
    aliases: ["black olives", "green olives", "kalamata"],
    category: "canned_goods",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "pickled-peppers",
    names: { en: "Pickled peppers", sl: "Vloženi feferoni" },
    aliases: ["feferoni", "peppers"],
    category: "canned_goods",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "apples",
    names: { en: "Apples", sl: "Jabolka" },
    aliases: ["apple", "jabolko"],
    category: "produce",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "counter",
  }),
  defineIngredient({
    slug: "bananas",
    names: { en: "Bananas", sl: "Banane" },
    aliases: ["banana"],
    category: "produce",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "counter",
  }),
  defineIngredient({
    slug: "lemons",
    names: { en: "Lemons", sl: "Limone" },
    aliases: ["lemon", "limona"],
    category: "produce",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "oranges",
    names: { en: "Oranges", sl: "Pomaranče" },
    aliases: ["orange", "pomaranča"],
    category: "produce",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "counter",
  }),
  defineIngredient({
    slug: "parsley",
    names: { en: "Parsley", sl: "Peteršilj" },
    aliases: ["fresh parsley"],
    category: "herbs",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "basil",
    names: { en: "Basil", sl: "Bazilika" },
    aliases: ["fresh basil"],
    category: "herbs",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "oregano",
    names: { en: "Oregano", sl: "Origano" },
    aliases: ["dried oregano"],
    category: "herbs",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "rosemary",
    names: { en: "Rosemary", sl: "Rožmarin" },
    aliases: [],
    category: "herbs",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "thyme",
    names: { en: "Thyme", sl: "Timijan" },
    aliases: [],
    category: "herbs",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "paprika",
    names: { en: "Paprika powder", sl: "Mleta paprika" },
    aliases: ["paprika", "sweet paprika", "sladka paprika"],
    category: "spices",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "cumin",
    names: { en: "Cumin", sl: "Kumina" },
    aliases: ["ground cumin", "mleta kumina"],
    category: "spices",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "cinnamon",
    names: { en: "Cinnamon", sl: "Cimet" },
    aliases: ["ground cinnamon", "mleti cimet"],
    category: "spices",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "curry-powder",
    names: { en: "Curry powder", sl: "Kari v prahu" },
    aliases: ["curry", "kari"],
    category: "spices",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "chilli-flakes",
    names: { en: "Chilli flakes", sl: "Čilijevi kosmiči" },
    aliases: ["chili flakes", "crushed chilli", "drobljen čili"],
    category: "spices",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "baking-powder",
    names: { en: "Baking powder", sl: "Pecilni prašek" },
    aliases: [],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "yeast",
    names: { en: "Yeast", sl: "Kvas" },
    aliases: ["dry yeast", "suhi kvas", "fresh yeast", "sveži kvas"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 10,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "honey",
    names: { en: "Honey", sl: "Med" },
    aliases: [],
    category: "condiments",
    defaultUnit: "g",
    incrementStep: 50,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "jam",
    names: { en: "Jam", sl: "Marmelada" },
    aliases: ["fruit spread", "džem"],
    category: "condiments",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "mayonnaise",
    names: { en: "Mayonnaise", sl: "Majoneza" },
    aliases: ["mayo"],
    category: "condiments",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "mustard",
    names: { en: "Mustard", sl: "Gorčica" },
    aliases: [],
    category: "condiments",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "ketchup",
    names: { en: "Ketchup", sl: "Kečap" },
    aliases: ["tomato ketchup"],
    category: "condiments",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "soy-sauce",
    names: { en: "Soy sauce", sl: "Sojina omaka" },
    aliases: ["soya sauce"],
    category: "condiments",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "sauce",
    names: { en: "Cooking sauce", sl: "Omaka" },
    aliases: ["bbq sauce", "burger sauce", "sladko-kisla omaka"],
    category: "condiments",
    defaultUnit: "ml",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "stock-cubes",
    names: { en: "Stock cubes", sl: "Jušne kocke" },
    aliases: ["bouillon cubes", "broth cubes", "jušna kocka"],
    category: "condiments",
    defaultUnit: "piece",
    incrementStep: 1,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "rolled-oats",
    names: { en: "Rolled oats", sl: "Ovseni kosmiči" },
    aliases: ["oats", "porridge oats"],
    category: "grains",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "cocoa-powder",
    names: { en: "Cocoa powder", sl: "Kakav v prahu" },
    aliases: ["cocoa", "kakav"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 50,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "baking-chocolate",
    names: { en: "Baking chocolate", sl: "Čokolada za peko" },
    aliases: ["cooking chocolate", "čokolada za kuhanje"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "nuts",
    names: { en: "Nuts", sl: "Oreščki" },
    aliases: ["walnuts", "orehi", "hazelnuts", "lešniki"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "dried-fruit",
    names: { en: "Dried fruit", sl: "Suho sadje" },
    aliases: ["raisins", "sultanine", "suhe slive"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "pantry",
  }),
  defineIngredient({
    slug: "margarine",
    names: { en: "Margarine", sl: "Margarina" },
    aliases: [],
    category: "dairy",
    defaultUnit: "g",
    incrementStep: 50,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "pastry-dough",
    names: { en: "Pastry dough", sl: "Testo za peko" },
    aliases: ["vlečeno testo", "filo pastry"],
    category: "baking",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
  defineIngredient({
    slug: "pate",
    names: { en: "Pâté", sl: "Pašteta" },
    aliases: ["pate"],
    category: "meat",
    defaultUnit: "g",
    incrementStep: 100,
    storageLocation: "fridge",
  }),
] as const;

const normalizeLookup = (value: string) =>
  normalizeIngredientName(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const definitionTokens = (definition: IngredientDefinition) =>
  [
    definition.slug,
    definition.names.en,
    definition.names.sl,
    ...definition.aliases,
  ].map(normalizeLookup);

export function getIngredientDefinition(slug: string) {
  return pantryStarters.find((definition) => definition.slug === slug) ?? null;
}

export function findIngredientDefinitionByText(value: string) {
  const normalized = normalizeLookup(value);
  if (!normalized) return null;
  return (
    pantryStarters.find((definition) =>
      definitionTokens(definition).includes(normalized),
    ) ?? null
  );
}

export function findIngredientDefinition(
  ingredient: Pick<
    Ingredient,
    "id" | "canonicalName" | "displayName" | "normalizedName" | "aliases"
  >,
) {
  if (ingredient.id.startsWith("catalog:")) {
    return getIngredientDefinition(ingredient.id.slice("catalog:".length));
  }
  const candidates = [
    ingredient.canonicalName,
    ingredient.displayName,
    ingredient.normalizedName,
    ...ingredient.aliases,
  ]
    .map(normalizeLookup)
    .filter(Boolean);
  return (
    pantryStarters.find((definition) =>
      definitionTokens(definition).some((token) => candidates.includes(token)),
    ) ?? null
  );
}

export function ingredientDefinitionToIngredient(
  definition: IngredientDefinition,
): Ingredient {
  return {
    id: definition.id,
    canonicalName: definition.names.en,
    displayName: definition.names.en,
    normalizedName: normalizeIngredientName(definition.names.en),
    category: definition.category,
    defaultUnit: definition.defaultUnit,
    aliases: [definition.names.sl, ...definition.aliases],
    isStaple: false,
    notes: null,
  };
}

export function withStarterIngredients(ingredients: readonly Ingredient[]) {
  const definitionsAlreadyPresent = new Set(
    ingredients
      .map(findIngredientDefinition)
      .filter((value): value is IngredientDefinition => Boolean(value))
      .map((definition) => definition.slug),
  );
  return [
    ...ingredients,
    ...pantryStarters
      .filter((definition) => !definitionsAlreadyPresent.has(definition.slug))
      .map(ingredientDefinitionToIngredient),
  ].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export function pantryStarterItems(
  stockedItems: readonly PantryItem[],
): PantryItem[] {
  const stockedDefinitions = new Set(
    stockedItems
      .map((item) => findIngredientDefinition(item.ingredient))
      .filter((value): value is IngredientDefinition => Boolean(value))
      .map((definition) => definition.slug),
  );
  return pantryStarters
    .filter((definition) => !stockedDefinitions.has(definition.slug))
    .map((definition) => ({
      id: `starter:${definition.slug}`,
      ingredientId: definition.id,
      ingredient: ingredientDefinitionToIngredient(definition),
      quantity: definition.starterQuantity,
      unit: definition.defaultUnit,
      storageLocation: definition.storageLocation,
      expirationDate: null,
      lowStock: false,
      isDepleted: definition.starterQuantity === 0,
      notes: null,
      createdAt: "",
      updatedAt: "",
    }));
}

export function pantryAdjustmentStep(
  ingredient: Pick<
    Ingredient,
    "id" | "canonicalName" | "displayName" | "normalizedName" | "aliases"
  >,
  unit: string | null,
) {
  return (
    findIngredientDefinition(ingredient)?.incrementStep ??
    (unit === "g" || unit === "ml" ? 100 : 1)
  );
}
