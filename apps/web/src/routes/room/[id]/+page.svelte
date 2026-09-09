<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import ChatPanel from '$lib/components/ChatPanel.svelte';
  import VideoTile from '$lib/components/VideoTile.svelte';
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

  onMount(() => {
    void room.join(data.roomId);

    const bye = () => room.destroy();
    window.addEventListener('beforeunload', bye);
    return () => {
      window.removeEventListener('beforeunload', bye);
      room.destroy();
    };
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
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
    <h1 style="font-size: 1.25rem">Room <code>{data.roomId}</code></h1>
    <span class="badge {statusTone}">{statusText}</span>
    {#if room.connectionState !== 'none' && room.connectionState !== 'connected'}
      <span class="muted" style="margin-left: 0.5rem; font-size: 0.85rem"
        >({room.connectionState})</span
      >
    {/if}
  </div>
  <div class="room-actions">
    <button type="button" class="secondary" onclick={copyLink}>
      {copied ? 'Copied!' : 'Copy link'}
    </button>
    <a href={resolve('/')} class="muted" style="font-size: 0.9rem">Leave</a>
  </div>
</header>

{#if room.status === 'full'}
  <section class="card" style="margin-top: 1.5rem">
    <h2 style="margin-top: 0; font-size: 1.1rem">This room is full</h2>
    <p class="muted">Rooms hold two people. Ask for a new link or start your own room.</p>
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
          Share this link with one other person: <code>{location.href}</code>
        </p>
      {/if}

      {#if room.status === 'error'}
        <div class="card" style="text-align: center">
          <p class="error" style="margin-top: 0">{room.error}</p>
          <button type="button" onclick={() => void room.rejoin()}>Rejoin</button>
        </div>
      {/if}

      <div class="controls">
        <button
          type="button"
          class="secondary"
          onclick={() => room.toggleMic()}
          disabled={!room.localStream}
          aria-pressed={!room.micEnabled}
        >
          {room.micEnabled ? 'Mute mic' : 'Unmute mic'}
        </button>
        <button
          type="button"
          class="secondary"
          onclick={() => room.toggleCam()}
          disabled={!room.localStream}
          aria-pressed={!room.camEnabled}
        >
          {room.camEnabled ? 'Stop camera' : 'Start camera'}
        </button>
        <button type="button" class="danger" onclick={hangUp}>Hang up</button>
      </div>
    </section>

    <ChatPanel
      messages={room.messages}
      disabled={!room.chatReady}
      onSend={(text) => room.sendChat(text)}
    />
  </div>
{/if}
