<script lang="ts">
  import { resolve } from '$app/paths';
  import {
    AshtrayMeter,
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

  // Live state so the specimens are actually operable, not screenshots.
  let demoRoomId = $state('7k2m9qx4tb');
  let demoName = $state('');
  let demoNote = $state('');
  let demoMirror = $state(true);
  let demoDevice = $state('a');
  let demoOpen = $state(false);
</script>

<svelte:head>
  <title>the parts bin | cigarettebuddy</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section id="parts" class="flex flex-col gap-5">
  <div class="flex flex-col gap-3">
    <h1>The parts bin</h1>
    <p class="rt-measure">
      Every box, button and border on cigarettebuddy comes from a small kit built for it. It's here
      in full because a component only really exists once you can see all of its states at once, and
      because it's the kind of page the old web was full of.
    </p>
    <p class="rt-measure text-sm text-ink-soft">
      Hover a specimen to watch the shadow collapse. Tab to it to see the focus ring. The caption
      under each one is the exact prop.
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
        <TextField value="not a room" label="Room id" error="Room ids are 4 to 32 characters." />
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
