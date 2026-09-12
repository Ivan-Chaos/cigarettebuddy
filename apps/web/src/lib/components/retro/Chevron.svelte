<script lang="ts">
  import { cn } from '$lib/utils';

  interface Props {
    /** Depth of the point, in pixels. */
    depth?: number;
    tone?: 'ember' | 'camel' | 'ink';
    /** Points up instead of down, for closing a section. */
    up?: boolean;
    class?: string;
  }

  let { depth = 34, tone = 'ember', up = false, class: className }: Props = $props();

  const fills: Record<'ember' | 'camel' | 'ink', string> = {
    ember: 'var(--color-ember)',
    camel: 'var(--color-camel)',
    ink: 'var(--color-ink)',
  };
</script>

<!-- The gable. An SVG rather than a clip-path so the ink hairline follows the
     diagonals instead of being clipped away with everything else. -->
<div
  data-slot="retro-chevron"
  class={cn('w-full', className)}
  style="height: {depth}px"
  aria-hidden="true"
>
  <svg
    viewBox="0 0 100 10"
    preserveAspectRatio="none"
    class={cn('block h-full w-full', up && 'rotate-180')}
  >
    <path
      d="M0 0h100v1L50 10 0 1z"
      fill={fills[tone]}
      stroke="var(--color-ink)"
      stroke-width="0.35"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</div>
