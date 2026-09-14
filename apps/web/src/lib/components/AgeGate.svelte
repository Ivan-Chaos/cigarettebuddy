<script lang="ts">
  import { onMount } from 'svelte';

  /* The 18+ gate.
   *
   * Hand-rolled rather than built on `retro/Dialog.svelte`, for three reasons:
   * that one is dismissible (bits-ui closes on Escape and outside-click, and
   * its close button is not optional), it passes no restProps through so the
   * dismiss behaviour cannot be turned off from outside, and it portals during
   * hydration -- which is what produced this project's earlier hydration
   * warnings. None of that is wanted in a gate that must not be closeable.
   *
   * The markup is always server-rendered. Whether it is *seen* is decided
   * before first paint by the inline script in app.html, which sets
   * `data-age="ok"` on <html> when localStorage says so; `.ag-gate` is display:
   * none under that attribute. Rendering it only after onMount would show the
   * page to a minor for a beat first, and removing it after mount would flash
   * the gate at every adult on every load. */

  const KEY = 'cb:age-ok';

  /* Starts open on the server and on the client's first frame, so SSR and
     hydration agree. The CSS has already hidden it for confirmed visitors by
     this point, so this never causes a visible flash. */
  let open = $state(true);
  let dialog = $state<HTMLElement | null>(null);
  let yesButton = $state<HTMLButtonElement | null>(null);
  let noButton = $state<HTMLButtonElement | null>(null);

  onMount(() => {
    let confirmed: boolean;
    try {
      confirmed = localStorage.getItem(KEY) === 'yes';
    } catch {
      // Safari in private mode throws on access. Treat it as unconfirmed and
      // ask again -- failing closed is the right way for a gate to fail.
      confirmed = false;
    }

    if (confirmed) {
      open = false;
      return;
    }

    // Take focus off whatever is behind, so a keyboard user starts inside.
    dialog?.focus();
  });

  function accept() {
    try {
      localStorage.setItem(KEY, 'yes');
    } catch {
      // Storage is unavailable, so the answer cannot be remembered and they
      // will be asked again next time. Let them through for this visit anyway:
      // refusing entry over a storage failure punishes the wrong person.
    }
    // Matches what the inline script writes, so a later navigation within the
    // session does not re-show the gate before its own check runs.
    document.documentElement.setAttribute('data-age', 'ok');
    open = false;
  }

  function decline() {
    /* Nothing is written: only "yes" is remembered, so a misclick costs a
       reload rather than locking somebody out of a site with no UI to undo it.

       close() only works on a tab that script opened, which this almost never
       is -- it is a harmless no-op otherwise. replace() is what actually does
       the work, and `replace` rather than `href` so the back button does not
       land them straight back here. If both are somehow blocked the gate just
       stays up, which is the safe failure. */
    window.close();
    window.location.replace('about:blank');
  }

  /* A two-element focus trap. There are exactly two focusable things in here,
     so wrapping by hand is a few lines and avoids a library. Escape is
     swallowed: this dialog has no dismiss. */
  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key !== 'Tab') return;

    const first = yesButton;
    const last = noButton;
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

{#if open}
  <div
    bind:this={dialog}
    class="ag-gate fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
    style="background-color: rgba(0, 0, 0, 0.94)"
    role="dialog"
    aria-modal="true"
    aria-labelledby="ag-title"
    aria-describedby="ag-body"
    tabindex="-1"
    onkeydown={onKeydown}
    data-nosnippet
  >
    <!-- Pure black on pure white rather than the site's ink and paper: this is
         supposed to look like it was printed by a regulator, not designed. -->
    <div class="ag-face my-auto w-full max-w-[34rem] border-[12px] border-black bg-white">
      <div class="flex flex-col gap-4 p-5 sm:gap-5 sm:p-7">
        <h2
          id="ag-title"
          class="text-2xl leading-[1.1] tracking-tight text-black uppercase sm:text-[2rem]"
        >
          hold your horses, are you old enough
        </h2>

        <!-- Sentence case, like the body text on a real pack warning.

             Worded so that no clipped excerpt can invert its meaning. Google
             once stitched the old sentence into a search snippet as
             "cigarettes and chatting with strangers, for people under 18
             years old" -- the exact opposite of what it said. Every clause
             here reads as 18+ on its own, and `data-nosnippet` on the dialog
             keeps the gate out of snippets altogether. -->
        <p id="ag-body" class="text-[0.9375rem] leading-snug text-black sm:text-base">
          this website is about cigarettes and chatting with strangers. It is for adults only: you
          must be 18 or older to be here. If you&rsquo;re younger than that, with all due respect,
          come back when you&rsquo;re old enough, or don&rsquo;t, idc but you shouldn&rsquo;t be
          here
        </p>

        <div class="mt-1 flex flex-col gap-3 sm:flex-row">
          <button
            bind:this={yesButton}
            type="button"
            onclick={accept}
            class="ag-btn border-[3px] border-black bg-black px-4 py-3 text-white uppercase"
          >
            Yes, i am 18 or older
          </button>
          <button
            bind:this={noButton}
            type="button"
            onclick={decline}
            class="ag-btn border-[3px] border-black bg-white px-4 py-3 text-black uppercase"
          >
            no, i&rsquo;m not old enough
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
