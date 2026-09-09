<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { roomIdSchema } from '@cigbuddy/shared';
  import { generateRoomId } from '$lib/rtc/room-id';

  let joinId = $state('');
  let joinError = $state<string | null>(null);

  function createRoom() {
    void goto(resolve('/room/[id]', { id: generateRoomId() }));
  }

  function joinRoom(event: SubmitEvent) {
    event.preventDefault();
    const parsed = roomIdSchema.safeParse(joinId.trim().toLowerCase());
    if (!parsed.success) {
      joinError = parsed.error.issues[0]?.message ?? 'Invalid room id';
      return;
    }
    joinError = null;
    void goto(resolve('/room/[id]', { id: parsed.data }));
  }
</script>

<h1>CigaretteBuddy</h1>
<p class="muted">
  Anonymous one-to-one video rooms. Create a room and share the link, or enter an id you were given.
</p>

<section class="card" style="margin-top: 2rem">
  <h2 style="margin-top: 0; font-size: 1.1rem">Start a room</h2>
  <p class="muted" style="margin-top: 0">A fresh id is generated for you. Two people per room.</p>
  <button type="button" onclick={createRoom}>Create room</button>
</section>

<section class="card" style="margin-top: 1.5rem">
  <h2 style="margin-top: 0; font-size: 1.1rem">Join a room</h2>
  <form onsubmit={joinRoom} style="display: grid; gap: 0.75rem">
    <input
      bind:value={joinId}
      placeholder="room id"
      autocomplete="off"
      spellcheck="false"
      aria-invalid={joinError ? 'true' : undefined}
      required
    />
    <button type="submit">Join</button>
  </form>
  {#if joinError}
    <p class="error" style="margin-bottom: 0">{joinError}</p>
  {/if}
</section>
