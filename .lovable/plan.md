

## Plan: Move Social Links to Layout Footer

### What Changes

1. **`src/components/Layout.tsx`** — Add a `<footer>` after `<main>` that fetches and displays the social links (Discord, WhatsApp BG, WhatsApp BotC) from the `contact_links` table. Reuse the same fetch logic and button styles currently in `Index.tsx`'s `SocialLinks` component. The footer will show on all pages (except `complete-profile`), with a subtle separator, the social buttons centered, and a small "© 2026 Amizade" text below.

2. **`src/pages/Index.tsx`** — Remove the `<SocialLinks />` component usage from the homepage (and the component definition itself: `DiscordIcon`, `SocialLinks`, lines ~10-96) since the links now live in the global footer.

### Footer Design
- Dark background (`bg-background` with top border `border-t border-border`)
- Social buttons centered, same styling as current (Discord purple, WhatsApp green)
- Small muted copyright text below
- Only renders links that exist in the database

### Technical Details
- Move `DiscordIcon` and WhatsApp SVG inline icons into the footer
- Fetch `contact_links` once in the footer with a `useEffect`
- No database changes needed

