<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import ChatPanel from '$lib/components/ChatPanel.svelte';
  import {
    AshtrayMeter,
    Band,
    Badge88x31,
    Button,
    Checkbox,
    CigaretteTimer,
    Dialog,
    HitCounter,
    Link,
    Marquee,
    MenuButton,
    Notice,
    Panel,
    ProgressBar,
    Rule,
    StatusStrip,
    Sticker,
    Tag,
    TextArea,
    TextField,
    Tooltip,
    VideoPanel,
  } from '$lib/components/retro';
  import type { ChatEntry } from '$lib/rtc/room.svelte';

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

  /* What the five minutes are actually like, rather than what the product does.
     One colour per beat, same idea as the numbered steps further down. */
  const heroBeats: { text: string; tone: string }[] = [
    { text: 'somebody will ask what you do', tone: 'bg-teal' },
    { text: 'you will both mention the weather', tone: 'bg-berry' },
    { text: 'one of you will have to go back in', tone: 'bg-gold' },
  ];

  const facts: { label: string; value: string }[] = [
    { label: 'people per room', value: '2' },
    { label: 'accounts', value: 'none' },
    { label: 'things stored', value: 'none' },
    { label: 'a room id looks like', value: '7k2m9qx4tb' },
    { label: 'chat travels', value: 'straight to the other person' },
    { label: 'who else can see it', value: 'nobody' },
  ];

  const steps: { title: string; body: string }[] = [
    {
      title: 'You press the button.',
      body: 'Your browser asks for your camera and microphone. You can say no and still watch and type, though it is a strange way to meet someone.',
    },
    {
      title: 'The server looks for a spare seat.',
      body: 'If somebody is already sitting in a room on their own, you get dropped in with them. If nobody is, you get a brand new room and you wait. You can send that room link to a specific person instead.',
    },
    {
      title: 'The two of you connect directly.',
      body: 'Once there are two of you, your browsers talk to each other rather than through us. The chat runs over the same connection, so nothing you type passes through the server at all.',
    },
    {
      title: 'Somebody goes back inside.',
      body: 'Hang up and you land back here. If they leave first you stay put, and the next person out looking for a room gets matched to you.',
    },
  ];

  const statuses: {
    tone: 'ok' | 'bad' | 'neutral';
    status: string;
    says: string;
    means: string;
  }[] = [
    { tone: 'neutral', status: 'idle', says: 'Not connected', means: 'nothing has started yet' },
    {
      tone: 'neutral',
      status: 'media',
      says: 'Asking for your camera and microphone',
      means: 'the browser is asking, not us',
    },
    {
      tone: 'neutral',
      status: 'connecting',
      says: 'Reaching the server',
      means: 'opening the socket',
    },
    {
      tone: 'neutral',
      status: 'waiting',
      says: 'Waiting for somebody to turn up',
      means: 'you have the room to yourself',
    },
    {
      tone: 'neutral',
      status: 'negotiating',
      says: 'Handshaking with your buddy',
      means: 'two of you, working out the route',
    },
    { tone: 'ok', status: 'connected', says: 'Connected', means: 'you are through' },
    {
      tone: 'bad',
      status: 'full',
      says: 'This room is full',
      means: 'somebody got there before you',
    },
    { tone: 'bad', status: 'error', says: 'Disconnected', means: 'the connection dropped' },
  ];

  const rules: { title: string; body: string }[] = [
    {
      title: 'Two to a room.',
      body: 'A third person who opens the same link gets turned away, so if you want a specific person, send them the link before somebody else wanders in.',
    },
    {
      title: 'Nobody else is listening.',
      body: 'The server passes along the details your browsers need to find each other and nothing else. Video, audio and messages go directly between the two of you.',
    },
    {
      title: 'Nothing is kept.',
      body: 'No recording, no transcript, no account, no email. When you both leave, the room stops existing.',
    },
    {
      title: 'If it is weird, leave.',
      body: 'Hang up ends it immediately, and the next person you get has nothing to do with the last one. There is no report button yet. That is a gap, not a decision.',
    },
    {
      title: 'You do not have to smoke.',
      body: 'Nobody checks. Standing outside counts. Sitting inside pretending to be outside also counts.',
    },
  ];

  /* An example transcript, labelled as one on the page. The site never sees
     real messages -- chat is peer to peer by design. */
  const exampleChat: ChatEntry[] = [
    { id: 'e1', kind: 'system', text: 'Somebody turned up.', at: '2026-03-04T21:14:00.000Z' },
    { id: 'e2', kind: 'chat', text: 'you awake', at: '2026-03-04T21:14:22.000Z', mine: true },
    { id: 'e3', kind: 'chat', text: 'regrettably', at: '2026-03-04T21:14:31.000Z' },
    {
      id: 'e4',
      kind: 'chat',
      text: 'it is raining on my side, what about yours',
      at: '2026-03-04T21:15:02.000Z',
      mine: true,
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

  // Parts bin demo state.
  let demoRoomId = $state('7k2m9qx4tb');
  let demoName = $state('');
  let demoNote = $state('');
  let demoMirror = $state(true);
  let demoDevice = $state('a');
  let demoOpen = $state(false);
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
        Your camera turns on next. Two to a room, nobody else.
      </p>
    </div>

    <ul class="flex flex-col gap-1.5 pt-1">
      {#each heroBeats as beat (beat.text)}
        <li class="flex items-center gap-2.5 text-sm">
          <span class="size-2.5 flex-none border border-ink {beat.tone}" aria-hidden="true"></span>
          {beat.text}
        </li>
      {/each}
    </ul>
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

<!-- Everything below is not converted to a band yet, so it keeps the sheet.
     This wrapper goes away section by section. -->
<div class="rt-frame my-6">
  <div class="rt-frame__body flex flex-col gap-10">
    <!-- ==================== main column + rail ==================== -->
    <div class="rt-columns">
      <div class="flex flex-col gap-10">
        <!-- ---- what this is ---- -->
        <section id="what" class="flex flex-col gap-4">
          <h2>What this is</h2>
          <div class="rt-measure flex flex-col gap-3">
            <p>
              A smoke break with a stranger, over video. You press one button, the server puts you
              in a room with whoever is already waiting, and you talk until one of you goes back
              inside.
            </p>
            <p>
              There is no matching, no interests, no swiping and no queue you can skip. Whoever is
              nearest the front of the line is who you get. Sometimes that is a delight and
              sometimes it is a person eating a sandwich in silence.
            </p>
          </div>

          <Panel tone="putty" dense class="max-w-md">
            <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {#each facts as fact (fact.label)}
                <dt>{fact.label}</dt>
                <dd class="rt-mono">{fact.value}</dd>
              {/each}
            </dl>
          </Panel>
        </section>

        <!-- ---- how it works ---- -->
        <section id="how" class="flex flex-col gap-4">
          <h2>How it works</h2>
          <!-- Numbered because this genuinely is a sequence. -->
          <ol class="border border-ink">
            {#each steps as step, i (step.title)}
              <li class="flex {i > 0 ? 'border-t border-ink' : ''}">
                <span
                  class="rt-mono flex w-10 flex-none items-start justify-center border-r border-ink px-2 py-2.5 text-sm {stepTones[
                    i % stepTones.length
                  ]}"
                >
                  {i + 1}
                </span>
                <div class="flex flex-col gap-1 px-3 py-2.5">
                  <p class="font-semibold">{step.title}</p>
                  <p class="text-sm text-ink-soft">{step.body}</p>
                </div>
              </li>
            {/each}
          </ol>
        </section>

        <!-- ---- the room ---- -->
        <section id="room" class="flex flex-col gap-4">
          <h2>The room, before you're in it</h2>
          <p class="rt-measure">
            This is the room, built out of the same parts as the page you're reading. It's dark here
            because nobody is connected to a page. Two panels, two device buttons, a hang-up, and a
            chat only the two of you can see.
          </p>

          <!-- Stacked rather than side by side: this section already sits inside
             a column narrowed by the widget rail, so the real room's two-column
             layout would squeeze the panels to nothing here. -->
          <div class="flex flex-col gap-3">
            <div class="rt-videogrid">
              <VideoPanel stream={null} label="them" placeholder="nobody yet" />
              <VideoPanel stream={null} label="you" muted placeholder="starting your camera" />
            </div>
            <StatusStrip tone="pending" label="Waiting for somebody to turn up" blink />
            <ChatPanel messages={exampleChat} disabled onSend={() => {}} />
          </div>
          <p class="rt-mono text-xs text-ink-soft">
            the transcript above is an example. the site never sees your messages.
          </p>

          <p class="rt-measure pt-2">
            The line above the room tells you which of eight things is currently happening.
          </p>
          <div class="overflow-x-auto">
            <table class="rt-table">
              <thead>
                <tr>
                  <th scope="col">status</th>
                  <th scope="col">what it says</th>
                  <th scope="col">what that means</th>
                </tr>
              </thead>
              <tbody>
                {#each statuses as row (row.status)}
                  <tr>
                    <td><Tag tone={row.tone} mono>{row.status}</Tag></td>
                    <td>{row.says}</td>
                    <td class="text-ink-soft">{row.means}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="rt-mono text-xs text-ink-soft">
            if the room says something else, it's quoting the error it got.
          </p>
        </section>

        <!-- ---- house rules ---- -->
        <section id="rules" class="flex flex-col gap-4">
          <h2>House rules</h2>
          <div class="border border-ink">
            {#each rules as rule, i (rule.title)}
              <div class="flex flex-col gap-1 px-3 py-2.5 {i > 0 ? 'border-t border-ink' : ''}">
                <p class="font-semibold">{rule.title}</p>
                <p class="rt-measure text-sm text-ink-soft">{rule.body}</p>
              </div>
            {/each}
          </div>
        </section>
      </div>

      <!-- ---- the widget rail ---- -->
      <aside class="flex flex-col gap-4">
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

        <div class="self-center pt-1">
          <Sticker />
        </div>
      </aside>
    </div>

    <Rule variant="double" />

    <!-- ========================= the parts bin ========================= -->
    <section id="parts" class="flex flex-col gap-5">
      <div class="flex flex-col gap-3">
        <h2>The parts bin</h2>
        <p class="rt-measure">
          Every box, button and border on this page comes from a small kit built for this site. It's
          here in full because a component only really exists once you can see all of its states at
          once, and because it's the kind of page the old web was full of.
        </p>
        <p class="rt-measure text-sm text-ink-soft">
          Hover a specimen to watch the shadow collapse. Tab to it to see the focus ring. The
          caption under each one is the exact prop.
        </p>
      </div>

      <Panel title="Surfaces" titleAs="h3" strip="teal">
        {#snippet actions()}
          <span class="rt-mono text-xs">drawer 1 of 6</span>
        {/snippet}
        <p class="rt-mono mb-3 text-xs text-ink-soft">Panel, Rule, Notice, Link</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <figure class="rt-specimen">
            <Panel class="w-full"><p class="text-sm">A plain box.</p></Panel>
            <figcaption>&lt;Panel&gt;</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Panel title="With a strip" class="w-full"><p class="text-sm">A titled box.</p></Panel>
            <figcaption>title="With a strip"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Panel tone="putty" shadow class="w-full"><p class="text-sm">Putty, raised.</p></Panel>
            <figcaption>tone="putty" shadow</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Panel tone="screen" class="w-full"><p class="text-sm">Screen tone.</p></Panel>
            <figcaption>tone="screen"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <div class="flex w-full flex-col gap-2">
              <Rule />
              <Rule variant="double" />
              <Rule variant="dotted" />
            </div>
            <figcaption>variant="solid | double | dotted"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <p class="text-sm">
              An <Link href="#parts">ordinary link</Link> and an
              <Link href="https://gifcities.org" external>external one</Link>.
            </p>
            <figcaption>&lt;Link external&gt;</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Notice class="w-full"><p>Something worth knowing.</p></Notice>
            <figcaption>tone="info"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Notice tone="warn" title="Careful" class="w-full"><p>Something to watch.</p></Notice>
            <figcaption>tone="warn" title</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Notice tone="error" title="It broke" class="w-full"><p>What went wrong.</p></Notice>
            <figcaption>tone="error"</figcaption>
          </figure>
        </div>
      </Panel>

      <Panel title="Controls" titleAs="h3" strip="berry">
        {#snippet actions()}
          <span class="rt-mono text-xs">drawer 2 of 6</span>
        {/snippet}
        <p class="rt-mono mb-3 text-xs text-ink-soft">Button, MenuButton, Dialog, Tooltip</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <figure class="rt-specimen">
            <Button variant="ember">Find me a stranger</Button>
            <figcaption>variant="ember"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Button>Copy the link</Button>
            <figcaption>variant="default"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Button variant="quiet">Leave</Button>
            <figcaption>variant="quiet"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Button variant="danger">Hang up</Button>
            <figcaption>variant="danger"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Button size="sm">Small</Button>
            <figcaption>size="sm"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Button size="lg">Large</Button>
            <figcaption>size="lg"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Button disabled>Unavailable</Button>
            <figcaption>disabled</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Button href={resolve('/room')}>As a link</Button>
            <figcaption>href</figcaption>
          </figure>
          <figure class="rt-specimen">
            <MenuButton
              label="Microphone"
              heading="Microphone"
              value={demoDevice}
              options={[
                { value: 'a', label: 'Built-in microphone' },
                { value: 'b', label: 'Headset' },
                { value: 'c', label: 'Something unplugged', disabled: true },
              ]}
              onSelect={(v) => (demoDevice = v)}
            />
            <figcaption>options, onSelect</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Tooltip text="it copies the room link">
              <Button size="sm">Hover me</Button>
            </Tooltip>
            <figcaption>&lt;Tooltip text&gt;</figcaption>
          </figure>
          <figure class="rt-specimen">
            <Button size="sm" onclick={() => (demoOpen = true)}>Open a dialog</Button>
            <Dialog bind:open={demoOpen} title="Are you sure">
              <p>It closes on Escape, and focus returns to the button that opened it.</p>
              {#snippet footer()}
                <Button onclick={() => (demoOpen = false)}>Close</Button>
              {/snippet}
            </Dialog>
            <figcaption>bind:open, title</figcaption>
          </figure>
        </div>
      </Panel>

      <Panel title="Forms" titleAs="h3" strip="gold">
        {#snippet actions()}
          <span class="rt-mono text-xs">drawer 3 of 6</span>
        {/snippet}
        <p class="rt-mono mb-3 text-xs text-ink-soft">TextField, TextArea, Checkbox</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <figure class="rt-specimen">
            <TextField bind:value={demoRoomId} label="Room id" mono />
            <figcaption>label, mono, bind:value</figcaption>
          </figure>
          <figure class="rt-specimen">
            <TextField
              bind:value={demoName}
              label="Your name"
              hint="Optional. Nobody stores it."
              placeholder="nobody"
            />
            <figcaption>hint, placeholder</figcaption>
          </figure>
          <figure class="rt-specimen">
            <TextField
              value="not a room"
              label="Room id"
              error="Room ids are 4 to 32 characters."
            />
            <figcaption>error</figcaption>
          </figure>
          <figure class="rt-specimen">
            <TextField value="" label="Message" placeholder="waiting for somebody" disabled />
            <figcaption>disabled</figcaption>
          </figure>
          <figure class="rt-specimen">
            <TextArea bind:value={demoNote} label="Say something" rows={3} />
            <figcaption>&lt;TextArea rows&gt;</figcaption>
          </figure>
          <figure class="rt-specimen">
            <div class="flex flex-col gap-2">
              <Checkbox bind:checked={demoMirror} label="Mirror my camera" />
              <Checkbox checked={false} label="Unavailable" disabled />
            </div>
            <figcaption>bind:checked, disabled</figcaption>
          </figure>
        </div>
      </Panel>

      <Panel title="Data" titleAs="h3" strip="moss">
        {#snippet actions()}
          <span class="rt-mono text-xs">drawer 4 of 6</span>
        {/snippet}
        <p class="rt-mono mb-3 text-xs text-ink-soft">StatusStrip, Tag, ProgressBar</p>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <figure class="rt-specimen">
            <div class="flex w-full flex-col gap-2">
              <StatusStrip tone="ok" label="Connected" />
              <StatusStrip tone="pending" label="Waiting for somebody" blink />
              <StatusStrip tone="bad" label="Disconnected" detail="failed" />
            </div>
            <figcaption>tone="ok | pending | bad"</figcaption>
          </figure>
          <figure class="rt-specimen">
            <div class="flex flex-wrap gap-1.5">
              <Tag>neutral</Tag>
              <Tag tone="ok">ok</Tag>
              <Tag tone="warn">warn</Tag>
              <Tag tone="bad">bad</Tag>
              <Tag tone="ember">ember</Tag>
            </div>
            <figcaption>tone, mono</figcaption>
          </figure>
          <figure class="rt-specimen">
            <div class="flex w-full flex-col gap-2">
              <ProgressBar value={0.35} label="ink" />
              <ProgressBar value={0.6} tone="ember" segments={12} label="ember, 12 segments" />
              <ProgressBar value={0.9} tone="moss" label="moss" />
            </div>
            <figcaption>value, segments, tone</figcaption>
          </figure>
        </div>
      </Panel>

      <Panel title="Room parts" titleAs="h3" strip="ember">
        {#snippet actions()}
          <span class="rt-mono text-xs">drawer 5 of 6</span>
        {/snippet}
        <p class="rt-mono mb-3 text-xs text-ink-soft">
          VideoPanel, plus ChatPanel and DeviceControl, which compose the rest.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <figure class="rt-specimen">
            <VideoPanel stream={null} label="them" placeholder="nobody yet" class="w-full" />
            <figcaption>stream, label, placeholder</figcaption>
          </figure>
          <figure class="rt-specimen">
            <VideoPanel
              stream={null}
              label="you"
              mirrored
              ratio="4/3"
              placeholder="camera off"
              class="w-full"
            />
            <figcaption>mirrored, ratio="4/3"</figcaption>
          </figure>
        </div>
      </Panel>

      <Panel title="Old web" titleAs="h3" strip="berry">
        {#snippet actions()}
          <span class="rt-mono text-xs">drawer 6 of 6</span>
        {/snippet}
        <p class="rt-mono mb-3 text-xs text-ink-soft">gifs live in static/gifs. bring your own.</p>
        <div class="flex flex-col gap-3">
          <figure class="rt-specimen">
            <Marquee class="w-full">
              <span>this is a marquee.</span>
              <span>it pauses when you hover it.</span>
              <span>it stops entirely if you ask your system for less motion.</span>
            </Marquee>
            <figcaption>speed, direction, pauseOnHover</figcaption>
          </figure>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <figure class="rt-specimen">
              <HitCounter count={417} label="visitors" />
              <figcaption>count, digits, label</figcaption>
            </figure>
            <figure class="rt-specimen">
              <div class="rt-badgewall">
                <Badge88x31 title="Made in Svelte" label="MADE IN" sublabel="SVELTE" tone="berry" />
                <Badge88x31 title="No cookies" label="NO" sublabel="COOKIES" tone="ember" />
                <Badge88x31
                  title="Best viewed outside"
                  label="BEST VIEWED"
                  sublabel="OUTSIDE"
                  tone="gold"
                />
                <Badge88x31 title="Peer to peer" label="PEER 2 PEER" tone="teal" />
              </div>
              <figcaption>label, sublabel, tone</figcaption>
            </figure>
            <figure class="rt-specimen">
              <Sticker size={84} />
              <figcaption>src, rotate, size</figcaption>
            </figure>
            <figure class="rt-specimen">
              <AshtrayMeter count={3} label="cigarettes" />
              <figcaption>count, capacity, label</figcaption>
            </figure>
          </div>
          <figure class="rt-specimen">
            <div class="w-full max-w-72">
              <CigaretteTimer progress={0.55} label="burning down" />
            </div>
            <figcaption>startedAt, durationMs, running</figcaption>
          </figure>
        </div>
      </Panel>
    </section>
  </div>
</div>
