// Public-domain scripture (World English Bible, WEB) — the translation the studio ships,
// per the brief and docs LR-2. This is a SEED set for the Lyric Lab / Hermes scripture-tie
// features; the full WEB index (all verses + cross-references) replaces it in E1.
// Do NOT add copyrighted translations here.

export interface Verse {
  ref: string; // e.g. "Psalm 23:1"
  text: string; // WEB wording, verbatim
  themes: string[]; // curated tags to aid theme search
}

export const WEB_VERSES: Verse[] = [
  {
    ref: 'Psalm 23:1',
    text: 'Yahweh is my shepherd; I shall lack nothing.',
    themes: ['trust', 'provision', 'shepherd', 'peace'],
  },
  {
    ref: 'Psalm 23:4',
    text: 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.',
    themes: ['fear', 'comfort', 'presence', 'courage'],
  },
  {
    ref: 'Psalm 46:1',
    text: 'God is our refuge and strength, a very present help in trouble.',
    themes: ['strength', 'refuge', 'help', 'trouble'],
  },
  {
    ref: 'Psalm 51:10',
    text: 'Create in me a clean heart, O God. Renew a right spirit within me.',
    themes: ['renewal', 'repentance', 'heart', 'surrender'],
  },
  {
    ref: 'Lamentations 3:22-23',
    text: "It is because of Yahweh's loving kindnesses that we are not consumed, because his compassion doesn't fail. They are new every morning. Great is your faithfulness.",
    themes: ['grace', 'mercy', 'faithfulness', 'morning'],
  },
  {
    ref: 'Isaiah 40:31',
    text: 'but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.',
    themes: ['strength', 'hope', 'weary', 'renewal'],
  },
  {
    ref: 'Matthew 11:28',
    text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.',
    themes: ['rest', 'weary', 'invitation', 'burden'],
  },
  {
    ref: 'John 3:16',
    text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
    themes: ['love', 'salvation', 'gift', 'grace'],
  },
  {
    ref: 'Romans 8:28',
    text: 'We know that all things work together for good for those who love God, for those who are called according to his purpose.',
    themes: ['hope', 'purpose', 'trust', 'good'],
  },
  {
    ref: 'Ephesians 2:8',
    text: 'for by grace you have been saved through faith, and that not of yourselves; it is the gift of God,',
    themes: ['grace', 'faith', 'salvation', 'gift'],
  },
  {
    ref: 'Philippians 4:7',
    text: 'And the peace of God, which surpasses all understanding, will guard your hearts and your minds in Christ Jesus.',
    themes: ['peace', 'comfort', 'heart', 'surrender'],
  },
  {
    ref: '2 Corinthians 12:9',
    text: 'He has said to me, "My grace is sufficient for you, for my power is made perfect in weakness." Most gladly therefore I will rather glory in my weaknesses, that the power of Christ may rest on me.',
    themes: ['grace', 'weakness', 'strength', 'surrender'],
  },
];
