# Dashboard Redesign Research

## Goal

Redesign the Dashboard tab so it feels closer to a best-in-class modern trading workspace:

- clearer information hierarchy
- stronger visual identity
- motion that improves comprehension instead of adding noise
- better drilldown paths
- premium styling without hurting speed or readability

This research is based on:

- the current product goals in `docs/prd.md`
- the current dashboard implementation in `src/views/Dashboard/index.tsx`
- the existing dashboard UI shown in `docs/screenshots/dashboard.png` and `docs/screenshots/dashboard_alltime.png`
- current design guidance from Material Design, web.dev, MDN, and USWDS

Research date: March 6, 2026

## Current Dashboard: What Works

The current dashboard already has a solid base:

- strong dark-mode visual direction
- clear left navigation and visible active state
- compact KPI row with useful trading metrics
- simple two-panel layout for trend plus calendar/grid
- existing transition work and reduced-motion handling in `src/index.css`

This means the redesign should be an evolution, not a reset.

## Current Dashboard: Main Gaps

### 1. The page feels like a collection of cards, not a unified command center

The metrics row, equity curve, and P&L panel are logically correct, but they do not create a strong scan path. Nothing strongly answers this first-question sequence:

1. How am I doing right now?
2. Why is that happening?
3. Where should I click next?

### 2. The top of the page is underused

The header currently has a title and period selector, but it does not frame the dashboard as a high-value review surface. A top-tier dashboard usually uses the top band for:

- account or strategy context
- period summary
- key change vs previous period
- strongest CTA or insight

### 3. Motion exists, but it is not yet a full motion system

There is already fade-in animation, but not a broader motion language. Premium dashboards usually use motion to:

- preserve spatial continuity when periods change
- stage information in priority order
- confirm drilldown interactions
- reduce perceived loading time with progressive reveal

### 4. Styling is clean, but not yet distinctive

The current visual system is competent but still conservative. To feel top-tier, the dashboard needs a clearer signature through:

- more intentional typography
- stronger surface hierarchy
- smarter use of glow, blur, depth, and highlight
- more disciplined color emphasis

### 5. The dashboard is informative, but not yet insight-led

It reports metrics well, but it does not yet elevate insight. A stronger dashboard should spotlight:

- best day / worst day
- current streak
- win-rate change vs previous period
- top drag on performance
- one recommended next action

## Best-Practice Principles To Use

### 1. Prioritize fast comprehension

USWDS guidance for data visualization emphasizes simplicity, common chart forms, and limiting cognitive load. For this dashboard, that means:

- keep the equity curve and P&L grid as primary charts
- avoid adding novelty charts just to look advanced
- use each chart for one clear question
- keep important values visible without hover

Implication for this app:

- the dashboard should remain data-dense, but only around a single core story per section

### 2. Motion should guide focus, not perform for attention

Material Design motion guidance stresses that motion should be quick, clear, and cohesive. For desktop, transitions should generally feel fast and simple, often in the 150ms to 200ms range for common UI changes.

Implication for this app:

- period switching should animate panels with continuity
- metric cards should not bounce, flip, or over-scale
- hover motion should be subtle and mostly use opacity, elevation, and small translation

### 3. Use stagger only where it improves reading order

Material choreography guidance recommends slight stagger for introduced surfaces so users can follow a focal path.

Implication for this app:

- stagger only the initial dashboard load or large data refresh
- sequence: hero summary -> KPI row -> main charts
- keep item offsets very small so the page still feels professional

### 4. Reduced motion must stay first-class

web.dev and MDN both recommend honoring `prefers-reduced-motion` and removing non-essential movement.

Implication for this app:

- keep all essential state changes understandable without animation
- use crossfade as the reduced-motion fallback for period changes
- avoid parallax, float loops, or continuous ambient chart movement

### 5. Don’t hide critical insight behind hover-only interactions

USWDS guidance warns against requiring interaction to understand a visualization.

Implication for this app:

- show headline values, deltas, and labels directly in the layout
- use tooltips only for support, not for primary meaning

