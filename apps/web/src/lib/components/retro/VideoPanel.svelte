<script lang="ts">
  import { cn } from '$lib/utils';
  import Button from './Button.svelte';

  interface Props {
    stream: MediaStream | null;
    label: string;
    muted?: boolean;
    mirrored?: boolean;
    placeholder?: string;
    ratio?: '16/9' | '4/3' | '1/1' | '3/4';
    class?: string;
  }

  let {
    stream,
    label,
    muted = false,
    mirrored = false,
    placeholder = 'No video',
    ratio = '16/9',
    class: className,
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

<!-- A dark inset panel with a label plate. Deliberately not a CRT pastiche --
     no scanlines, no bezel screws: this is a website, not a picture of a
     monitor. -->
<div
  data-slot="retro-videopanel"
  class={cn('rt-inset relative overflow-hidden border border-ink bg-screen', className)}
  style="aspect-ratio: {ratio}"
>
  <video
    bind:this={el}
    autoplay
    playsinline
    {muted}
    class={cn('block h-full w-full object-cover', mirrored && '-scale-x-100')}
  ></video>

  {#if !stream}
    <p class="absolute inset-0 grid place-items-center px-3 text-center text-sm text-glow/70">
      {placeholder}
    </p>
  {/if}

  {#if needsTap}
    <div class="absolute inset-0 grid place-items-center">
      <Button variant="ember" onclick={play}>Click to start the video</Button>
    </div>
  {/if}

  <span
    class="rt-pixel absolute bottom-0 left-0 border-t border-r border-ink bg-ink px-1.5 py-1 text-[0.5625rem] text-glow"
  >
    {label}
  </span>
</div>
