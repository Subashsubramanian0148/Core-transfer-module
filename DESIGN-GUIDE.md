# Galileo (CORE) – Design Guide

Use this as the starting point for any new Galileo screen. It describes the layout, tokens, components, states and copy rules used in **Transfer Request v3**, **Withdrawal review** and **Separation review**.

Reference builds (in this folder):
- `html/index.html` – Transfer Request v3 (full flow: edit → slide-over → summary → submitted)
- `withdrawal-review.html` – In-Service withdrawal summary
- `separation-review.html` – Separation from Service withdrawal summary
- `react-app/` – Vite + React version of the screens

---

## 1. Principles

1. **Summary before detail.** Lead with the one number the user is approving (net amount, total moving). Put breakdowns underneath or behind "View details".
2. **Show each figure once.** Never repeat the same value in tiles *and* tables.
3. **Make the maths visible.** Present money as a calculation: Gross − deductions = Net, in reading order.
4. **One name per thing.** If it's "Federal tax" in one place, it's "Federal tax" everywhere.
5. **Colour means something.** Green = net / buy / success. Red = sell / errors only. Amber = notices. Never colour a $0 value red.
6. **Calm by default.** Information notes are blue, not warning orange. Warnings only for things that block or cost money.
7. **Light theme only.** No dark theme.

---

## 2. Page layout

```
┌────────┬──────────────────────────────────────────────────────────────┐
│        │ Top bar (72px): Galileo logo ·············· 🔔(+25) ? (AR)   │
│  Rail  ├───────────────────┬──────────────────────────────────────────┤
│ 100px  │ Employee panel    │ Page header: Title ········ [actions]    │
│        │ (280–320px)       │ ─────────────────────────────────────────│
│ icons  │ ← Back            │ Context line / settings                  │
│ +label │ Employee details  │ Main card (summary)                      │
│        │ avatar · name     │ Secondary cards (2-up grid)              │
│        │ SSN · ID · status │                                          │
│        │ Company           │                                          │
└────────┴───────────────────┴──────────────────────────────────────────┘
```

| Region | Spec |
|---|---|
| Left rail | 100px wide (76px on compact screens), white, right border `--line`. Items: icon 20–24px + label 11–13px, centred. Active item: `--primary-weak` fill, `--primary` text. Order: Dashboard, Payroll, Employee, Plan Config, Transaction, Others. |
| Top bar | 72px high, white, bottom border + `0 2px 4px rgba(0,0,0,.04)` shadow. Galileo logo left; notifications (red count badge), help, avatar right. |
| Employee panel | Grey column (`--surface-2`), white card inside: 64–110px avatar circle with initials, name (bold), SSN (masked), ID, status chip, divider, Company. "← Back" link above. |
| Content | Padding 24px, vertical gap 18–22px. |
| Page header | Title 32px/600 (24px on narrow). Actions right-aligned. 1px `--line-strong` bottom border, 16px padding below. |
| Grids | Two cards side by side: `grid-template-columns: repeat(2, minmax(0,1fr)); gap: 18–24px`. |

**Breakpoints**
- ≤ 1000px: 2-up card grids stack to 1 column.
- ≤ 900px: summary Sell/Buy split stacks; arrow connector hidden.
- ≤ 820px: employee panel moves above content.
- ≤ 560px: rail hidden; 16px side gutter.

---

## 3. Logo & brand

- **Product mark:** Galileo, a solid blue ellipse (`#0B6FD3`) plus a lighter blue arc (`#0B9BE0`), followed by the word "Galileo" in Open Sans 700, 22–28px.
- **Platform mark:** the CORE logo sits at the top of the rail.
- Use the SVG as-is, and don't recolour it:

```html
<svg viewBox="0 0 44 44"><ellipse cx="17" cy="22" rx="12" ry="20" fill="#0B6FD3"/><path d="M30 4c6 5 9 11 9 18s-3 13-9 18" stroke="#0B9BE0" stroke-width="4" fill="none" stroke-linecap="round"/></svg>
```

---

## 4. Colour tokens

```css
:root{
  /* Neutrals */
  --bg:#F4F4F5;  --surface:#FFFFFF;  --surface-2:#F4F4F4;
  --line:#E0E2E6;  --line-strong:#C9CDD3;
  --text:#1E2228;  --muted:#5A6271;  --faint:#8A919E;

  /* Brand */
  --primary:#0B5BD3;  --primary-hover:#094BB0;  --primary-weak:#E8F0FD;
  --primary-soft:#9DBDF0;  --on-primary:#FFFFFF;

  /* Semantic */
  --ok:#17784A;      --ok-weak:#E7F5ED;        /* net, buy, success */
  --danger:#B42318;  --danger-weak:#FDECEA;    /* sell, errors */
  --warn:#8F5200;    --warn-weak:#FFF6E5;  --warn-line:#E8B45C;  /* notices, penalties */

  /* Data series (allocation bars, chips) */
  --s1:#0B5BD3; --s2:#4A8BEA; --s3:#8DB6F2; --s4:#B9D1F6; --s5:#D6E3F8; --s6:#E6EDF9;

  --r:6px;   /* controls; cards use 8–10px */
  color-scheme:light;
}
```

