<script lang="ts">
  interface Props {
    stream: MediaStream | null;
    label: string;
    muted?: boolean;
    mirrored?: boolean;
    placeholder?: string;
  }

  let {
    stream,
    label,
    muted = false,
    mirrored = false,
    placeholder = 'No video',
  }: Props = $props();

  let el = $state<HTMLVideoElement | null>(null);
  let needsTap = $state(false);

  // srcObject cannot be bound declaratively, so wire it up by hand.
  $effect(() => {
    const video = el;
    const source = stream;
    if (!video) return;

    video.srcObject = source;
    needsTap = false;
    if (source) {
      // Browsers may block unmuted autoplay until the page has had a gesture.
      video.play().catch(() => {
        needsTap = true;
      });
    }

    return () => {
      video.srcObject = null;
    };
  });

  function play() {
    el?.play()
      .then(() => {
        needsTap = false;
      })
      .catch(() => {});
  }
</script>

<div class="tile">
  <video bind:this={el} autoplay playsinline {muted} class:mirrored></video>
  {#if !stream}
    <div class="tile-placeholder muted">{placeholder}</div>
  {/if}
  {#if needsTap}
    <button type="button" class="tile-tap" onclick={play}>Tap to play</button>
  {/if}
  <span class="tile-label">{label}</span>
</div>
