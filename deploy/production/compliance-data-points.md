# User Data Collection Points

## Overview
This document lists all API endpoints and system components that collect, store, or process user data, for compliance review.

## Data Collection Points

### 1. WeChat Login (`POST /v1/auth/login`)
- **Data collected**: WeChat OpenID, session_key, nickname, avatar URL
- **Storage**: Users table (PostgreSQL)
- **Retention**: Until account deletion
- **Purpose**: User authentication and profile display

### 2. Chat Messages (`POST /v1/chat/stream`, `GET /v1/chat/sessions/:id/messages`)
- **Data collected**: User message content, AI response content, session metadata
- **Storage**: sessions + messages tables (PostgreSQL)
- **Retention**: 30 days (auto-cleanup via scheduled task)
- **Purpose**: AI conversation service, improving recommendation quality

### 3. Search Queries (`GET /v1/search`, `POST /v1/search`)
- **Data collected**: Search keywords, filter parameters
- **Storage**: Application logs (rotated daily, retained 30 days)
- **Retention**: 30 days (log retention)
- **Purpose**: Search functionality, usage analytics

### 4. Favorites (`POST /v1/favorites`, `GET /v1/favorites`)
- **Data collected**: Product IDs that user bookmarked
- **Storage**: Favorites table (PostgreSQL)
- **Retention**: Until user removes favorite or deletes account
- **Purpose**: Allow users to save and revisit products

### 5. Pet Profiles (`POST /v1/pets`, `GET /v1/pets`)
- **Data collected**: Pet name, breed, age, weight, photo
- **Storage**: Pets table (PostgreSQL)
- **Retention**: Until user deletes pet profile or deletes account
- **Purpose**: Personalized product recommendations based on pet info

### 6. Application Logs
- **Data collected**: Request paths, timestamps, IP addresses, user IDs
- **Storage**: Log files (rotated daily, retained 30 days)
- **Retention**: 30 days
- **Purpose**: Debugging, monitoring, security auditing

## Data Protection Measures

- All sensitive data transmitted over HTTPS
- Passwords and secrets stored as hashed values
- Database access restricted to application service only
- Logs automatically rotated and cleaned every 30 days
- User data deletable upon request

## Compliance Checklist

- [ ] Privacy policy displayed on first launch
- [ ] User consent obtained before data collection
- [ ] Data retention policy documented and enforced
- [ ] User data export/deletion mechanism available
- [ ] HTTPS enforced for all API communication
- [ ] Third-party data sharing disclosed
