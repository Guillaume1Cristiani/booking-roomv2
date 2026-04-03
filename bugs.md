# Known Bugs

## Open

### [#33] Calendar item resize handles do not work
**Issue:** https://github.com/Guillaume1Cristiani/booking-roomv2/issues/33

The top and bottom drag handles on calendar items (used to increase or decrease event duration) are not functional. Dragging either handle has no effect on the event's start or end time.

**Affected files:**
- `src/components/Calendar/calendaritem/calendaritem.tsx`
- `src/components/Calendar/main.tsx`
- `src/app/calendar/providers/calendar-store-provider.tsx`

---

### [#32] Room filter does not respect room colors
**Issue:** https://github.com/Guillaume1Cristiani/booking-roomv2/issues/32

The room filter panel does not display the colors assigned to each room. All rooms appear with a neutral default instead of their hex color stored in the database.

**Suspected cause:** Filter component still using Tailwind class prefix pattern (`bg-{color}-300`) instead of inline `backgroundColor` with the hex value.

**Affected files:**
- Room filter component (calendar sidebar)
- `src/lib/roomFinder.ts`

---

## Fixed

| Bug | Fixed in |
|-----|----------|
| ADMIN role returned 401 (missing switch case in `protectedRoute`) | feat/phase-7-new-features |
| `cookies()` from `next/headers` used in middleware (should be `req.cookies`) | feat/phase-7-new-features |
| `room.tag_id` used instead of `room.id` for subTag_id resolution | feat/phase-7-new-features |
| Success toast showed event title instead of room name | feat/phase-7-new-features |
| Calendar item colors used hex as Tailwind class prefix (invalid) | feat/phase-7-new-features |
| `tenantId` scoped inside `if` block, undefined in OAuth callback | feat/phase-7-new-features |
| `revalidateTag` called outside Server Action context (invariant error) | feat/phase-7-new-features |
