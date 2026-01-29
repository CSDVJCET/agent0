# Gmail UI Mockup - Visual Representation

## 1. Pending State (Draft Review)

```
┌─────────────────────────────────────────────────────────────┐
│  ✨ Email Draft Composed                               [▼]  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🧠 Composing your email                               │  │
│  │ ─────────────────────────────────────────────────────  │  │
│  │ I've composed an email based on your request to       │  │
│  │ john@example.com regarding the project update. The    │  │
│  │ subject summarizes the main topic and the body        │  │
│  │ includes key points you mentioned.                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ✉️  Review Email Draft                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Confirm or edit before sending                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 TO *                                                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ john@example.com                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  👤 CC                                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ (optional)                                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  👤 BCC                                                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ (optional)                                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  SUBJECT *                                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Project Update - Q1 Review                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  📝 MESSAGE *                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Hi John,                                              │  │
│  │                                                       │  │
│  │ I wanted to share our Q1 project update with you.    │  │
│  │ We've made significant progress on all milestones    │  │
│  │ and are on track to meet our goals.                  │  │
│  │                                                       │  │
│  │ Key achievements:                                     │  │
│  │ - Completed feature development                       │  │
│  │ - Reduced bug count by 40%                           │  │
│  │ - Improved performance by 25%                        │  │
│  │                                                       │  │
│  │ Let me know if you have any questions.               │  │
│  │                                                       │  │
│  │ Best regards                                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────────┐  ┌────────────────────────────────┐    │
│  │  ✕  Cancel     │  │  ��  Send Email                │    │
│  └────────────────┘  └────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. Sending State

```
┌─────────────────────────────────────────────────────────────┐
│  ✉️  Review Email Draft                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [All fields shown as above but disabled]                   │
│                                                             │
│  ┌────────────────┐  ┌────────────────────────────────┐    │
│  │  ✕  Cancel     │  │  ⟳  Sending...                 │    │
│  └────────────────┘  └────────────────────────────────┘    │
│                      (disabled)    (spinning icon)          │
└─────────────────────────────────────────────────────────────┘
```

## 3. Success State

```
┌─────────────────────────────────────────────────────────────┐
│  ✓  Email Sent Successfully                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Your message has been delivered                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  To                                                         │
│  john@example.com                                           │
│                                                             │
│  Subject                                                    │
│  Project Update - Q1 Review                                 │
│                                                             │
│  Message ID: 18d4f2c8b9a7e3f1                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 4. Cancelled State

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  Email Cancelled                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  The email was not sent                                     │
└─────────────────────────────────────────────────────────────┘
```

## 5. Error State

```
┌─────────────────────────────────────────────────────────────┐
│  ✕  Failed to Send Email                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Gmail is not connected. Please authenticate first.         │
│                                                             │
│  ┌────────────────┐                                         │
│  │  Try Again     │                                         │
│  └────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

## Design Features

### Visual Hierarchy
- **Header**: Mail icon + "Review Email Draft"
- **Subheader**: Instructional text
- **Form Fields**: Clear labels with required markers (*)
- **Buttons**: Distinct Cancel (outline) and Send (filled) buttons

### Styling
- **Colors**: 
  - Primary: Blue/purple for mail icon and send button
  - Success: Green for success state
  - Warning: Amber for cancelled state
  - Error: Red for error state
- **Shadows**: Subtle shadow for elevation
- **Borders**: Soft borders with backdrop blur
- **Animation**: Smooth transitions between states

### Accessibility
- All fields have labels
- Required fields marked with *
- Disabled state during sending
- Clear error messages
- Keyboard navigable

### Responsive Design
- Max width: ~512px (max-w-lg)
- Padding: Consistent spacing
- Mobile-friendly textarea
- Touch-friendly button sizes

## Comparison with Calendar UI

Both UIs share:
- Chain of Thought reasoning section
- Collapsible reasoning (default closed)
- Form with required/optional fields
- Cancel/Confirm button layout
- Success/Error/Cancelled states
- Similar color scheme and animations

Differences:
- Email has To/CC/BCC fields vs Calendar's date/time
- Email has larger body textarea vs Calendar's description
- Email success shows inline vs Calendar shows separate component
