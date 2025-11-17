# Common Components - Error Handling & User Feedback

This directory contains reusable UI components for error handling, loading states, and user feedback throughout the FleetTrack application.

## Components

### Toast (Toast.jsx)

Global toast notification system using `react-hot-toast`.

**Usage:**

```jsx
import toast from "react-hot-toast";

// Success notification
toast.success("Vehicle added successfully");

// Error notification
toast.error("Failed to save vehicle");

// Loading notification with update
const toastId = toast.loading("Saving...");
// Later update it
toast.success("Saved!", { id: toastId });
```

**Features:**

- Auto-dismisses after 3-5 seconds
- Positioned at top-right
- Color-coded (green for success, red for error)
- Stacks multiple notifications

### LoadingSpinner (LoadingSpinner.jsx)

Reusable loading spinner component.

**Props:**

- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `text`: Optional loading text
- `fullScreen`: Boolean for full-screen overlay

**Usage:**

```jsx
import LoadingSpinner from './components/common/LoadingSpinner';

// Inline spinner
<LoadingSpinner size="sm" />

// Full screen with text
<LoadingSpinner fullScreen text="Loading dashboard..." />
```

### ErrorMessage (ErrorMessage.jsx)

Displays error states with optional retry functionality.

**Props:**

- `message`: Error message to display
- `onRetry`: Optional callback for retry button
- `fullScreen`: Boolean for full-screen display

**Usage:**

```jsx
import ErrorMessage from "./components/common/ErrorMessage";

<ErrorMessage
  message="Failed to load data"
  onRetry={() => loadData()}
  fullScreen
/>;
```

### ErrorBoundary (ErrorBoundary.jsx)

React error boundary to catch and handle component errors.

**Usage:**

```jsx
import ErrorBoundary from "./components/common/ErrorBoundary";

<ErrorBoundary>
  <YourApp />
</ErrorBoundary>;
```

**Features:**

- Catches React component errors
- Shows user-friendly error UI
- Displays error details in development mode
- Provides "Try Again" and "Reload Page" buttons

## Implementation Pattern

### Async Operations with Toast

```jsx
const handleSubmit = async (data) => {
  const toastId = toast.loading("Saving...");
  try {
    await saveData(data);
    toast.success("Saved successfully", { id: toastId });
  } catch (error) {
    toast.error(error.message || "Failed to save", { id: toastId });
  }
};
```

### Loading States

```jsx
if (loading) {
  return <LoadingSpinner fullScreen text="Loading..." />;
}
```

### Error States

```jsx
if (error) {
  return <ErrorMessage message={error} onRetry={refetch} />;
}
```

## Best Practices

1. **Always provide user feedback** for async operations
2. **Use loading states** to indicate progress
3. **Show specific error messages** when possible
4. **Provide retry options** for failed operations
5. **Use toast for non-blocking notifications**
6. **Use ErrorMessage for blocking errors**
7. **Wrap app in ErrorBoundary** to catch unexpected errors

## Toast Configuration

The toast system is configured in `Toast.jsx` with:

- Position: top-right
- Duration: 3-5 seconds based on type
- Custom styling for success/error/loading states
- Icon support for visual feedback
