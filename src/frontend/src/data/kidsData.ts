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
  op: "+" | "-";
}

export interface SpellingWord {
  word: string;
  wordHi: string;
  emoji: string;
  missingIndex: number;
  classLevel: number;
}

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

export const MATH_PROBLEMS: MathProblem[] = [
  { a: 1, b: 1, op: "+" },
  { a: 2, b: 3, op: "+" },
  { a: 4, b: 2, op: "+" },
  { a: 3, b: 5, op: "+" },
  { a: 6, b: 4, op: "+" },
  { a: 7, b: 2, op: "+" },
  { a: 5, b: 5, op: "+" },
  { a: 8, b: 1, op: "+" },
  { a: 3, b: 7, op: "+" },
  { a: 9, b: 1, op: "+" },
  { a: 5, b: 2, op: "-" },
  { a: 7, b: 3, op: "-" },
  { a: 8, b: 4, op: "-" },
  { a: 6, b: 2, op: "-" },
  { a: 9, b: 5, op: "-" },
  { a: 10, b: 3, op: "-" },
  { a: 4, b: 4, op: "+" },
  { a: 6, b: 6, op: "+" },
  { a: 7, b: 8, op: "+" },
  { a: 10, b: 10, op: "+" },
];

export const SPELLING_WORDS: SpellingWord[] = [
  // Nursery/KG - level 0
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
  // Class 1-2 - level 1
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
  // Class 3-4 - level 2
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
    word: "CLOUD",
    wordHi: "CLOUD - बादल",
    emoji: "☁️",
    missingIndex: 4,
    classLevel: 2,
  },
  {
    word: "GRASS",
    wordHi: "GRASS - घास",
    emoji: "🌿",
    missingIndex: 1,
    classLevel: 2,
  },
  {
    word: "TIGER",
    wordHi: "TIGER - बाघ",
    emoji: "🐯",
    missingIndex: 0,
    classLevel: 2,
  },
];

export const CLASSES = [
  {
    id: "nursery",
    label: "Nursery",
    labelHi: "नर्सरी",
    emoji: "🌸",
    color: "#F36C2F",
    spellingLevel: 0,
  },
  {
    id: "kg",
    label: "KG",
    labelHi: "केजी",
    emoji: "🌼",
    color: "#25B7C7",
    spellingLevel: 0,
  },
  {
    id: "class1",
    label: "Class 1",
    labelHi: "कक्षा 1",
    emoji: "🌟",
    color: "#F7C948",
    spellingLevel: 1,
  },
  {
    id: "class2",
    label: "Class 2",
    labelHi: "कक्षा 2",
    emoji: "🚀",
    color: "#34A853",
    spellingLevel: 1,
  },
  {
    id: "class3",
    label: "Class 3",
    labelHi: "कक्षा 3",
    emoji: "🎯",
    color: "#F36C2F",
    spellingLevel: 2,
  },
  {
    id: "class4",
    label: "Class 4",
    labelHi: "कक्षा 4",
    emoji: "🏆",
    color: "#25B7C7",
    spellingLevel: 2,
  },
];

export const SUBJECTS = [
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
    label: "Shapes & Colors",
    labelHi: "आकार और रंग",
    emoji: "🎨",
    color: "#F7C948",
    bgColor: "#FFFBEA",
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
    id: "math",
    label: "Math",
    labelHi: "गणित",
    emoji: "➕",
    color: "#F36C2F",
    bgColor: "#FFF3ED",
  },
  {
    id: "spelling",
    label: "Spelling",
    labelHi: "वर्तनी",
    emoji: "✏️",
    color: "#25B7C7",
    bgColor: "#E8F9FB",
  },
];
