<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import {
    Band,
    Button,
    CigaretteTimer,
    HitCounter,
    Link,
    Panel,
    Sticker,
    Tag,
  } from '$lib/components/retro';

  /* The one number on this page. There is no presence endpoint, so nothing
     here claims to know how many people are online -- this counts your own
     visits, which is true, and is the joke old-web hit counters were always
     half-making anyway. Read in onMount because this page is server-rendered. */
  let visits = $state(0);
  onMount(() => {
    try {
      const next = Number(localStorage.getItem('cb:visits') ?? '0') + 1;
      localStorage.setItem('cb:visits', String(next));
      visits = next;
    } catch {
      visits = 0;
    }
  });

  const noList = [
    'no sign ups',
    'no accounts',
    'no emails',
    'no notifications',
    'no data stealing',
  ];

  /* Four beats of the experience. These used to explain the signalling server
     and the data channel -- true, but that is what house rules is for. Titles
     stay short on purpose: one that wraps makes its card header taller than
     the other three and the row stops lining up. */
  const steps: { title: string; body: string }[] = [
    {
      title: 'You press the button',
      body: 'Your browser asks for the camera and the microphone. You can say no and still watch and type, which is a strange way to meet someone, but it works.',
    },
    {
      title: "Somebody's out there",
      body: 'If anyone is waiting on their own, you land in with them. If nobody is, you get the room to yourself for a minute, which is also how it goes in real life.',
    },
    {
      title: 'You talk',
      body: 'Weather, work, whatever is going on. It is four in the morning somewhere, so there is always somebody having a worse night than you.',
    },
    {
      title: 'One of you goes back in',
      body: 'Hang up and you are back here. If they leave first you stay put, and the next person out gets matched to you.',
    },
  ];

  /* Three rules. Everything anyone actually needs to be told derives from one
     of them, which is why there are three and not a list of edge cases. */
  const rules: { title: string; body: string }[] = [
    {
      title: "don't be a cunt",
      body: 'you are on video with a stranger who has done nothing to you. no slurs, no shouting, no getting weird. and if someone is being one at you, hang up. you owe them nothing and there is another one along in about four seconds.',
    },
    {
      title: 'be old enough',
      body: 'old enough to buy a pack where you live. we cannot check and we are not going to pretend we can, but if that is not you then this is not for you. it will still be here later.',
    },
    {
      title: 'have a good time',
      body: 'that is the whole point. you do not have to smoke, you do not have to be interesting, and you do not have to stay. four minutes of weather and back inside counts.',
    },
  ];

  /* One colour per step, so the sequence reads as four distinct things rather
     than four identical grey cells. */
  const stepTones = [
    'bg-teal text-paper',
    'bg-berry text-paper',
    'bg-gold text-ink',
    'bg-moss text-paper',
  ];

  /* Ember on the blunt one. */
  const ruleTones = ['bg-ember text-paper', 'bg-gold text-ink', 'bg-moss text-paper'];

  /* A picture of a chat, not a chat. Every string is a literal, the clock
     included -- the real ChatPanel has to hold its timestamps back until
     onMount because toLocaleTimeString disagrees between the server and the
     browser, and this band is server-rendered. Literals never have that
     problem. No "you" in here: the caption says *these people*, so the reader
     is watching two strangers rather than standing in for one of them. */
  const phoneChat: { from: 'left' | 'right' | 'system'; text: string }[] = [
    { from: 'system', text: "it's on, big guy" },
    { from: 'left', text: 'what we smokin' },
    { from: 'right', text: 'whatever was in the drawer' },
    { from: 'left', text: 'type shi' },
  ];

  const faq: { q: string; a: string }[] = [
    {
      q: 'do i have to smoke?',
      a: 'no. nobody checks and nobody can tell. the cigarette is the excuse, not the entry fee. stand outside with a coffee and you are doing the same thing.',
    },
    {
      q: "what if nobody's there?",
      a: 'then you wait a bit. you get the room to yourself until somebody else comes out, and the moment they do you are in with them. it is four in the morning somewhere, so it is rarely long.',
    },
    {
      q: 'what if i get a weirdo?',
      a: 'hang up. that is the whole procedure. you owe a stranger nothing and there is another one along in about four seconds.',
    },
    {
      q: 'can i pick who i get?',
      a: 'no. no list to browse, no filters, no finding your mate. you get whoever else is outside at the same time as you, which is the entire point. if you wanted to talk to someone specific you would have texted them.',
    },
    {
      q: 'how many people are in a room?',
      a: 'two. a hard limit rather than a guideline: a third cannot get in even if they try.',
    },
    {
      q: 'do i need an account?',
      a: 'no. nothing to sign up for, nothing to log into, no email to hand over. you press the button and you are in.',
    },
    {
      q: 'is any of this saved?',
      a: 'no. the room exists while two people are in it and is gone the moment the second one leaves. the chat lives in your browser tab and dies with it. no recording, no transcript, nothing to go back to.',
    },
    {
      q: 'who else can see this?',
      a: "nobody. video and chat go straight from your browser to theirs. our server's whole job is introducing the two of you, and after that it has nothing to do with what you say. if your two networks refuse to talk directly it bounces off a relay to get there, still encrypted, still not something anyone is reading or keeping.",
    },
  ];