## Recommended Redesign Direction

### Design concept: "Trader Command Center"

The dashboard should feel like a calm, high-performance review cockpit. Not flashy. Not generic SaaS. The visual tone should communicate:

- precision
- momentum
- confidence
- controlled energy

### Layout structure

Replace the current simple header-plus-grid with a stronger three-zone layout:

### Zone A: Hero summary strip

A full-width top section containing:

- dashboard title
- selected account and period
- net P&L as the dominant number
- change vs previous period
- summary chips such as `Win rate`, `Expectancy`, `Trade count`, `Best day`
- primary action or insight message

Example intent:

`February closed +$3.5K across 14 trading days. Win rate improved +6.4 pts vs January.`

This creates immediate narrative instead of isolated metrics.

### Zone B: Performance overview band

A denser KPI section below the hero, redesigned from the current five equal cards into a hierarchy:

- one large primary card for `Net P&L`
- two medium cards for `Win rate` and `Profit factor`
- two compact support cards for `Expectancy` and `Avg win/loss`

This prevents every metric from competing equally.

### Zone C: Analytical workspace

Keep the lower area as the main working surface:

- left: equity curve with stronger annotations
- right: daily or monthly P&L view
- optional slim insight rail below or beside charts

The insight rail can show:

- best day
- worst day
- current streak
- longest drawdown stretch
- most-traded symbol or setup

## Styling Direction

### 1. Use premium dark surfaces with sharper hierarchy

Keep the dark theme, but improve layering:

- base background: deep charcoal, not pure black
- primary panels: slightly warm or neutral glass surfaces
- elevated feature panel: richer contrast and subtle outline glow
- separators: low-contrast hairlines, not heavy borders

Recommended visual language:

- smoky glass, not glossy glassmorphism
- subtle blur only on high-level containers
- brighter inner panel contrast for charts

### 2. Make typography more editorial

The dashboard needs more contrast between labels and headline data.

Recommended hierarchy:

- hero number: large, tight, high-contrast
- section titles: slightly condensed or semi-bold
- metric labels: small uppercase or tracked label style
- secondary stats: muted but still readable

If the product wants a more premium character, consider a more distinctive UI font pairing than the current base alone, but stay practical for desktop readability.

### 3. Limit accent colors to meaningful signals

Current green/red usage is directionally correct. Improve discipline:

- green only for positive performance
- red only for negative performance
- one cool accent color for navigation, focus, and selected period
- avoid mixing too many decorative accent colors in the same view

This will make P&L color semantics stronger.

### 4. Introduce a signature visual motif

To avoid looking generic, add one recognizably branded pattern, for example:

- a soft radial spotlight behind the hero summary
- a thin market-grid texture in the background
- a subtle gradient edge on active panels
- a faint scanline or chartline treatment in headers

Use one motif consistently. More than one will feel forced.

## Animation System Recommendation

### Motion goals

Use animation to clarify:

- data refresh
- hierarchy
- drilldown
- active selection

### Recommended motion rules

### 1. Page load

- Hero summary fades up first
- KPI cards reveal with a very small stagger
- chart areas fade and slide up second
- total time should still feel under roughly 300ms to 450ms

### 2. Period change

Instead of re-rendering the whole content with one fade:

- animate the hero values with a number transition or crossfade
- crossfade chart data with slight vertical movement
- keep layout stable to avoid spatial reset

### 3. Hover and focus

Use only small signals:

- `translateY(-2px)` or less
- shadow/elevation increase
- border tint
- icon or sparkline emphasis

Avoid:

- large zoom
- springy bounce
- long elastic easing

### 4. Drilldown interactions

When clicking a day or month:

- briefly highlight the selected cell
- open the drilldown modal with clear origin continuity
- keep the modal animation quick and directional

### 5. Loading states

Prefer skeletons that match the final structure, but reduce shine intensity. Very flashy shimmer is often perceived as cheap in data-heavy products.

## Accessibility and Performance Rules

