<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import MicIcon from '@lucide/svelte/icons/mic';
  import MicOffIcon from '@lucide/svelte/icons/mic-off';
  import VideoIcon from '@lucide/svelte/icons/video';
  import VideoOffIcon from '@lucide/svelte/icons/video-off';
  import FlagIcon from '@lucide/svelte/icons/flag';
  import { CHAT_DURATION_MS, type ReportReason } from '@cigbuddy/shared';
  import ChatPanel from '$lib/components/ChatPanel.svelte';
  import DeviceControl from '$lib/components/DeviceControl.svelte';
  import ReportDialog from '$lib/components/ReportDialog.svelte';
  import {
    AshtrayMeter,
    Button,
    CigaretteTimer,
    Link,
    Notice,
    Panel,
    StatusStrip,
    Tooltip,
    TopicCard,
    VideoPanel,
  } from '$lib/components/retro';
  import { RoomSession, type RoomStatus } from '$lib/rtc/room.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const room = new RoomSession();

  const STATUS_TEXT: Record<RoomStatus, string> = {
    idle: 'Not connected',
    media: 'Asking for your camera and microphone',
    connecting: 'Reaching the server',
    waiting: 'Waiting for somebody to turn up',
    negotiating: 'Handshaking with your buddy',
    connected: 'Connected',
    full: 'This room is full',
    expired: "That's the break",
    error: 'Disconnected',
  };

  const statusText = $derived(
    room.status === 'error' && room.error ? room.error : STATUS_TEXT[room.status],
  );
  const statusTone = $derived(
    room.status === 'connected'
      ? 'ok'
      : room.status === 'error' || room.status === 'full' || room.status === 'expired'
        ? 'bad'
        : 'pending',
  );

  // The clock is the server's; `deadline` is its end on this browser's clock.
  // CigaretteTimer wants a start, so work back one cigarette from the end.
  const litAt = $derived(room.deadline === null ? null : room.deadline - CHAT_DURATION_MS);

  const lightLabel = $derived(
    room.iWantAnother
      ? 'Waiting on them'
      : room.theyWantAnother
        ? 'They want another one'
        : 'Light another one',
  );

  // The other side has voted and this one has not: the one moment the room
  // actually wants something from you, so it gets a notice, a blink and a tip.
  const attention = $derived(
    room.status === 'connected' && room.theyWantAnother && !room.iWantAnother,
  );

  let reportOpen = $state(false);

  onMount(() => {
    void (data.roomId ? room.join(data.roomId) : room.joinRandom());

    const bye = () => room.destroy();
    window.addEventListener('beforeunload', bye);
    return () => {
      window.removeEventListener('beforeunload', bye);
      room.destroy();
    };
  });

  // Once a random match lands, rewrite `/room` to `/room/<id>` so refresh and
  // Back/Forward all see the real room. Same route id, so the component is
  // reused and `load` simply re-runs with the id. `next()` goes through here
  // too: the id empties, then fills with the new room.
  $effect(() => {
    if (room.roomId && data.roomId !== room.roomId) {
      void goto(resolve('/room/[[id]]', { id: room.roomId }), {
        replaceState: true,
        noScroll: true,
        keepFocus: true,
      });
    }
  });

  // Both exits replace the history entry, so Back from the front page does not
  // walk straight back into the room that was just left.
  function leave() {
    room.destroy();
    void goto(resolve('/'), { replaceState: true });
  }

  function report(reason: ReportReason, note?: string) {
    room.report(reason, note);
    void goto(resolve('/'), { replaceState: true });
  }
</script>

