/**
 * Header slogans, one picked per visit.
 *
 * Voice: lowercase, dry, fatalistic, deadpan. No exclamation marks, no puns
 * that announce themselves, no encouragement to start. A shrug rather than a
 * sales pitch. The occasional non-sequitur ("500 cigarettes") is the point.
 */
export const SLOGANS = [
  // The originals.
  'smoking kills, so does living',
  '500 cigarettes',
  "some people say smoking kills, they're probably right",
  'listen to adults',
  'have a little treat',
  "drunken cigs don't count",
  'bizarre world we live in',
  'does it ever get better?',
  'sometimes you need a break',
  'yolo, so either make it long or make it count',

  // The rest, same register.
  "one more and then i'll stop",
  'the balcony is technically outside',
  "nobody's counting",
  'everything in moderation, including moderation',
  "it's not a habit if you're on holiday",
  'borrowed, never bought',
  'quitting on monday, as always',
  "the lighter is always someone else's",
  'five minutes is five minutes',
  "we're all going somewhere eventually",
  'it pairs with coffee, unfortunately',
  'the last one was also the last one',
  "ash is just paper's retirement",
  'worse things happen at sea',
  "it's cheaper than therapy, barely",
  'the smoking area is the real office',
  'you meet nicer people outside',
  'rain makes it taste better, somehow',
  'a small ritual, badly chosen',
  'the vending machine remembers you',
  'tar, nicotine, and a bit of company',
  'standing outside, thinking about nothing',
  'the good conversations happen out here',
  "it's the break, not the cigarette",
  'everyone out here is avoiding something',
  'two minutes of weather',
  'this is fine, probably',
  'the doctor said things',
  'hold this while i find my lighter',
  "we've all got something",
  'the filter does nothing, they say',
  'the smoke goes up, we go on',
  'spare one? of course not',
  "it's a lifestyle, not a decision",
  'later became now',
  'the ashtray has seen things',
  'nothing lasts, especially this',
  'a cigarette is a unit of time',
  'out here again',
  'still here, still smoking',
  'the alarm did not mention this',
  'bad for you, good for now',
  'the queue outside is the good queue',
  'everybody is somebody else on a break',
  'the weather is doing something',
  'nine minutes past the hour, forever',
  'we are all just waiting for the kettle',
  'there is a bin somewhere',
  'it goes quicker in the cold',
  'the pack said something about this',
  'no gods, no lighters',
  'a habit is just a plan you keep',
  'the smell stays longer than the smoke',
] as const;

/** A slogan for this visit. Called from `load`, never during render. */
export function randomSlogan(): string {
  // Non-null because SLOGANS is a non-empty literal tuple, but
  // noUncheckedIndexedAccess does not know that.
  return SLOGANS[Math.floor(Math.random() * SLOGANS.length)] as string;
}