</script>

<!-- ============================ hero ============================ -->
<Band
  tone="panel"
  innerClass="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12"
>
  <div class="flex flex-col gap-5">
    <h1 class="rt-display">Go outside. Talk to whoever's there. Come back in.</h1>

    <p class="rt-measure text-lg">
      One button, one stranger, one smoke break. No profiles to read and nothing to match on &mdash;
      just whoever else happens to be outside at the same time as you.
    </p>

    <div class="flex flex-col gap-2">
      <Button variant="ember" size="lg" href={resolve('/room')} class="self-start">
        Find a Buddy
      </Button>
      <p class="rt-mono text-xs text-ink-soft">
        Start your break or join someone already on a break
      </p>
    </div>
  </div>

  <!-- The jpg's background is opaque white and so are the cigarettes in it, so
       knocking the background out would eat them. It sits on a white fill
       instead, and the ink border makes the edge deliberate. -->
  <figure class="flex flex-col gap-2">
    <div class="relative border border-ink bg-white">
      <img
        src="/assets/spy_chad.jpg"
        alt="A cartoon man in a balaclava with a large fistful of lit cigarettes in his mouth."
        width="500"
        height="366"
        class="block h-auto w-full"
      />
      <span
        class="rt-pixel absolute bottom-0 left-0 border-t border-r border-ink bg-ink px-1.5 py-1 text-[0.5625rem] text-glow"
      >
        gentlemen.
      </span>
    </div>
    <figcaption class="rt-mono text-xs text-ink-soft">
      artist's impression. one is plenty.
    </figcaption>
  </figure>
</Band>

<!-- ========================= what this is ========================= -->
<!-- Paper matches the body ground, which would normally make a band invisible.
     It works here only because it is bracketed by panel above and putty below,
     so the ground is never visible beside it and the three surfaces read as
     three bands rather than two. -->
<Band
  id="what"
  tone="paper"
  innerClass="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] lg:gap-14"