<div class="flex flex-col gap-4">
  <!-- Both ways out sit together up here, away from the row of things you do
       while staying. The flag marks the one that also tells us about them. -->
  <Panel dense>
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h1 class="text-xl">
        {#if room.roomId}
          Balcony # <code class="border border-ink bg-putty px-1 py-0.5">{room.roomId}</code>
        {:else}
          Finding you a room
        {/if}
      </h1>
      <div class="flex items-center gap-2">
        <Button size="sm" onclick={leave}>Leave</Button>
        {#if room.status !== 'expired'}
          <Button variant="danger-solid" size="sm" onclick={() => (reportOpen = true)}>
            <FlagIcon aria-hidden="true" />
            Leave and report
          </Button>
        {/if}
      </div>
    </div>
  </Panel>

  <StatusStrip
    tone={statusTone}
    label={statusText}
    detail={room.connectionState !== 'none' && room.connectionState !== 'connected'
      ? room.connectionState
      : undefined}
    blink={statusTone === 'pending'}
  />

  {#if room.status === 'full'}
    <Notice tone="warn" title="This room is full.">
      <p>
        Rooms hold two people and this one already has two. Go back to the front and we'll find you
        a seat somewhere else.
      </p>
      <div class="flex flex-wrap items-center gap-3 pt-1">
        <Button variant="ember" href={resolve('/room')}>Find me a stranger instead</Button>
        <Link href={resolve('/')} variant="quiet">Back to the front</Link>
      </div>
    </Notice>
  {:else}
    <div class="rt-columns">
      <section class="rt-stage">
        <div class="rt-videogrid">
          <VideoPanel
            stream={room.remoteStream}
            label="them"
            placeholder={room.status === 'waiting'
              ? 'nobody yet'
              : room.status === 'expired'
                ? 'gone'
                : 'no picture from them'}
          />
          <VideoPanel
            stream={room.localStream}
            label="you"
            muted
            mirrored
            placeholder={room.mediaDenied ? 'camera off' : 'starting your camera'}
          />
        </div>

        {#if room.status === 'waiting'}
          <p class="rt-measure mx-auto text-center text-sm text-ink-soft">
            The next person out looking for a room lands here.
          </p>
        {/if}

        {#if litAt !== null}
          <div
            class="mx-auto flex w-full max-w-xl flex-wrap items-end justify-center gap-x-6 gap-y-3"
          >
            <CigaretteTimer
              startedAt={litAt}
              durationMs={CHAT_DURATION_MS}
              countdown
              label="left on this one"
              class="w-64 max-w-full"
            />
            <AshtrayMeter count={room.lit} label="smoked together" class="min-w-40" />
          </div>
        {/if}

        <!-- Between the faces and the alarms: where you look while stalling for
             something to say, and far enough from the button row that the
             Notices below stay closest to the controls they talk about. -->
        {#if room.status !== 'expired'}
          <TopicCard
            topic={room.topic}
            ready={room.canChangeTopic}
            onNext={() => room.nextTopic()}
            class="mx-auto w-full max-w-xl"
          />
        {/if}

        {#if room.status === 'expired'}
          <Notice tone="warn" title="That's the break.">
            <p>Ten minutes is ten minutes. The room's gone; your camera isn't.</p>
            <div class="flex flex-wrap items-center gap-3 pt-1">
              <Button variant="ember" onclick={() => void room.next()}>Find next buddy</Button>
              <Button variant="quiet" onclick={leave}>Leave</Button>
            </div>
          </Notice>
        {/if}

        {#if room.status === 'error'}
          <Notice tone="error" title="The connection dropped.">
            <p>{room.error}</p>
            <div class="pt-1">
              <Button onclick={() => void room.rejoin()}>Try again</Button>
            </div>
          </Notice>
        {/if}

        {#if attention}
          <Notice tone="warn" title="They want another one.">
            <p>
              Your buddy's already reaching for the pack. Light one too and the clock goes back to
              ten.
            </p>
            <div class="pt-1">
              <Button variant="ember" onclick={() => room.lightAnother()}>Light one too</Button>
            </div>
          </Notice>
        {/if}

        <div class="rt-buttonrow">
          <DeviceControl
            heading="Microphone"
            label={room.micEnabled ? 'Mute mic' : 'Unmute mic'}
            icon={room.micEnabled ? MicIcon : MicOffIcon}
            active={room.micEnabled}
            disabled={!room.localStream}
            devices={room.audioInputs}
            selected={room.audioDeviceId}
            onToggle={() => room.toggleMic()}
            onSelect={(id) => void room.selectAudioDevice(id)}
          />
          <DeviceControl
            heading="Camera"
            label={room.camEnabled ? 'Stop camera' : 'Start camera'}
            icon={room.camEnabled ? VideoIcon : VideoOffIcon}
            active={room.camEnabled}
            disabled={!room.localStream}
            devices={room.videoInputs}
            selected={room.videoDeviceId}
            onToggle={() => room.toggleCam()}
            onSelect={(id) => void room.selectVideoDevice(id)}
          />
          {#if room.status === 'connected'}
            {#if attention}
              <Tooltip text="Your buddy already voted. Light one too and the clock resets.">
                {#snippet trigger(props)}
                  <Button
                    {...props}
                    variant="ember"
                    class="rt-blink"
                    onclick={() => room.lightAnother()}
                  >
                    {lightLabel}
                  </Button>
                {/snippet}
              </Tooltip>
            {:else}
              <Button disabled={room.iWantAnother} onclick={() => room.lightAnother()}>
                {lightLabel}
              </Button>
            {/if}
          {/if}
          {#if room.status !== 'expired'}
            <Button onclick={() => void room.next()}>Find next buddy</Button>
          {/if}
        </div>
      </section>

      <!-- Boxed so the chat scrolls instead of stretching the page; see .rt-rail. -->
      <div class="rt-rail">
        <ChatPanel
          class="absolute inset-0"
          messages={room.messages}
          disabled={!room.chatReady}
          onSend={(text) => room.sendChat(text)}
        />
      </div>
    </div>
  {/if}
</div>

<ReportDialog bind:open={reportOpen} onSubmit={report} />
