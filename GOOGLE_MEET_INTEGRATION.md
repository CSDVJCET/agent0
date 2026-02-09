# Google Meet Integration for Calendar Events

This feature allows users to generate Google Meet links directly from the event scheduling confirmation UI.

## Features

### 1. Generate Google Meet Link Button
- Located next to the location field in the event scheduling confirmation dialog
- Click the video icon (📹) to generate a new Google Meet link
- The generated link is automatically populated in the location field
- Shows a loading spinner while generating the link

### 2. Backend API Endpoints

#### Generate Meet Link API
**Endpoint:** `POST /api/calendar/generate-meet-link`

**Description:** Generates a Google Meet conference link by creating a temporary calendar event and extracting the Meet link, then deleting the temporary event.

**Response:**
```json
{
  "error": false,
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx",
  "message": "Google Meet link generated successfully!"
}
```

**How it works:**
1. Creates a temporary calendar event with Google Meet conference data
2. Extracts the Meet link from the conference data
3. Deletes the temporary event immediately
4. Returns the Meet link to the client

#### Create Event with Meet Link
**Endpoint:** `POST /api/calendar/create-event`

**New Field:** `addMeetLink` (optional boolean)

**Auto-detection:** If the location field contains "meet.google.com", a Google Meet conference is automatically added to the event.

**Request:**
```json
{
  "title": "Team Meeting",
  "startDateTime": "2026-02-10T14:00:00Z",
  "endDateTime": "2026-02-10T15:00:00Z",
  "location": "https://meet.google.com/abc-defg-hij",
  "attendees": ["user@example.com"],
  "description": "Discuss project updates",
  "addMeetLink": true
}
```

**Response includes:**
```json
{
  "error": false,
  "eventId": "event123",
  "summary": "Team Meeting",
  "startTime": "2026-02-10T14:00:00Z",
  "endTime": "2026-02-10T15:00:00Z",
  "link": "https://calendar.google.com/event?eid=...",
  "meetLink": "https://meet.google.com/abc-defg-hij",
  "message": "Event created successfully!"
}
```

## UI Implementation

### EventSchedulingConfirmation Component
Location: `components/ai-elements/event-scheduling-confirmation.tsx`

**Key Changes:**
1. Added `VideoIcon` import from `lucide-react`
2. Added `isGeneratingMeet` state to track loading
3. Added `handleGenerateMeetLink()` function to call the API
4. Modified location field to include the generate button
5. Added helper text below location field

**UI Structure:**
```tsx
<div className="flex gap-2">
  <Input
    value={formData.location}
    placeholder="Office, Zoom link, or address"
    className="flex-1"
  />
  <Button
    variant="outline"
    size="icon"
    onClick={handleGenerateMeetLink}
    disabled={isGeneratingMeet}
    title="Generate Google Meet link"
  >
    {isGeneratingMeet ? <Loader2Icon /> : <VideoIcon />}
  </Button>
</div>
<p className="text-xs text-muted-foreground">
  Click the video icon to generate a Google Meet link
</p>
```

## User Flow

1. **User says:** "Create an event for team sync tomorrow at 2pm"
2. **AI responds:** Opens EventSchedulingConfirmation generative UI
3. **User sees:** Event details form with location field
4. **User clicks:** Video icon button next to location
5. **System generates:** Google Meet link via API
6. **Location field:** Auto-populated with Meet link
7. **User clicks:** "Create Event" button
8. **System creates:** Calendar event with embedded Meet conference
9. **Attendees receive:** Calendar invite with "Join with Google Meet" button

## Technical Details

### Google Calendar API Requirements
- **Scope:** `https://www.googleapis.com/auth/calendar`
- **API Version:** Calendar v3
- **Conference Data:** Requires `conferenceDataVersion=1` query parameter
- **Conference Type:** `hangoutsMeet` (Google Meet)

### Dependencies
- `uuid` - For generating unique conference request IDs
- `@types/uuid` - TypeScript types for uuid

### Authentication
- Uses existing Google OAuth tokens from `lib/google-calendar.ts`
- Token retrieval via `getValidAccessToken(DEFAULT_USER_ID)`
- Same auth flow as other calendar operations

### Error Handling
- Unauthorized (401) - Calendar not connected
- API errors - Displayed in UI via `errorMessage` state
- Network errors - Caught and displayed to user

## Future Enhancements

1. **Pre-select Meet option:** Add toggle to auto-add Meet link to all events
2. **Meet settings:** Custom Meet settings (recording, host controls)
3. **Alternative video platforms:** Zoom, Microsoft Teams integration
4. **Event templates:** Save event types with default Meet settings
5. **Recurring events:** Support Meet links for recurring event series

## Troubleshooting

### Meet link not generating
- Check if Google Calendar is properly connected
- Verify OAuth scopes include calendar permissions
- Check browser console for API errors

### Meet link not appearing in event
- Ensure `conferenceDataVersion=1` parameter is included
- Verify `conferenceData` structure in API request
- Check that location field contains the Meet link

### Temporary events visible
- If generation fails mid-process, temporary events may remain
- These are labeled "Temporary Event - Google Meet Link"
- Safe to manually delete from calendar
