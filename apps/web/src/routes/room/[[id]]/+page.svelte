<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import MicIcon from '@lucide/svelte/icons/mic';
  import MicOffIcon from '@lucide/svelte/icons/mic-off';
  import VideoIcon from '@lucide/svelte/icons/video';
  import VideoOffIcon from '@lucide/svelte/icons/video-off';
  import ChatPanel from '$lib/components/ChatPanel.svelte';
  import DeviceControl from '$lib/components/DeviceControl.svelte';
  import {
    Button,
    CigaretteTimer,
    Link,
    Notice,
    Panel,
    StatusStrip,
    VideoPanel,
  } from '$lib/components/retro';
  import { RoomSession, type RoomStatus } from '$lib/rtc/room.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const room = new RoomSession();
  let copied = $state(false);

  const STATUS_TEXT: Record<RoomStatus, string> = {
    idle: 'Not connected',
    media: 'Asking for your camera and microphone',
    connecting: 'Reaching the server',
    waiting: 'Waiting for somebody to turn up',
    negotiating: 'Handshaking with your buddy',
    connected: 'Connected',
    full: 'This room is full',
    error: 'Disconnected',
  };

  const statusText = $derived(
    room.status === 'error' && room.error ? room.error : STATUS_TEXT[room.status],
  );
  const statusTone = $derived(
    room.status === 'connected'
      ? 'ok'
      : room.status === 'error' || room.status === 'full'
        ? 'bad'
        : 'pending',
  );

  // Derived from the session rather than `location.href`, which still reads
  // `/room` in the same flush that a random match assigns the id.
  const shareUrl = $derived(
    room.roomId ? new URL(resolve('/room/[[id]]', { id: room.roomId }), location.href).href : '',
  );

  // The call clock. RoomSession does not expose a start time and is not ours to
  // change, so the page keeps its own. `untrack` because this effect both reads
  // and writes `connectedAt`.
  let connectedAt = $state<number | null>(null);
  $effect(() => {
    if (room.status === 'connected') {
      if (untrack(() => connectedAt) === null) connectedAt = Date.now();
    } else {
      connectedAt = null;
    }
  });

  onMount(() => {
    void (data.roomId ? room.join(data.roomId) : room.joinRandom());

    const bye = () => room.destroy();
    window.addEventListener('beforeunload', bye);
    return () => {
      window.removeEventListener('beforeunload', bye);
      room.destroy();
    };
  });

  // Once a random match lands, rewrite `/room` to `/room/<id>` so copy-link,
  // refresh and Back/Forward all see the real room. Same route id, so the
  // component is reused and `load` simply re-runs with the id.
  $effect(() => {
    if (room.roomId && data.roomId !== room.roomId) {
      void goto(resolve('/room/[[id]]', { id: room.roomId }), {
        replaceState: true,
        noScroll: true,
        keepFocus: true,
      });
    }
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      copied = false;
    }
  }

  function hangUp() {
    room.hangUp();
    void goto(resolve('/'));
  }
</script>

<div class="flex flex-col gap-4">
  <Panel dense>
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h1 class="text-xl">
        {#if room.roomId}
          Room <code class="border border-ink bg-putty px-1 py-0.5">{room.roomId}</code>
        {:else}
          Finding you a room
        {/if}
      </h1>
      <div class="flex items-center gap-3">
        <Button size="sm" onclick={copyLink} disabled={!shareUrl}>
          {copied ? 'Copied' : 'Copy the link'}
        </Button>
        <Link href={resolve('/')} variant="quiet">Leave</Link>
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
            placeholder={room.status === 'waiting' ? 'nobody yet' : 'no picture from them'}
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
            The next person out looking for a room lands here. If you'd rather choose who turns up,
            send them
            <code class="border border-ink bg-putty px-1 break-all">{shareUrl}</code>
          </p>
        {/if}

        {#if connectedAt}
          <div class="mx-auto w-full max-w-64">
            <CigaretteTimer startedAt={connectedAt} label="you've been out here" />
          </div>
        {/if}

        {#if room.status === 'error'}
          <Notice tone="error" title="The connection dropped.">
            <p>{room.error}</p>
            <div class="pt-1">
              <Button onclick={() => void room.rejoin()}>Try again</Button>
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
          <Button variant="danger" onclick={hangUp}>Hang up</Button>
        </div>
      </section>

      <ChatPanel
        messages={room.messages}
        disabled={!room.chatReady}
        onSend={(text) => room.sendChat(text)}
      />
    </div>
  {/if}
</div>
