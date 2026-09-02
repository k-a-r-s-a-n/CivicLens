# Civic Eye

Build a mobile-first civic transparency web app called CivicLens.

Layout:

- Top bar with "CivicLens" logo text and tagline "Radical Transparency for Indian Cities"
- Main view is a full-screen interactive map (use react-leaflet with OpenStreetMap tiles)
- Center the map on Chennai, India (coordinates: 13.0827, 80.2707), zoom level 12
- A floating "+" button in the bottom-right corner to open a complaint form
- A "Dashboard" button in the top-right to toggle to a ward performance view

Map pins:

- Use colored circle markers: Red = Unresolved, Yellow = In Progress, Green = Resolved
- Each pin click opens a popup showing: complaint title, description, upvote count, status, date
- Add a small upvote button (thumbs up icon + count) inside each popup

Use mock data — create an array of 15 sample complaints across real Chennai locations (T. Nagar, Velachery, Adyar, Mylapore, Anna Nagar, Porur, Tambaram). Include varied statuses and upvote counts.

No backend. No login. No authentication. All data is hardcoded.

Style: Clean, modern, white background, use shadcn/ui components. Dark green (#166534) as primary accent color.

Add a complaint submission modal that opens when the user clicks the "+" button.

Form fields:

- Click on map to set location (show selected coordinates)
- Category dropdown: Pothole, Garbage, Streetlight, Water Leak, Drainage, Stray Animals, Other
- Title (short text)
- Description (textarea)
- Photo upload placeholder (just UI, no actual upload)
- Your name (optional, single text field)
- Submit button

On submit: add the new complaint to the mock data array and show a new pin on the map. Show a success toast "Complaint filed! Pin added to public map."

No backend. Just update the local state.

Add a Ward Performance Dashboard view (toggled from the top nav).

Show a table/leaderboard of 10 Chennai wards with columns:

- Ward Name (e.g., Ward 112 - T. Nagar, Ward 142 - Velachery)
- Open Complaints (number)
- Resolution Rate % (progress bar)
- Avg Days to Fix (number)
- SLA Breaches (number, red if > 5)
- Status badge: "Failing" (red), "Average" (yellow), "Good" (green)

Sort by worst resolution rate at top (worst performers first — this is a transparency tool).

Add a summary row at top: "Total Open: 847 | City Avg Resolution: 34% | Avg Fix Time: 18 days"

Use mock data. No backend.
"Make this mobile-responsive, test on small screens"
"Add a loading skeleton for the map"
"Add an empty state: 'No complaints yet in this area'"
"Add a landing/hero section explaining what CivicLens is"

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
