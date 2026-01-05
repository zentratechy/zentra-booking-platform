# Zentra iOS App

A business management iOS app for Zentra, built with UIKit and Firebase.

## Features

- **Authentication**: Firebase Auth integration with email/password login
- **Customer Management**: View, add, edit, and search customers
- **Payment Management**: View payment history and status
- **Calendar View**: Monthly calendar with appointment management
- **Real-time Sync**: Live updates from Firestore database

## Architecture

- **MVVM Pattern**: Clean separation of concerns
- **UIKit**: Programmatic UI (no Storyboards)
- **Firebase**: Authentication and Firestore database
- **Combine**: Reactive programming for data binding

## Project Structure

```
Zentra/
├── Models/
│   ├── User.swift
│   ├── Client.swift
│   └── Appointment.swift
├── Services/
│   ├── AuthManager.swift
│   ├── ClientManager.swift
│   └── AppointmentManager.swift
├── Views/
│   ├── LoginViewController.swift
│   ├── MainTabBarController.swift
│   ├── ClientsViewController.swift
│   ├── PaymentsViewController.swift
│   ├── CalendarViewController.swift
│   └── [Various Cell and Detail ViewControllers]
└── AppDelegate.swift
```

## Requirements

- iOS 16.6+
- Xcode 15+
- Firebase project configured

## Setup

1. Open `Zentra.xcodeproj` in Xcode
2. Ensure Firebase is properly configured with `GoogleService-Info.plist`
3. Build and run on simulator or device

## Key Components

### Authentication
- `AuthManager`: Handles Firebase authentication
- `LoginViewController`: Login screen with email/password

### Data Management
- `ClientManager`: Manages customer data with real-time Firestore sync
- `AppointmentManager`: Handles appointment data and calendar functionality

### UI Components
- Tab-based navigation with Customers, Payments, and Calendar
- Custom table view cells for data display
- Calendar view with appointment indicators
- Search functionality for customers

## Database Integration

The app connects to the same Firestore database as the web application, ensuring data consistency across platforms. Real-time listeners provide instant updates when data changes.

## Design

The app follows iOS Human Interface Guidelines while maintaining consistency with the web application's branding and color scheme.