| Use | Token |
|---|---|
| Page background | `--bg` |
| Cards, tables, inputs | `--surface` + 1px `--line` |
| Table header, total rows, panels | `--surface-2` |
| Primary buttons, links, focus, selected | `--primary` |
| Selected segment / chip fill | `--primary-weak` |
| Net amount, BUY badge | `--ok` on `--ok-weak` |
| SELL badge, validation errors | `--danger` on `--danger-weak` |
| Penalty / notice banner | `--warn` on `--warn-weak`, border `--warn-line` |

---

## 5. Typography

- **Font:** Open Sans (Google Fonts, 400/500/600/700); fallback `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- **Numbers:** always `font-variant-numeric: tabular-nums`, right-aligned in tables.

| Role | Size / weight |
|---|---|
| Page title (H1) | 32px / 600 (24px narrow) |
| Section / card title (H3) | 15–16px / 700 |
| Body | 14–15px / 400 |
| Labels, captions | 12–13px / 400, `--muted` |
| Key figure (net, total) | 24–32px / 700 |
| Badges | 11.5px / 700, uppercase, letter-spacing .05em |

---

## 6. Components

### Buttons
| Type | Style | Use |
|---|---|---|
| Primary | `--primary` fill, white text, radius `--r` | Submit, Save, Next (one per view) |
| Secondary | White, 1px `--primary` border, `--primary` text | Back, Cancel, Edit |
| Tertiary | Text only, `--primary`, underlined | Save as draft, Remove, Split evenly, View details |
| Disabled | `--primary-soft` fill / 50% opacity, `not-allowed` cursor | Next/Add before input is valid |

**Action order in page headers:** tertiary on the **left** (Save as draft), then secondary, then primary on the **far right** (Back · Submit).

### Segmented control (e.g. Transfer by)
- Options: `Percentage | Units | Amount`; default **Percentage**.
- Selected option: `--primary-weak` fill, `--primary` text, `aria-pressed="true"`.

### Toggle switch (e.g. Source wise transfer)
- Label above, switch only (no On/Off text), `role="switch"`.
- Off: grey track. On: `--primary` track.

### Badges
- `SELL`: red text on `--danger-weak`, thin red border.
- `BUY`: dark green text on light green (`#1B5E20` on `#E3F4E5`, border `#A5D6A7`).
- Status chip (Terminated / Retired): pill, `--danger-weak` for Terminated, grey for others.

### Tables
- Wrapper `.tw`: 1px `--line`, radius 8px, `overflow-x:auto`.
- Header row: `--surface-2`, 12–13px `--muted` labels.
- No zebra striping: all body rows are white, separated by 1px `--line`.
- Total row at the bottom: bold, `--surface-2`, labelled **"Total"**.
- Show investment names only (no ticker, no "· type" suffix) in tables.
- Source wise transfer: under each buy investment, show the source name in 12.5px `--muted`.

### Chips (Transfer to column)
- Show at most 2 chips, then a `+N` chip, then a **View details** link.
- Each chip value follows **Transfer by**: `33%`, `$450.00` or `12.3456 units`.
- Summary line above the chips: `$1,200.00 | 100.00% | 5.3004 units  transfer to 3 investments`.

### Slide-over (drawer)
- Fixed to the right edge, full height, starts at the employee panel edge.
- Header has the title (e.g. "Investment Transfer") on the left, with Cancel and Save on the right.
- Body: 3 columns.
  1. **Transfer from**: the amount input (or source checkboxes with an amount each).
  2. **Choose buy investment(s)**: a searchable list with Add buttons.
  3. **Set allocation**: the added investments as light blue cards. The input sits on the right when the column is ≥ 360px (container query). Each card has a **Remove** tertiary button.
- Footer: `Total` on the left, amount on the right, and Split evenly (2+ items).
- In source-wise mode, group cards under each source heading, with **× Remove all** on the right of each group.

### Inputs
- 42px tall, 1px `--line-strong`, radius `--r`; suffix (`%`, `$`, `units`) in a grey cap.
- Focus: 2px `--primary` outline.
- Error: red border plus a message below in `--danger` (12.5px / 600).

### Cards
- White, 1px `--line`, radius 10px. Header row has the title on the left and meta or a tag on the right, with a bottom border.
- Use a card only to group one subject. Don't nest cards.

### Calculation list (money summaries)
```
Gross withdrawal                $3,000.00
Federal tax  20%                 −$600.00
Early withdrawal penalty  10%    −$300.00
ETF fee                            −$5.00
────────────────────────────────────────
Net                             $2,095.00
```
- The rate goes beside the label in `--muted`.
- Every deduction carries a minus sign.
- The net row is bold, with a heavier top border.