>
  <div class="flex flex-col gap-5">
    <h2 class="rt-display rt-display--sm">What this is</h2>

    <p class="text-2xl leading-snug sm:text-3xl">
      ever had a smoke and caught yourself thinking &ldquo;man, i wish i had someone to yap to while
      enjoying this delicious little treat&rdquo;?
    </p>

    <p class="rt-measure text-lg">
      well, congrats. you&rsquo;ve come to the right place. i think. get matched with random people
      around the globe.
    </p>

    <!-- The list of nos as chips rather than one long sentence: it is the most
         scannable thing in the section and as prose it disappeared. -->
    <ul class="flex flex-wrap gap-2">
      {#each noList as item (item)}
        <li><Tag class="px-2 py-1 text-sm">{item}</Tag></li>
      {/each}
    </ul>
    <p class="rt-mono -mt-2 text-xs text-ink-soft">
      (couldn&rsquo;t care less about your data, tbh)
    </p>

    <p class="border-t border-ink pt-4 text-xl">just you and some other guy on a smoke break.</p>
  </div>

  <!-- Sticker is the kit's slot for exactly this. Lazy because the band sits
       below the fold and the gif is 380 KB. -->
  <figure class="flex flex-col items-center gap-2 lg:items-start">
    <Sticker
      src="/gifs/nodding-smoking-monkey-approves.gif"
      alt="A chimpanzee holding a cigarette, nodding slowly in approval."
      size={270}
      rotate={-2}
    />
    <figcaption class="rt-mono text-xs text-ink-soft">
      your potential smoke buddy, not guaranteed tho
    </figcaption>
  </figure>
</Band>

<!-- ========================= how it works ========================= -->
<!-- Putty, with the cards on panel. That layering is not only for depth:
     text-ink-soft on putty is 4.33:1 and fails AA, so the step bodies have to
     sit on a panel fill rather than straight on the band. -->
<Band id="how" tone="putty" innerClass="flex flex-col gap-7">
  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] lg:gap-12">
    <div class="flex flex-col gap-3">
      <h2 class="rt-display rt-display--sm">How it works</h2>
      <p class="rt-measure text-lg">
        It takes about fifteen seconds to get into a room, and most of that is your browser asking
        permission.
      </p>
    </div>

    <figure class="flex flex-col items-center gap-2 lg:items-start">
      <Sticker
        src="/assets/20-sigarettes-thumbnail.webp"
        alt="A product render of a mouthpiece adapter that holds twenty cigarettes at once."
        size={210}
        rotate={2}
      />
      <figcaption class="rt-mono text-xs text-ink">not required. impressive, though.</figcaption>
    </figure>
  </div>

  <!-- Numbered because this genuinely is a sequence. -->
  <ol class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each steps as step, i (step.title)}
      <li class="flex flex-col border border-ink bg-panel">
        <div
          class="flex min-h-[2.75rem] items-center gap-2.5 border-b border-ink px-3 py-2 {stepTones[
            i % stepTones.length
          ]}"
        >
          <span class="rt-mono text-sm">{i + 1}</span>
          <p class="text-sm font-semibold">{step.title}</p>
        </div>
        <p class="px-3 py-2.5 text-sm text-ink-soft">{step.body}</p>
      </li>
    {/each}
  </ol>
</Band>
<!-- ========================= house rules ========================= -->
<!-- Panel, because #how above is putty and a second putty band would merge
     into it. Three big numbered rows rather than the four-card grid #how
     uses -- three rules should not look like four steps. -->
