<script lang="ts">
  import { TOPIC_KIND_LABELS, type Topic } from '@cigbuddy/shared';
  import Button from './Button.svelte';
  import Panel from './Panel.svelte';

  /* Deliberately dumb: it knows nothing about RoomSession, so /kit can render
     it from a literal. Handling `topic === null` here rather than in the page
     keeps the room free of another {#if} and means the database being down
     needs no thought at the call site -- the card just isn't there.

     Never render `topic.text` with {@html}. It is server-controlled today, but
     the `topics` table is hand-editable by design, and Svelte's escaping is the
     only thing standing between a badly typed row and the room. */

  interface Props {
    /** Null while the room has none; the panel is not drawn at all. */
    topic: Topic | null;
    /** Whether the button can do anything: false during the room's cooldown,
     *  and in any state where the socket would swallow the request. */
    ready?: boolean;
    onNext?: () => void;
    class?: string;
  }

  let { topic, ready = true, onNext, class: className }: Props = $props();

  function change() {
    // aria-disabled rather than `disabled`, so the guard lives here. A real
    // `disabled` attribute blurs a focused button, and this one is disabled by
    // the *other* peer's change as well as your own -- a keyboard user would
    // lose their place mid-call, through no action of their own.
    if (!ready) return;
    onNext?.();
  }
</script>

<!-- The live region is outside the {#if} and never unmounts. A region created
     in the same DOM mutation as its first content is not announced, and this
     card would otherwise be torn down and rebuilt on every "find next buddy" --
     so the prompt would change all evening and never once be read out. -->
<span class="sr-only" aria-live="polite" aria-atomic="true">
  {#if topic}
    {topic.text} &mdash; {TOPIC_KIND_LABELS[topic.kind]}
  {/if}
</span>

{#if topic}
  <!-- Gold: teal and berry are navigation, ember is alarm (expired, error,
       "they want another one") and moss is data. Gold is the only strip left
       that reads as an aside, which is exactly what this is. -->
  <Panel title="something to talk about" pixel strip="gold" class={className}>
    {#snippet actions()}
      <!-- Never "another one": `Light another one` sits a hand's width away in
           the button row and means "reset the ten-minute clock". -->
      <!-- `.rt-press` already drops its press animation for [aria-disabled],
           so only the dimming has to be said here. -->
      <Button
        size="sm"
        aria-disabled={!ready}
        class={ready ? undefined : 'opacity-55'}
        onclick={change}
      >
        change the subject
      </Button>
    {/snippet}

    <!-- aria-hidden: the persistent region above is what gets announced, and
         without this a screen reader would read the prompt twice. -->
    <p class="rt-quote text-base" aria-hidden="true">{topic.text}</p>
    <p class="pt-2 text-xs text-ink-soft" aria-hidden="true">{TOPIC_KIND_LABELS[topic.kind]}</p>
  </Panel>
{/if}
