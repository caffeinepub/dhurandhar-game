export type Lang = "en" | "hi";

export interface AlphabetItem {
  letter: string;
  letterHi: string;
  word: string;
  wordHi: string;
  emoji: string;
}

export interface NumberItem {
  num: number;
  emojis: string;
  wordEn: string;
  wordHi: string;
}

export interface ShapeItem {
  name: string;
  nameHi: string;
  emoji: string;
}

export interface AnimalItem {
  name: string;
  nameHi: string;
  emoji: string;
}

export interface MathProblem {
  a: number;
  b: number;
  op: "+" | "-" | "×";
}

export interface SpellingWord {
  word: string;
  wordHi: string;
  emoji: string;
  missingIndex: number;
  classLevel: number;
}

export interface RhymeItem {
  title: string;
  titleHi: string;
  emoji: string;
  lines: string[];
  linesHi: string[];
}

export interface SubjectDef {
  id: string;
  label: string;
  labelHi: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export interface ClassDef {
  id: string;
  label: string;
  labelHi: string;
  emoji: string;
  color: string;
  spellingLevel: number;
  subjects: string[];
}

// ─── ALPHABET ───────────────────────────────────────────────────────────────
export const ALPHABET: AlphabetItem[] = [
  { letter: "A", letterHi: "अ", word: "Apple", wordHi: "सेब", emoji: "🍎" },
  { letter: "B", letterHi: "ब", word: "Ball", wordHi: "गेंद", emoji: "⚽" },
  { letter: "C", letterHi: "च", word: "Cat", wordHi: "बिल्ली", emoji: "🐱" },
  { letter: "D", letterHi: "ड", word: "Dog", wordHi: "कुत्ता", emoji: "🐶" },
  { letter: "E", letterHi: "ए", word: "Elephant", wordHi: "हाथी", emoji: "🐘" },
  { letter: "F", letterHi: "फ", word: "Fish", wordHi: "मछली", emoji: "🐟" },
  { letter: "G", letterHi: "ग", word: "Goat", wordHi: "बकरी", emoji: "🐐" },
  { letter: "H", letterHi: "ह", word: "Horse", wordHi: "घोड़ा", emoji: "🐴" },
  {
    letter: "I",
    letterHi: "इ",
    word: "Ice Cream",
    wordHi: "आइसक्रीम",
    emoji: "🍦",
  },
  {
    letter: "J",
    letterHi: "ज",
    word: "Jellyfish",
    wordHi: "जेलिफ़िश",
    emoji: "🪼",
  },
  { letter: "K", letterHi: "क", word: "Kite", wordHi: "पतंग", emoji: "🪁" },
  { letter: "L", letterHi: "ल", word: "Lion", wordHi: "शेर", emoji: "🦁" },
  { letter: "M", letterHi: "म", word: "Monkey", wordHi: "बंदर", emoji: "🐵" },
  { letter: "N", letterHi: "न", word: "Nest", wordHi: "घोंसला", emoji: "🪺" },
  { letter: "O", letterHi: "ओ", word: "Orange", wordHi: "संतरा", emoji: "🍊" },
  { letter: "P", letterHi: "प", word: "Parrot", wordHi: "तोता", emoji: "🦜" },
  { letter: "Q", letterHi: "क", word: "Queen", wordHi: "रानी", emoji: "👑" },
  { letter: "R", letterHi: "र", word: "Rabbit", wordHi: "खरगोश", emoji: "🐰" },
  { letter: "S", letterHi: "स", word: "Sun", wordHi: "सूरज", emoji: "☀️" },
  { letter: "T", letterHi: "त", word: "Tiger", wordHi: "बाघ", emoji: "🐯" },
  { letter: "U", letterHi: "उ", word: "Umbrella", wordHi: "छाता", emoji: "☂️" },
  { letter: "V", letterHi: "व", word: "Violin", wordHi: "वायलिन", emoji: "🎻" },
  { letter: "W", letterHi: "व", word: "Whale", wordHi: "व्हेल", emoji: "🐋" },
  {
    letter: "X",
    letterHi: "क्स",
    word: "Xylophone",
    wordHi: "जाइलोफ़ोन",
    emoji: "🎵",
  },
  { letter: "Y", letterHi: "य", word: "Yak", wordHi: "याक", emoji: "🐂" },
  { letter: "Z", letterHi: "ज़", word: "Zebra", wordHi: "ज़ेबरा", emoji: "🦓" },
];

// ─── NUMBERS ────────────────────────────────────────────────────────────────
export const NUMBERS: NumberItem[] = [
  { num: 1, emojis: "⭐", wordEn: "One", wordHi: "एक" },
  { num: 2, emojis: "⭐⭐", wordEn: "Two", wordHi: "दो" },
  { num: 3, emojis: "⭐⭐⭐", wordEn: "Three", wordHi: "तीन" },
  { num: 4, emojis: "🍎🍎🍎🍎", wordEn: "Four", wordHi: "चार" },
  { num: 5, emojis: "🌟🌟🌟🌟🌟", wordEn: "Five", wordHi: "पाँच" },
  { num: 6, emojis: "🎈🎈🎈🎈🎈🎈", wordEn: "Six", wordHi: "छह" },
  { num: 7, emojis: "🐟🐟🐟🐟🐟🐟🐟", wordEn: "Seven", wordHi: "सात" },
  { num: 8, emojis: "🍊🍊🍊🍊🍊🍊🍊🍊", wordEn: "Eight", wordHi: "आठ" },
  { num: 9, emojis: "🌸🌸🌸🌸🌸🌸🌸🌸🌸", wordEn: "Nine", wordHi: "नौ" },
  { num: 10, emojis: "🦋🦋🦋🦋🦋🦋🦋🦋🦋🦋", wordEn: "Ten", wordHi: "दस" },
  { num: 11, emojis: "⚽x11", wordEn: "Eleven", wordHi: "ग्यारह" },
  { num: 12, emojis: "🍕x12", wordEn: "Twelve", wordHi: "बारह" },
  { num: 13, emojis: "🎁x13", wordEn: "Thirteen", wordHi: "तेरह" },
  { num: 14, emojis: "🌈x14", wordEn: "Fourteen", wordHi: "चौदह" },
  { num: 15, emojis: "🚀x15", wordEn: "Fifteen", wordHi: "पंद्रह" },
  { num: 16, emojis: "🐸x16", wordEn: "Sixteen", wordHi: "सोलह" },
  { num: 17, emojis: "🎠x17", wordEn: "Seventeen", wordHi: "सत्रह" },
  { num: 18, emojis: "🌺x18", wordEn: "Eighteen", wordHi: "अठारह" },
  { num: 19, emojis: "🦄x19", wordEn: "Nineteen", wordHi: "उन्नीस" },
  { num: 20, emojis: "🎉x20", wordEn: "Twenty", wordHi: "बीस" },
];

// Numbers 1-50 for Class 2
export const NUMBERS_ADVANCED: NumberItem[] = [
  ...NUMBERS,
  { num: 21, emojis: "🌻x21", wordEn: "Twenty-One", wordHi: "इक्कीस" },
  { num: 22, emojis: "🍦x22", wordEn: "Twenty-Two", wordHi: "बाईस" },
  { num: 25, emojis: "🎯x25", wordEn: "Twenty-Five", wordHi: "पच्चीस" },
  { num: 30, emojis: "🏆x30", wordEn: "Thirty", wordHi: "तीस" },
  { num: 40, emojis: "🌟x40", wordEn: "Forty", wordHi: "चालीस" },
  { num: 50, emojis: "💯x50", wordEn: "Fifty", wordHi: "पचास" },
];

// ─── SHAPES ─────────────────────────────────────────────────────────────────
export const SHAPES: ShapeItem[] = [
  { name: "Circle", nameHi: "वृत्त", emoji: "⭕" },
  { name: "Square", nameHi: "वर्ग", emoji: "🟥" },
  { name: "Triangle", nameHi: "त्रिकोण", emoji: "🔺" },
  { name: "Rectangle", nameHi: "आयत", emoji: "▬" },
  { name: "Star", nameHi: "तारा", emoji: "⭐" },
  { name: "Heart", nameHi: "दिल", emoji: "❤️" },
  { name: "Diamond", nameHi: "हीरा", emoji: "💎" },
  { name: "Oval", nameHi: "अंडाकार", emoji: "🥚" },
];

// ─── COLORS ─────────────────────────────────────────────────────────────────
export interface ColorItem {
  name: string;
  nameHi: string;
  hex: string;
  emoji: string;
}
export const COLORS: ColorItem[] = [
  { name: "Red", nameHi: "लाल", hex: "#EF4444", emoji: "🔴" },
  { name: "Blue", nameHi: "नीला", hex: "#3B82F6", emoji: "🔵" },
  { name: "Green", nameHi: "हरा", hex: "#22C55E", emoji: "🟢" },
  { name: "Yellow", nameHi: "पीला", hex: "#EAB308", emoji: "🟡" },
  { name: "Orange", nameHi: "नारंगी", hex: "#F97316", emoji: "🟠" },
  { name: "Purple", nameHi: "बैंगनी", hex: "#A855F7", emoji: "🟣" },
  { name: "Pink", nameHi: "गुलाबी", hex: "#EC4899", emoji: "🩷" },
  { name: "White", nameHi: "सफ़ेद", hex: "#F3F4F6", emoji: "⬜" },
  { name: "Black", nameHi: "काला", hex: "#1F2937", emoji: "⬛" },
  { name: "Brown", nameHi: "भूरा", hex: "#92400E", emoji: "🟫" },
];

// ─── ANIMALS ────────────────────────────────────────────────────────────────
export const ANIMALS: AnimalItem[] = [
  { name: "Dog", nameHi: "कुत्ता", emoji: "🐶" },
  { name: "Cat", nameHi: "बिल्ली", emoji: "🐱" },
  { name: "Cow", nameHi: "गाय", emoji: "🐄" },
  { name: "Horse", nameHi: "घोड़ा", emoji: "🐴" },
  { name: "Lion", nameHi: "शेर", emoji: "🦁" },
  { name: "Tiger", nameHi: "बाघ", emoji: "🐯" },
  { name: "Elephant", nameHi: "हाथी", emoji: "🐘" },
  { name: "Monkey", nameHi: "बंदर", emoji: "🐵" },
  { name: "Rabbit", nameHi: "खरगोश", emoji: "🐰" },
  { name: "Bird", nameHi: "पक्षी", emoji: "🐦" },
  { name: "Fish", nameHi: "मछली", emoji: "🐟" },
  { name: "Frog", nameHi: "मेंढक", emoji: "🐸" },
  { name: "Snake", nameHi: "साँप", emoji: "🐍" },
  { name: "Butterfly", nameHi: "तितली", emoji: "🦋" },
  { name: "Bear", nameHi: "भालू", emoji: "🐻" },
  { name: "Penguin", nameHi: "पेंगुइन", emoji: "🐧" },
  { name: "Duck", nameHi: "बत्तख", emoji: "🦆" },
  { name: "Fox", nameHi: "लोमड़ी", emoji: "🦊" },
  { name: "Giraffe", nameHi: "जिराफ़", emoji: "🦒" },
  { name: "Zebra", nameHi: "ज़ेबरा", emoji: "🦓" },
];

// ─── FRUITS & VEGETABLES (Class 1) ──────────────────────────────────────────
export interface FruitItem {
  name: string;
  nameHi: string;
  emoji: string;
}
export const FRUITS: FruitItem[] = [
  { name: "Apple", nameHi: "सेब", emoji: "🍎" },
  { name: "Mango", nameHi: "आम", emoji: "🥭" },
  { name: "Banana", nameHi: "केला", emoji: "🍌" },
  { name: "Orange", nameHi: "संतरा", emoji: "🍊" },
  { name: "Grapes", nameHi: "अंगूर", emoji: "🍇" },
  { name: "Watermelon", nameHi: "तरबूज", emoji: "🍉" },
  { name: "Pineapple", nameHi: "अनानास", emoji: "🍍" },
  { name: "Strawberry", nameHi: "स्ट्रॉबेरी", emoji: "🍓" },
  { name: "Tomato", nameHi: "टमाटर", emoji: "🍅" },
  { name: "Coconut", nameHi: "नारियल", emoji: "🥥" },
];

// ─── BODY PARTS (Class 2) ────────────────────────────────────────────────────
export interface BodyPartItem {
  name: string;
  nameHi: string;
  emoji: string;
}
export const BODY_PARTS: BodyPartItem[] = [
  { name: "Eyes", nameHi: "आँखें", emoji: "👀" },
  { name: "Nose", nameHi: "नाक", emoji: "👃" },
  { name: "Ears", nameHi: "कान", emoji: "👂" },
  { name: "Mouth", nameHi: "मुँह", emoji: "👄" },
  { name: "Hands", nameHi: "हाथ", emoji: "✋" },
  { name: "Legs", nameHi: "पैर", emoji: "🦵" },
  { name: "Head", nameHi: "सिर", emoji: "🗣️" },
  { name: "Hair", nameHi: "बाल", emoji: "💇" },
  { name: "Teeth", nameHi: "दाँत", emoji: "🦷" },
  { name: "Fingers", nameHi: "उँगलियाँ", emoji: "🖐️" },
];

// ─── MATH PROBLEMS ──────────────────────────────────────────────────────────
export const MATH_PROBLEMS: MathProblem[] = [
  { a: 1, b: 1, op: "+" },
  { a: 2, b: 3, op: "+" },
  { a: 4, b: 2, op: "+" },
  { a: 3, b: 5, op: "+" },
  { a: 6, b: 4, op: "+" },
  { a: 7, b: 2, op: "+" },
  { a: 5, b: 5, op: "+" },
  { a: 8, b: 1, op: "+" },
  { a: 5, b: 2, op: "-" },
  { a: 7, b: 3, op: "-" },
  { a: 8, b: 4, op: "-" },
  { a: 6, b: 2, op: "-" },
  { a: 9, b: 5, op: "-" },
  { a: 10, b: 3, op: "-" },
];

export const MATH_PROBLEMS_CLASS3: MathProblem[] = [
  { a: 12, b: 8, op: "+" },
  { a: 15, b: 7, op: "+" },
  { a: 23, b: 14, op: "+" },
  { a: 31, b: 19, op: "+" },
  { a: 45, b: 25, op: "+" },
  { a: 20, b: 8, op: "-" },
  { a: 35, b: 17, op: "-" },
  { a: 50, b: 23, op: "-" },
  { a: 4, b: 3, op: "×" },
  { a: 5, b: 5, op: "×" },
  { a: 6, b: 4, op: "×" },
  { a: 7, b: 3, op: "×" },
];

export const MATH_PROBLEMS_CLASS4: MathProblem[] = [
  { a: 24, b: 36, op: "+" },
  { a: 58, b: 43, op: "+" },
  { a: 75, b: 28, op: "-" },
  { a: 91, b: 47, op: "-" },
  { a: 8, b: 7, op: "×" },
  { a: 9, b: 6, op: "×" },
  { a: 12, b: 4, op: "×" },
  { a: 11, b: 8, op: "×" },
  { a: 6, b: 9, op: "×" },
  { a: 7, b: 8, op: "×" },
];

// ─── SPELLING WORDS ─────────────────────────────────────────────────────────
export const SPELLING_WORDS: SpellingWord[] = [
  // Nursery - level 0 (2-3 letter words)
  {
    word: "CAT",
    wordHi: "CAT - बिल्ली",
    emoji: "🐱",
    missingIndex: 1,
    classLevel: 0,
  },
  {
    word: "DOG",
    wordHi: "DOG - कुत्ता",
    emoji: "🐶",
    missingIndex: 2,
    classLevel: 0,
  },
  {
    word: "SUN",
    wordHi: "SUN - सूरज",
    emoji: "☀️",
    missingIndex: 0,
    classLevel: 0,
  },
  {
    word: "CUP",
    wordHi: "CUP - कप",
    emoji: "☕",
    missingIndex: 2,
    classLevel: 0,
  },
  {
    word: "BED",
    wordHi: "BED - बिस्तर",
    emoji: "🛏️",
    missingIndex: 1,
    classLevel: 0,
  },
  {
    word: "BAT",
    wordHi: "BAT - चमगादड़",
    emoji: "🦇",
    missingIndex: 0,
    classLevel: 0,
  },
  {
    word: "HEN",
    wordHi: "HEN - मुर्गी",
    emoji: "🐔",
    missingIndex: 2,
    classLevel: 0,
  },
  // KG - level 1 (3-4 letter words)
  {
    word: "BOOK",
    wordHi: "BOOK - किताब",
    emoji: "📚",
    missingIndex: 2,
    classLevel: 1,
  },
  {
    word: "BIRD",
    wordHi: "BIRD - पक्षी",
    emoji: "🐦",
    missingIndex: 1,
    classLevel: 1,
  },
  {
    word: "FROG",
    wordHi: "FROG - मेंढक",
    emoji: "🐸",
    missingIndex: 3,
    classLevel: 1,
  },
  {
    word: "CAKE",
    wordHi: "CAKE - केक",
    emoji: "🎂",
    missingIndex: 0,
    classLevel: 1,
  },
  {
    word: "FISH",
    wordHi: "FISH - मछली",
    emoji: "🐟",
    missingIndex: 2,
    classLevel: 1,
  },
  {
    word: "DUCK",
    wordHi: "DUCK - बत्तख",
    emoji: "🦆",
    missingIndex: 1,
    classLevel: 1,
  },
  {
    word: "MILK",
    wordHi: "MILK - दूध",
    emoji: "🥛",
    missingIndex: 3,
    classLevel: 1,
  },
  // Class 1 - level 2 (4-5 letter words)
  {
    word: "APPLE",
    wordHi: "APPLE - सेब",
    emoji: "🍎",
    missingIndex: 3,
    classLevel: 2,
  },
  {
    word: "TRAIN",
    wordHi: "TRAIN - ट्रेन",
    emoji: "🚂",
    missingIndex: 2,
    classLevel: 2,
  },
  {
    word: "CHAIR",
    wordHi: "CHAIR - कुर्सी",
    emoji: "🪑",
    missingIndex: 1,
    classLevel: 2,
  },
  {
    word: "MANGO",
    wordHi: "MANGO - आम",
    emoji: "🥭",
    missingIndex: 4,
    classLevel: 2,
  },
  {
    word: "GRAPE",
    wordHi: "GRAPE - अंगूर",
    emoji: "🍇",
    missingIndex: 0,
    classLevel: 2,
  },
  {
    word: "TABLE",
    wordHi: "TABLE - मेज़",
    emoji: "🪑",
    missingIndex: 2,
    classLevel: 2,
  },
  // Class 2 - level 3 (5 letter words)
  {
    word: "BREAD",
    wordHi: "BREAD - रोटी",
    emoji: "🍞",
    missingIndex: 2,
    classLevel: 3,
  },
  {
    word: "CLOUD",
    wordHi: "CLOUD - बादल",
    emoji: "☁️",
    missingIndex: 4,
    classLevel: 3,
  },
  {
    word: "GRASS",
    wordHi: "GRASS - घास",
    emoji: "🌿",
    missingIndex: 1,
    classLevel: 3,
  },
  {
    word: "TIGER",
    wordHi: "TIGER - बाघ",
    emoji: "🐯",
    missingIndex: 0,
    classLevel: 3,
  },
  {
    word: "WATER",
    wordHi: "WATER - पानी",
    emoji: "💧",
    missingIndex: 3,
    classLevel: 3,
  },
  {
    word: "PLANT",
    wordHi: "PLANT - पौधा",
    emoji: "🌱",
    missingIndex: 2,
    classLevel: 3,
  },
  // Class 3 - level 4 (6 letter words)
  {
    word: "ORANGE",
    wordHi: "ORANGE - संतरा",
    emoji: "🍊",
    missingIndex: 3,
    classLevel: 4,
  },
  {
    word: "CASTLE",
    wordHi: "CASTLE - महल",
    emoji: "🏰",
    missingIndex: 4,
    classLevel: 4,
  },
  {
    word: "FLOWER",
    wordHi: "FLOWER - फूल",
    emoji: "🌸",
    missingIndex: 1,
    classLevel: 4,
  },
  {
    word: "FOREST",
    wordHi: "FOREST - जंगल",
    emoji: "🌲",
    missingIndex: 2,
    classLevel: 4,
  },
  {
    word: "BUTTER",
    wordHi: "BUTTER - मक्खन",
    emoji: "🧈",
    missingIndex: 5,
    classLevel: 4,
  },
  // Class 4 - level 5 (7+ letter words)
  {
    word: "DOLPHIN",
    wordHi: "DOLPHIN - डॉल्फिन",
    emoji: "🐬",
    missingIndex: 3,
    classLevel: 5,
  },
  {
    word: "RAINBOW",
    wordHi: "RAINBOW - इंद्रधनुष",
    emoji: "🌈",
    missingIndex: 4,
    classLevel: 5,
  },
  {
    word: "CAPTAIN",
    wordHi: "CAPTAIN - कप्तान",
    emoji: "⚓",
    missingIndex: 2,
    classLevel: 5,
  },
  {
    word: "KITCHEN",
    wordHi: "KITCHEN - रसोई",
    emoji: "🍳",
    missingIndex: 5,
    classLevel: 5,
  },
  {
    word: "CHICKEN",
    wordHi: "CHICKEN - मुर्गा",
    emoji: "🐔",
    missingIndex: 3,
    classLevel: 5,
  },
];

// ─── NURSERY RHYMES ──────────────────────────────────────────────────────────
export const NURSERY_RHYMES: RhymeItem[] = [
  {
    title: "Twinkle Twinkle",
    titleHi: "टिमटिम तारा",
    emoji: "⭐",
    lines: [
      "Twinkle, twinkle, little star,",
      "How I wonder what you are!",
      "Up above the world so high,",
      "Like a diamond in the sky.",
      "Twinkle, twinkle, little star,",
      "How I wonder what you are!",
    ],
    linesHi: [
      "टिमटिम टिमटिम छोटे तारे,",
      "कैसे लगते हो तुम न्यारे!",
      "आसमान में ऊपर बहुत,",
      "जैसे हीरा चमके सदा।",
      "टिमटिम टिमटिम छोटे तारे,",
      "कैसे लगते हो तुम न्यारे!",
    ],
  },
  {
    title: "Baa Baa Black Sheep",
    titleHi: "काली भेड़",
    emoji: "🐑",
    lines: [
      "Baa baa black sheep,",
      "Have you any wool?",
      "Yes sir, yes sir,",
      "Three bags full!",
      "One for the master,",
      "One for the dame,",
      "One for the little boy",
      "Who lives down the lane.",
    ],
    linesHi: [
      "बाबा काली भेड़,",
      "क्या तेरे पास ऊन है?",
      "हाँ जी, हाँ जी,",
      "तीन थैले भरे हैं!",
      "एक मालिक के लिए,",
      "एक मालकिन के लिए,",
      "एक छोटे बच्चे के लिए",
      "जो गली में रहता है।",
    ],
  },
  {
    title: "Humpty Dumpty",
    titleHi: "हम्प्टी डम्प्टी",
    emoji: "🥚",
    lines: [
      "Humpty Dumpty sat on a wall,",
      "Humpty Dumpty had a great fall.",
      "All the king's horses,",
      "And all the king's men,",
      "Couldn't put Humpty together again!",
    ],
    linesHi: [
      "हम्प्टी डम्प्टी दीवार पर बैठा,",
      "हम्प्टी डम्प्टी नीचे गिरा।",
      "राजा के सब घोड़े,",
      "और राजा के सब आदमी,",
      "हम्प्टी को जोड़ न पाए!",
    ],
  },
  {
    title: "Jack and Jill",
    titleHi: "जैक और जिल",
    emoji: "🪣",
    lines: [
      "Jack and Jill went up the hill,",
      "To fetch a pail of water.",
      "Jack fell down and broke his crown,",
      "And Jill came tumbling after!",
    ],
    linesHi: [
      "जैक और जिल पहाड़ पर चढ़े,",
      "पानी लाने के लिए।",
      "जैक गिरा और सिर फूटा,",
      "और जिल भी आ गिरी!",
    ],
  },
  {
    title: "Johny Johny",
    titleHi: "जॉनी जॉनी",
    emoji: "🍬",
    lines: [
      "Johny Johny, yes papa!",
      "Eating sugar? No papa!",
      "Telling lies? No papa!",
      "Open your mouth — Ha ha ha!",
    ],
    linesHi: [
      "जॉनी जॉनी, हाँ पापा!",
      "चीनी खाते? नहीं पापा!",
      "झूठ बोलते? नहीं पापा!",
      "मुँह खोलो — हा हा हा!",
    ],
  },
  {
    title: "Wheels on the Bus",
    titleHi: "बस के पहिए",
    emoji: "🚌",
    lines: [
      "The wheels on the bus go round and round,",
      "Round and round, round and round.",
      "The wheels on the bus go round and round,",
      "All through the town!",
    ],
    linesHi: [
      "बस के पहिए घूमते हैं,",
      "घूमते हैं, घूमते हैं।",
      "बस के पहिए घूमते हैं,",
      "पूरे शहर में!",
    ],
  },
];

// ─── CLASS DEFINITIONS ───────────────────────────────────────────────────────
export const CLASSES: ClassDef[] = [
  {
    id: "nursery",
    label: "Nursery",
    labelHi: "नर्सरी",
    emoji: "🌸",
    color: "#F36C2F",
    spellingLevel: 0,
    subjects: ["rhymes", "alphabet", "numbers", "shapes", "colors", "animals"],
  },
  {
    id: "kg",
    label: "KG",
    labelHi: "केजी",
    emoji: "🌼",
    color: "#25B7C7",
    spellingLevel: 1,
    subjects: ["rhymes", "alphabet", "numbers", "shapes", "colors", "spelling"],
  },
  {
    id: "class1",
    label: "Class 1",
    labelHi: "कक्षा 1",
    emoji: "🌟",
    color: "#F7C948",
    spellingLevel: 2,
    subjects: ["alphabet", "numbers", "animals", "fruits", "spelling", "math"],
  },
  {
    id: "class2",
    label: "Class 2",
    labelHi: "कक्षा 2",
    emoji: "🚀",
    color: "#34A853",
    spellingLevel: 3,
    subjects: [
      "alphabet",
      "numbers",
      "animals",
      "bodyparts",
      "spelling",
      "math",
    ],
  },
  {
    id: "class3",
    label: "Class 3",
    labelHi: "कक्षा 3",
    emoji: "🎯",
    color: "#F36C2F",
    spellingLevel: 4,
    subjects: ["alphabet", "numbers", "animals", "spelling", "math3", "fruits"],
  },
  {
    id: "class4",
    label: "Class 4",
    labelHi: "कक्षा 4",
    emoji: "🏆",
    color: "#25B7C7",
    spellingLevel: 5,
    subjects: [
      "alphabet",
      "numbers",
      "animals",
      "spelling",
      "math4",
      "bodyparts",
    ],
  },
];

// ─── ALL SUBJECT DEFINITIONS ─────────────────────────────────────────────────
export const ALL_SUBJECTS: SubjectDef[] = [
  {
    id: "rhymes",
    label: "Rhymes",
    labelHi: "तुकबंदी",
    emoji: "🎵",
    color: "#F36C2F",
    bgColor: "#FFF3ED",
  },
  {
    id: "alphabet",
    label: "Alphabet",
    labelHi: "वर्णमाला",
    emoji: "🔤",
    color: "#F36C2F",
    bgColor: "#FFF3ED",
  },
  {
    id: "numbers",
    label: "Numbers",
    labelHi: "संख्या",
    emoji: "🔢",
    color: "#25B7C7",
    bgColor: "#E8F9FB",
  },
  {
    id: "shapes",
    label: "Shapes",
    labelHi: "आकार",
    emoji: "🔺",
    color: "#F7C948",
    bgColor: "#FFFBEA",
  },
  {
    id: "colors",
    label: "Colors",
    labelHi: "रंग",
    emoji: "🎨",
    color: "#A855F7",
    bgColor: "#F5F0FF",
  },
  {
    id: "animals",
    label: "Animals",
    labelHi: "जानवर",
    emoji: "🐾",
    color: "#34A853",
    bgColor: "#E8F8EE",
  },
  {
    id: "fruits",
    label: "Fruits",
    labelHi: "फल",
    emoji: "🍎",
    color: "#EF4444",
    bgColor: "#FEF2F2",
  },
  {
    id: "bodyparts",
    label: "Body Parts",
    labelHi: "शरीर के अंग",
    emoji: "🧠",
    color: "#EC4899",
    bgColor: "#FDF2F8",
  },
  {
    id: "spelling",
    label: "Spelling",
    labelHi: "वर्तनी",
    emoji: "✏️",
    color: "#25B7C7",
    bgColor: "#E8F9FB",
  },
  {
    id: "math",
    label: "Math",
    labelHi: "गणित",
    emoji: "➕",
    color: "#F36C2F",
    bgColor: "#FFF3ED",
  },
  {
    id: "math3",
    label: "Math (×÷)",
    labelHi: "गणित (×÷)",
    emoji: "✖️",
    color: "#F36C2F",
    bgColor: "#FFF3ED",
  },
  {
    id: "math4",
    label: "Math (Advanced)",
    labelHi: "गणित (उन्नत)",
    emoji: "🔢",
    color: "#F36C2F",
    bgColor: "#FFF3ED",
  },
];
