<script lang="ts">
  import {
    REPORT_NOTE_MAX,
    REPORT_REASONS,
    REPORT_REASON_LABELS,
    type ReportReason,
  } from '@cigbuddy/shared';
  import { Button, Dialog, TextArea } from '$lib/components/retro';

  interface Props {
    open: boolean;
    onSubmit: (reason: ReportReason, note?: string) => void;
  }

  let { open = $bindable(false), onSubmit }: Props = $props();

  let reason = $state<ReportReason | null>(null);
  let note = $state('');

  /* "Something else" is only useful with a line about what. The others stand
     on their own; a note there is welcome, not required. */
  const needsNote = $derived(reason === 'other');
  const noteMissing = $derived(needsNote && note.trim().length === 0);
  const canSubmit = $derived(reason !== null && !noteMissing);

  // Fresh form every time it opens; a half-filled report is not worth keeping.
  $effect(() => {
    if (open) {
      reason = null;
      note = '';
    }
  });

  function submit() {
    if (!reason || noteMissing) return;
    onSubmit(reason, note.trim() || undefined);
  }
</script>

<Dialog
  bind:open
  title="Leave and report"
  description="Pick a reason, add a note if you want, and you are out of the room."
>
  <div class="flex flex-col gap-4 py-2">
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 text-sm font-semibold">What did they do?</legend>
      {#each REPORT_REASONS as value (value)}
        <label class="flex items-center gap-2 text-sm">
          <input type="radio" name="report-reason" {value} bind:group={reason} class="rt-radio" />
          {REPORT_REASON_LABELS[value]}
        </label>
      {/each}
    </fieldset>

    <TextArea
      bind:value={note}
      label={needsNote ? 'What happened' : 'Anything else (optional)'}
      rows={3}
      maxlength={REPORT_NOTE_MAX}
      placeholder={needsNote ? 'a line is plenty' : ''}
      error={noteMissing ? 'Say what it was, in a line.' : undefined}
      hint={noteMissing ? undefined : 'Goes to us, not to them.'}
    />
  </div>

  {#snippet footer()}
    <div class="flex w-full flex-wrap justify-end gap-3">
      <Button variant="quiet" onclick={() => (open = false)}>Cancel</Button>
      <Button variant="danger-solid" disabled={!canSubmit} onclick={submit}>
        Report and leave
      </Button>
    </div>
  {/snippet}
</Dialog>
