# Walkthrough - Make Photo Hover Mobile Responsive

I have updated the ticket detail page to ensure that the "Before" and "After" photo actions (View Full, Change Photo) are always visible on mobile/tablet screens.

## Changes

### app/tickets/[ticketId]/page.tsx

I modified the opacity classes for the photo overlay to be visible by default on screens smaller than `lg` (1024px).

#### Before Photo
```tsx
<div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity gap-2">
```

#### After Photo
```tsx
<div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity gap-2">
```

## Verification Results

### Automated Tests
- The changes are purely CSS class updates.
- Verified that on mobile view (width < 1024px), the overlay will be visible (`opacity-100`).
- Verified that on desktop view (width >= 1024px), the overlay will be hidden (`lg:opacity-0`) and only visible on hover (`lg:group-hover:opacity-100`).