These should be non-negotiable:

- preserve `prefers-reduced-motion` support and expand it beyond the existing fade classes
- keep information readable at 200% zoom
- do not rely on color alone for positive/negative states
- keep important numbers visible without hover
- avoid expensive layered effects on every card
- animate transform and opacity first; avoid layout thrash

## Innovation Opportunities That Still Feel Practical

These ideas make the dashboard feel advanced without becoming gimmicky.

### 1. Narrative insight banner

Add a small AI-like or rules-based summary card at the top:

- `You traded less, but expectancy improved.`
- `Most losses came on Fridays.`
- `Your equity curve steepened after Feb 12.`

This makes the dashboard feel intelligent even before full AI features exist.

### 2. Time-context comparison mode

Allow a subtle compare state:

- current month vs previous month
- YTD vs same point last year
- selected account vs all accounts

Do not overload the default view. Make compare an optional enhancement.

### 3. Micro-sparklines inside KPI cards

Small trend lines behind or beside key metrics can make cards feel more alive and informative without adding new large charts.

Best use:

- Net P&L trend
- Win-rate drift
- Expectancy trend

### 4. Confidence and risk indicators

Because this is a trading journal, innovation should support decision quality, not only beauty. Consider compact risk-oriented status chips such as:

- `Max loss day`
- `Drawdown status`
- `Average hold time`
- `A+ setup share`

### 5. Personalized dashboard presets

Longer term, allow dashboard modes:

- `Review`
- `Risk`
- `Consistency`

This would make the product more sophisticated without requiring a totally separate analytics surface.

## Concrete Recommendations For This Codebase

### Phase 1: Visual hierarchy upgrade

Applies mainly to:

- `src/views/Dashboard/index.tsx`
- `src/components/DashboardMetrics/index.tsx`
- `src/index.css`

Changes:

- add a hero summary section above the current metrics
- convert KPI cards from equal-weight cards to mixed emphasis cards
- improve section headings and supporting text
- add visible period comparison text

### Phase 2: Motion system upgrade

Changes:

- replace single `animate-fade-in` usage with scoped motion patterns
- add reduced-motion-safe variants
- animate period changes at panel level instead of whole-page level
- add selected-cell feedback before drilldown modal opens

### Phase 3: Insight layer

Changes:

- add a lightweight insight rail or summary component
- compute comparative metrics against prior period
- surface best/worst day and streaks

### Phase 4: Signature styling

Changes:

- refine panel tokens in `src/index.css`
- add a branded top-surface treatment
- improve chart containers with stronger internal contrast

## Suggested Component Additions

- `DashboardHero`
- `DashboardInsightRail`
- `MetricSparkline`
- `DashboardComparisonChip`

This is a cleaner direction than overloading `DashboardMetrics` further.

## Redesign Success Criteria

The redesign is successful if a user can do these three things within a few seconds:

1. understand whether the selected period was good or bad
2. identify the main reason or pattern behind performance
3. know exactly where to click for deeper review

If the page looks more modern but still requires hunting for meaning, the redesign failed.

## Recommended Final Direction

The best direction for this product is:

- keep the dark, trader-focused atmosphere
- strengthen hierarchy with a hero summary and uneven KPI sizing
- add disciplined motion, not decorative motion
- make insights more narrative and less purely numeric
- use innovation in service of review quality, not visual novelty

This would move the dashboard closer to a premium analytics workspace rather than a standard card-based admin screen.

## Sources

- Material Design, motion overview: https://m1.material.io/motion/material-motion.html
- Material Design, choreography: https://m1.material.io/motion/choreography.html
- Material Design, duration and easing: https://m1.material.io/motion/duration-easing.html
- web.dev, reduced motion guidance: https://web.dev/articles/prefers-reduced-motion
- web.dev, accessibility and motion: https://web.dev/learn/accessibility/motion
- MDN, media queries for accessibility: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Using_for_accessibility
- USWDS, data visualization guidance: https://designsystem.digital.gov/components/data-visualizations/
