<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import MicIcon from '@lucide/svelte/icons/mic';
  import MicOffIcon from '@lucide/svelte/icons/mic-off';
  import VideoIcon from '@lucide/svelte/icons/video';
  import VideoOffIcon from '@lucide/svelte/icons/video-off';
  import ChatPanel from '$lib/components/ChatPanel.svelte';
  import DeviceControl from '$lib/components/DeviceControl.svelte';
  import VideoTile from '$lib/components/VideoTile.svelte';
  import { Button } from '$lib/components/ui/button';
  import { RoomSession, type RoomStatus } from '$lib/rtc/room.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const room = new RoomSession();
  let copied = $state(false);

  const STATUS_TEXT: Record<RoomStatus, string> = {
    idle: 'Idle',
    media: 'Requesting camera and microphone…',
    connecting: 'Connecting to server…',
    waiting: 'Waiting for someone to join',
    negotiating: 'Connecting to peer…',
    connected: 'Connected',
    full: 'Room is full',
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

<header class="room-header">
  <div>
    <h1 style="font-size: 1.25rem">
      {#if room.roomId}
        Room <code>{room.roomId}</code>
      {:else}
        Finding you a room…
      {/if}
    </h1>
    <span class="badge {statusTone}">{statusText}</span>
    {#if room.connectionState !== 'none' && room.connectionState !== 'connected'}
      <span class="muted" style="margin-left: 0.5rem; font-size: 0.85rem"
        >({room.connectionState})</span
      >
    {/if}
  </div>
  <div class="room-actions">
    <button type="button" class="secondary" onclick={copyLink} disabled={!shareUrl}>
      {copied ? 'Copied!' : 'Copy link'}
    </button>
    <a href={resolve('/')} class="muted" style="font-size: 0.9rem">Leave</a>
  </div>
</header>

{#if room.status === 'full'}
  <section class="card" style="margin-top: 1.5rem">
    <h2 style="margin-top: 0; font-size: 1.1rem">This room is full</h2>
    <p class="muted">
      Rooms hold two people. Head back to the lobby to be matched with someone else.
    </p>
    <a href={resolve('/')}>Back to lobby</a>
  </section>
{:else}
  <div class="room-layout">
    <section class="room-stage">
      <div class="video-grid">
        <VideoTile
          stream={room.remoteStream}
          label="Peer"
          placeholder={room.status === 'waiting' ? 'Waiting for peer…' : 'No peer video yet'}
        />
        <VideoTile
          stream={room.localStream}
          label="You"
          muted
          mirrored
          placeholder={room.mediaDenied ? 'Camera unavailable' : 'Starting camera…'}
        />
      </div>

      {#if room.status === 'waiting'}
        <p class="muted" style="text-align: center">
          The next person to join is matched here automatically. To invite a specific person, share
          <code>{shareUrl}</code>
        </p>
      {/if}

      {#if room.status === 'error'}
        <div class="card" style="text-align: center">
          <p class="error" style="margin-top: 0">{room.error}</p>
          <button type="button" onclick={() => void room.rejoin()}>Rejoin</button>
        </div>
      {/if}

      <div class="controls">
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
        <Button variant="destructive" onclick={hangUp}>Hang up</Button>
      </div>
    </section>

    <ChatPanel
      messages={room.messages}
      disabled={!room.chatReady}
      onSend={(text) => room.sendChat(text)}
    />
  </div>
{/if}
