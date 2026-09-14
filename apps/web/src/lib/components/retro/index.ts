/* The kit. Hand-written and linted -- unlike `../ui/`, which the shadcn CLI
   owns and regenerates. Import from the barrel:

     import { Button, Panel, StatusStrip } from '$lib/components/retro';

   Types are re-exported here too, because `verbatimModuleSyntax` plus
   `consistent-type-imports` means every consumer writes `import type` and
   should not have to reach into individual files for it. */

// Structure
export { default as SiteShell } from './SiteShell.svelte';
export { default as Band, bandVariants } from './Band.svelte';
export type { BandTone } from './Band.svelte';
export { default as NavBar } from './NavBar.svelte';
export type { NavItem } from './NavBar.svelte';
export { default as Panel, panelVariants, stripVariants } from './Panel.svelte';
export type { PanelStrip, PanelTone } from './Panel.svelte';
export { default as Rule } from './Rule.svelte';
export type { RuleVariant } from './Rule.svelte';

// Controls
export { default as Button, buttonVariants } from './Button.svelte';
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button.svelte';
export { default as Link } from './Link.svelte';
export { default as TextField } from './TextField.svelte';
export { default as TextArea } from './TextArea.svelte';
export { default as Checkbox } from './Checkbox.svelte';
export { default as MenuButton } from './MenuButton.svelte';
export type { MenuOption } from './MenuButton.svelte';

// Feedback and data
export { default as Tag, tagVariants } from './Tag.svelte';
export type { TagTone } from './Tag.svelte';
export { default as StatusStrip } from './StatusStrip.svelte';
export type { StatusTone } from './StatusStrip.svelte';
export { default as Notice, noticeVariants } from './Notice.svelte';
export type { NoticeTone } from './Notice.svelte';
export { default as ProgressBar } from './ProgressBar.svelte';

// Overlays
export { default as Dialog } from './Dialog.svelte';
export { default as Tooltip } from './Tooltip.svelte';

// Old web
export { default as Marquee } from './Marquee.svelte';
export { default as HitCounter } from './HitCounter.svelte';
export { default as Badge88x31 } from './Badge88x31.svelte';
export type { BadgeTone } from './Badge88x31.svelte';
export { default as Sticker } from './Sticker.svelte';

// Cigarette accents
export { default as CigaretteTimer } from './CigaretteTimer.svelte';
export { default as AshtrayMeter } from './AshtrayMeter.svelte';

// Room
export { default as VideoPanel } from './VideoPanel.svelte';
export { default as TopicCard } from './TopicCard.svelte';

// Pack motifs
export { default as Chevron } from './Chevron.svelte';
export { default as Seal } from './Seal.svelte';