<Band id="rules" tone="panel" innerClass="flex flex-col gap-7">
  <div class="flex flex-col gap-3">
    <h2 class="rt-display rt-display--sm">House rules</h2>
    <p class="rt-measure text-lg">
      three of them. everything else you might be wondering about comes out of these.
    </p>
  </div>

  <ol class="border border-ink">
    {#each rules as rule, i (rule.title)}
      <li
        class="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-6 {i > 0
          ? 'border-t border-ink'
          : ''}"
      >
        <span
          class="rt-mono flex size-14 flex-none items-center justify-center border border-ink text-3xl {ruleTones[
            i
          ]}"
        >
          {i + 1}
        </span>
        <div class="flex flex-col gap-1.5">
          <h3 class="text-2xl">{rule.title}</h3>
          <p class="rt-measure text-lg text-ink-soft">{rule.body}</p>
        </div>
      </li>
    {/each}
  </ol>

  <!-- The three rules again, demonstrated rather than stated. A phone and not
       another figure because the gifs are two people in a call, and that is the
       shape a call has. It is an illustration sitting inside a band, not the
       site putting on device chrome -- VideoPanel's "no bezel screws" note
       still holds for the site's own surfaces. The plate around it is what
       keeps a 19rem phone from floating alone in a 62.5rem band. -->
  <!-- Capped and centred: left to the band's full 62.5rem the plate is a wide
       empty room with a 19rem phone marooned in the middle of it. At 34rem the
       caption wraps to about three lines and the phone has a mat rather than a
       field. -->
  <div class="mx-auto w-full max-w-[34rem] border border-ink">
    <div class="border-b border-ink bg-putty px-4 py-3">
      <!-- Colour chips rather than coloured words: these pick up the numerals
           from the list above, and gold as text on putty is nowhere near AA. -->
      <p class="text-base leading-relaxed">
        Example, these people are
        <span
          class="rt-mono inline-flex size-5 items-center justify-center border border-ink align-[-0.3em] text-xs {ruleTones[0]}"
        >
          1
        </span>
        not being cunts(probably),
        <span
          class="rt-mono inline-flex size-5 items-center justify-center border border-ink align-[-0.3em] text-xs {ruleTones[1]}"
        >
          2
        </span>
        are old enough(for sure),
        <span
          class="rt-mono inline-flex size-5 items-center justify-center border border-ink align-[-0.3em] text-xs {ruleTones[2]}"
        >
          3
        </span>
        having a good time(debatable). follow this example
      </p>
    </div>

    <!-- Paper under a panel band: a half-tone darker, so the phone reads as
         lying on something rather than floating on the band itself. -->
    <div class="bg-paper px-4 py-8">
      <div class="rt-raise mx-auto w-full max-w-[19rem] border border-ink bg-putty px-3 pt-3 pb-4">
        <!-- The earpiece slot and the home button are the only round things on
             this site, and they stay round: they are drawn hardware, not UI.
             `rounded-full` is a literal infinity and never reads `--radius`,
             which is 0rem everywhere else, so this does not fight the token. -->
        <div class="mx-auto mb-2.5 h-1.5 w-14 rounded-full bg-ink/70"></div>

        <div class="rt-inset overflow-hidden border border-ink bg-screen">
          <div
            class="rt-pixel flex items-center justify-between bg-ink px-1.5 py-1 text-[0.5rem] text-glow"
          >
            <span>CIGBUDDY</span>
            <span>04:12</span>
          </div>

          <!-- Both gifs are heavy, 1.1 MB and 2.1 MB, and this band sits a long
               way below the fold, so they are lazy: nothing downloads until
               somebody actually scrolls this far. -->
          <div class="relative aspect-[4/3]">
            <img
              src="/gifs/calmest_man_in.gif"
              alt="A man on a webcam taking a long drag on a cigarette without changing expression."
              width="220"
              height="220"
              loading="lazy"
              decoding="async"
              class="block h-full w-full object-cover object-center"
            />
            <span
              class="rt-pixel absolute bottom-0 left-0 border-t border-r border-ink bg-ink px-1.5 py-1 text-[0.5625rem] text-glow"
            >
              one of them
            </span>
          </div>

          <div class="relative aspect-[4/3] border-t border-ink">
            <img
              src="/gifs/old_guy_smoking.gif"
              alt="An older man on a webcam smoking and looking pleased about it."
              width="220"
              height="219"
              loading="lazy"
              decoding="async"
              class="block h-full w-full object-cover object-center"
            />
            <span
              class="rt-pixel absolute bottom-0 left-0 border-t border-r border-ink bg-ink px-1.5 py-1 text-[0.5625rem] text-glow"
            >
              the other one
            </span>
          </div>

          <!-- Both bubbles are light fills. On a screen-coloured ground there
               is no dark side to put one on and still read it. -->
          <div class="flex flex-col gap-1.5 border-t border-ink p-2">
            {#each phoneChat as line (line.text)}
              {#if line.from === 'system'}
                <p class="rt-mono text-center text-[0.625rem] text-glow/70">{line.text}</p>
              {:else}
                <p
                  class="max-w-[85%] border border-ink px-2 py-1 text-[0.6875rem] text-ink {line.from ===
                  'right'
                    ? 'self-end bg-putty'
                    : 'self-start bg-panel'}"
                >
                  {line.text}
                </p>
              {/if}
            {/each}
          </div>
        </div>

        <div class="mx-auto mt-3 size-7 rounded-full border border-ink bg-panel"></div>
      </div>
    </div>
  </div>
</Band>

<!-- ============================= faq ============================= -->
<!-- Paper, between panel above and putty below, so no two adjacent bands share
     a surface. Same ink-bordered hairline-separated list as the house rules
     <ol> above it, so the two read as siblings rather than two inventions.

     Native <details>: the rows open independently and all start closed, which
     is what <details> does on its own. No state, nothing to hydrate, and it
     still works with JavaScript off. -->
<Band id="faq" tone="paper" innerClass="flex flex-col gap-7">
  <div class="flex flex-col gap-3">
    <h2 class="rt-display rt-display--sm">Questions</h2>
    <p class="rt-measure text-lg">the ones people actually might ask</p>
  </div>

  <ul class="border border-ink">
    {#each faq as item, i (item.q)}
      <li class={i > 0 ? 'border-t border-ink' : ''}>
        <details class="rt-faq">
          <summary>
            <span class="rt-faq__mark" aria-hidden="true"></span>
            <span class="text-xl">{item.q}</span>
          </summary>
          <p class="rt-faq__body rt-measure text-lg text-ink-soft max-w-none">{item.a}</p>
        </details>
      </li>
    {/each}
  </ul>
</Band>

<!-- ========================== the widgets ========================== -->
<!-- Was the sidebar next to #room and #rules. With both gone it has no column
     to live in, so it becomes a row of its own. -->
<Band tone="putty" innerClass="grid gap-4 sm:grid-cols-3">
  <Panel title="your visits" titleAs="h2" pixel dense strip="teal">
    <HitCounter count={visits} label="visits from this browser" />
  </Panel>

  <Panel title="one cigarette" titleAs="h2" pixel dense strip="ember">
    <!-- An illustration, not a clock: a fixed burn, so it reads as a
         cigarette and renders identically on the server and the client. -->
    <CigaretteTimer progress={0.32} />
    <p class="mt-2 text-xs text-ink-soft">
      About seven minutes, which is a decent length for a conversation with a stranger.
    </p>
  </Panel>

  <Panel title="what this is not" titleAs="h2" pixel dense strip="gold">
    <ul class="flex flex-col gap-1 text-xs text-ink-soft">
      <li>not a dating app</li>
      <li>not a group call</li>
      <li>not recorded</li>
      <li>not a place to sell anything</li>
    </ul>
  </Panel>
</Band>

<!-- =========================== about me =========================== -->
<!-- Panel: the band above is putty, and panel also continues the page's
     panel/paper/putty rotation rather than interrupting it. Kept out of the
     nav on purpose -- nobody navigates to a bio, they arrive at it by reaching
     the end -- but it carries an id so it can still be linked to. -->
<Band id="about" tone="panel" innerClass="flex flex-col gap-7">
  <!-- Side by side from `sm` rather than `lg` like the other bands: their image
       columns are 18-22rem and need the room, this one is 14rem and only strands
       the portrait above a lone heading if it waits for 1024px. -->
  <div
    class="grid items-start gap-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-8 lg:gap-12"
  >
    <!-- The portrait sits left, against the page's run of image-right bands.
         Every other image here is a joke decorating an explanation; this one is
         a face attached to a name, and that reads as a byline. The png is
         opaque black to its edges, so it gets a screen fill and an ink border
         for the same reason the hero's white-backed jpg does. -->
    <figure class="flex max-w-[14rem] flex-col gap-2">
      <div class="relative border border-ink bg-screen">
        <img
          src="/assets/murka_nakurka.png"
          alt="A ginger and white cat with absurdly long ears and a lit cigarette in its mouth."
          width="645"
          height="598"
          loading="lazy"
          decoding="async"
          class="block h-auto w-full"
        />
        <span
          class="rt-pixel absolute bottom-0 left-0 border-t border-r border-ink bg-ink px-1.5 py-1 text-[0.5625rem] text-glow"
        >
          cigdev
        </span>
      </div>
      <figcaption class="rt-mono text-xs text-ink-soft">literally me</figcaption>
    </figure>

    <div class="flex flex-col gap-4">
      <h2 class="rt-display rt-display--sm">About me</h2>

      <p class="text-2xl leading-snug">Hi, i&rsquo;m CigDev, creator of this website.</p>

      <p class="rt-measure text-lg text-ink-soft">
        the other night i had a brilliant idea to create this thing right here, idk how it will do
        and if anyone would use it but decided fuck it, let&rsquo;s have a little fun and see how it
        works out. i don&rsquo;t want to make a commercial product out of this, this is really just
        a social experiment hastily put together, idk how long it will run for, but hope you enjoy
        it while it lasts.
      </p>
    </div>
  </div>

  <!-- Same ink-bordered hairline-split box as the house rules list and the faq,
       so the page's closing element rhymes with the two above it instead of
       being a third kind of container. -->
  <div class="border border-ink">
    <p class="p-5 text-lg">
      any questions? contact me at <a href="mailto:cigdev13@gmail.com">cigdev13@gmail.com</a>
    </p>
    <p class="border-t border-ink p-5 text-lg">
      help run them servers! or just tell me your appreciation here:
      <!-- nowrap so the hyphen in "ko-fi" is not treated as a break opportunity:
           at narrow widths it otherwise splits into "ko-" / "fi.com/cigdev". The
           URL is short enough that keeping it whole never overflows. -->
      <Link href="https://ko-fi.com/cigdev" external class="whitespace-nowrap">
        ko-fi.com/cigdev
      </Link>
    </p>
  </div>
</Band>