### Flow strip (multi-step money)
`Withdrawn → −Fees → Distributed → −Tax → Net`. Use equal columns. Deductions are red; the final step is on `--ok-weak`.

### Notes & banners
- **Info:** blue on `--primary-weak`, (i) icon, one sentence.
- **Notice / penalty:** amber on `--warn-weak`, one sentence with the amount.
- **Do not** use a banner to repeat what's already on screen.

### Modal (confirmation)
- 480px max width. Has a title, a one-line body, then **Cancel** (secondary) and **Okay** (primary; red when the action is destructive).
- Standard copy: *"Changing these settings will clear the transfers you have set up. Do you wish to continue?"*

### Toast
- Dark pill, bottom centre, auto-hides. Can carry an **Undo** link.
- Examples: "2 saved transfers cleared", "Removed Vanguard 500 Index Admiral. The rest still adds up to the transfer value."

---

## 7. States

| State | Treatment |
|---|---|
| Starting page (no plan selected) | Dashed hint box: "Select a plan to see the investments you can transfer." (No "No records found" illustration.) |
| Empty column / list | Dashed box with instruction, e.g. "Selected investments will appear here. Enter the allocation for each." |
| No search match | `No match for "<query>".` |
| Disabled action | Greyed button. Explain why near the button (e.g. "Enter how much to move out"). |
| Locked settings | Once transfers are saved, changing Transfer by or Source wise transfer opens the confirmation modal. |
| Hover | Rows: subtle `--surface-2`; buttons: `--primary-hover`. |
| Focus | 2px `--primary` outline, 2px offset, on every interactive element. |
| Selected | `--primary-weak` fill + `--primary` text. |
| Loading | Keep the layout and show a skeleton in place of values. Never use a blank screen. |
| Success | After submit, a green success banner with the request reference and a link to view it. |

---

## 8. Error & edge scenarios

| Scenario | Message (inline, `role="alert"`) |
|---|---|
| Amount above balance | "Transfer value is more than available." |
| No amount entered | "Enter how much to move out." |
| Allocations under 100% | "$X left to allocate. Allocations must add up to $Y." |
| Allocations over 100% | "Over by $X. Allocations must add up to $Y." |
| Source allocations off | "Allocations must add up to each source's amount." |
| Units not supported | "Units not available. Choose Percentage or Amount." |
| Fund rule (redemption fee) | "Short-term redemption fee: 2.00% on shares bought in the last 90 days." |
| Fund closing | "Closes to new money on 12/31/2026. Existing holdings can stay." |
| Round-trip block | "Round-trip limit: … Transfers in are blocked until …" (fund shown disabled with reason) |
| Settings change with saved transfers | Confirmation modal (see Components). |
| Missing / truncated data | Show what's known; never invent values. |

**Error copy rules:** say what's wrong and how to fix it, include the actual amount, don't apologise, and keep it to one sentence.

---

## 9. Copy & labels (current vocabulary)

| Use | Not |
|---|---|
| Account balance | Available balance |
| Transfer from / Transfer to | Move from / Moving into |
| Choose buy investment(s) | Choose investments |
| Set allocation | Move into |
| Sell investment / Buy investment(s) | From investment / From source |
| Amount | Est. amount / Est. |
| Total | Total moving out / Allocated X of Y |
| Source wise transfer | Transfer by source / Source level transfer |
| Investment Transfer (slide-over title) | Replace investment |
| Transfer Summary (review title) | Review transfer request |
| 04/04 investments (count) | 4 investments · 1 transfer · $… |

- Sentence case for buttons and labels.
- Mask SSNs (`AAA-GG-XXXX`) and account numbers (`••••0093`).
- Money: `$1,200.00`. Percent: `33.33%`. Units: 4 decimals (`5.3004 units`).

---

## 10. Accessibility checklist

- Every input has a label or `aria-label`; toggles use `role="switch"`.
- Use `aria-pressed` on segmented options and `aria-expanded` on collapsibles.
- Modals and the slide-over trap focus and close on Esc.
- Errors use `role="alert"`; toasts use `role="status"`.
- Colour contrast is at least 4.5:1 for text. Never use colour alone (badges also carry text).
- Respect `prefers-reduced-motion`; animations are instant by default.

---

## 11. Starting a new screen (checklist)

1. Copy the shell (rail + top bar + employee panel) from `withdrawal-review.html`.
2. Paste the `:root` tokens from section 4.
3. Write the page header: title, then actions (tertiary left, primary far right).
4. Put the key figure first, then the calculation, then 2-up detail cards.
5. Use the shared components only; add new ones to this guide.
6. Fill in every state in section 7 and every error that applies from section 8.
7. Check the maths, labels (section 9) and accessibility (section 10) before review.
