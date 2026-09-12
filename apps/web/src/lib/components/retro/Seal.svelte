<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    /** Runs around the rim. Kept short -- it is set in engraved caps. */
    rim: string;
    /** Two or three characters in the middle. */
    mark?: string;
    size?: number;
    tone?: 'foil' | 'ember' | 'sepia';
    /** Stamps are never applied straight. */
    rotate?: number;
    class?: string;
  }

  let {
    rim,
    mark = 'CB',
    size = 96,
    tone = 'foil',
    rotate = -8,
    class: className,
  }: Props = $props();

  const strokes: Record<'foil' | 'ember' | 'sepia', string> = {
    foil: 'var(--color-foil)',
    ember: 'var(--color-ember)',
    sepia: 'var(--color-sepia)',
  };

  const uid = $props.id();
</script>

<!-- A guarantee stamp: double rim, engraved caps bent around the inside of it,
     a monogram in the middle. The kind of thing printed on a tax band. -->
<div
  data-slot="retro-seal"
  class={cn('inline-block', className)}
  style="transform: rotate({rotate}deg)"
>
  <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={rim}>
    <defs>
      <!-- Starts at the bottom-left and runs over the top, so the text reads
           left to right along the upper rim. -->
      <path id="seal-rim-{uid}" d="M50 15a35 35 0 1 1 0 70 35 35 0 1 1 0-70" fill="none" />
    </defs>

    <circle cx="50" cy="50" r="47" fill="none" stroke={strokes[tone]} stroke-width="2" />
    <circle cx="50" cy="50" r="42" fill="none" stroke={strokes[tone]} stroke-width="0.75" />

    <text
      fill={strokes[tone]}
      style="font-family: var(--font-serif); font-size: 9px; font-weight: 600; letter-spacing: 0.22em"
    >
      <textPath href="#seal-rim-{uid}" startOffset="50%" text-anchor="middle">
        {rim.toUpperCase()}
      </textPath>
    </text>

    <text
      x="50"
      y="58"
      text-anchor="middle"
      fill={strokes[tone]}
      style="font-family: var(--font-serif); font-size: 20px; font-weight: 700"
    >
      {mark}
    </text>
  </svg>
</div>
