import { fromNotation, type Markup } from "./markup.ts";

export type Preset = { id: string; name: string; markup: Markup };

// Short, pre-marked practice texts from the first version of SayIt. Stress marks are a teaching
// aid for General American English, not a measurement.
export const PRESETS: Preset[] = [
  {
    id: "small-talk",
    name: "Small talk",
    markup: fromNotation(
      [
        [["[Hey]", "fall"], ["[how's] it {going}", "rise"]],
        [["I was [just] a[bout]_to [grab]_a {cof}fee", "fall"]],
        [["There's a [lit]tle [place] a[round]_the {cor}ner", "fall"], ["that [makes] the [best] cappu[ccino]_in {town}", "fall"]],
      ],
      [
        { word: "cappuccino", say: "kap-uh-CHEE-noh", tip: "Stress the third syllable" },
        { word: "around", say: "uh-ROUND", tip: "The first vowel is a weak “uh”" },
        { word: "isn't", say: "IZ-unt", tip: "Keep the “z” voiced" },
      ],
      [
        "Let your voice rise on a question, then fall on a statement.",
        "Link words that meet: “about_to”, “grab_a”.",
        "Say “the” and “a” as a quick “uh”.",
      ],
    ),
  },
  {
    id: "th-r-t",
    name: "TH, R and T drill",
    markup: fromNotation(
      [
        [["I [think] those [three] [thou]sand [thirs]ty [think]ers [thought]_[through] the {the}ory to[geth]er", "fall"]],
        [["[Ro]ry's [rare] [red] [car] [rare]ly [runs] [right]_in the {rain}", "fall"]],
        [["[Wa]ter", "rise"], ["[be]tter", "rise"], ["[bu]tter", "rise"], ["[ci]ty", "rise"], ["{par}ty", "fall"]],
      ],
      [
        { word: "thousand", say: "THOW-zund", tip: "TH, not S or T" },
        { word: "thirsty", say: "THUR-stee", tip: "TH, then a curled R" },
        { word: "rarely", say: "RAIR-lee", tip: "Two Rs, no rolling" },
        { word: "water", say: "WAH-der", tip: "The T taps like a quick D" },
      ],
      [
        "TH: tongue tip between the teeth, then a soft push of air.",
        "American R: curl the tongue back without touching the roof of the mouth.",
        "A T between vowels taps like a quick D.",
      ],
    ),
  },
  {
    id: "company-of-one",
    name: "Company of One (blurb)",
    markup: fromNotation(
      [
        [["[Com]pany_of {One}", "fall"], ["why [stay]ing {small}", "rise"], ["is the [next] big {thing}", "rise"], ["for {bus}iness", "fall"]],
        [["Paul [Jar]vis [left] the [cor]porate {world}", "rise"], ["when_he [real]ized", "rise"]],
      ],
      [
        { word: "entrepreneurship", say: "ahn-truh-pruh-NUR-ship", tip: "Stress the fourth syllable" },
        { word: "sustainability", say: "suh-stay-nuh-BIL-uh-dee", tip: "Stress BIL" },
        { word: "corporate", say: "KOR-prit", tip: "Two syllables" },
      ],
      [
        "Make the stressed syllable longer and higher; shrink the rest to “uh”.",
        "Let each statement fall at the end.",
        "Link “company_of” and “when_he”.",
      ],
    ),
  },
];
