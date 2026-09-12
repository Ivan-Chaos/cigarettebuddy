<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { Button, Link, Notice } from '$lib/components/retro';

  // /room/<bad-id> is a deliberate 404 from the room's `load`, so it gets the
  // specific explanation rather than the generic one.
  const isRoomId = $derived(page.status === 404 && page.url.pathname.startsWith('/room'));
</script>

{#if isRoomId}
  <Notice tone="warn" title="That's not a room id.">
    <p>
      Room ids are 4 to 32 characters of a&ndash;z, 0&ndash;9 and dashes. Check the link, or just
      get matched with somebody at random.
    </p>
    <div class="flex flex-wrap items-center gap-3 pt-1">
      <Button variant="ember" href={resolve('/room')}>Find me a stranger</Button>
      <Link href={resolve('/')} variant="quiet">Back to the front</Link>
    </div>
  </Notice>
{:else}
  <Notice tone="error" title={page.status === 404 ? 'There is nothing here.' : 'Something broke.'}>
    <p>
      {#if page.status === 404}
        That address doesn't point at anything. It may never have.
      {:else}
        {page.error?.message ?? 'No idea what happened, which is its own kind of answer.'}
      {/if}
    </p>
    <div class="flex flex-wrap items-center gap-3 pt-1">
      <Button href={resolve('/')}>Back to the front</Button>
      <Link href={resolve('/room')} variant="quiet">Or go straight outside</Link>
    </div>
  </Notice>
{/if}
