# Overview

InBack/Clickback is a Flask-based real estate platform specializing in cashback services for new construction properties in the Krasnodar region, expanding across Krasnodarsky Krai and the Republic of Adygea. It connects buyers and developers, offers property listings, streamlines application processes, and integrates CRM tools. The platform provides unique cashback incentives, an intuitive user experience, intelligent property search with interactive maps, residential complex comparisons, user favorites, a manager dashboard for client and cashback tracking, and robust notification and document generation capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

**Design Preferences:**
- Brand color: rgb(0 136 204) = #0088CC - consistently applied across entire dashboard
- No purple/violet/fuchsia colors in UI

# System Architecture

## Frontend

The frontend utilizes server-side rendered HTML with Jinja2 and CDN-based TailwindCSS for a mobile-first, responsive design. Interactivity is handled by modular vanilla JavaScript, enabling features like smart search, real-time filtering, Yandex Maps integration, property comparison, and PDF generation.

## Backend

Built with Flask 2.3.3, the backend employs an MVC pattern with blueprints and SQLAlchemy 2.0.32 with PostgreSQL. Key features include Flask-Login for session management and RBAC (Regular Users, Managers, Admins), robust security, and custom parsing for Russian address formats. The system supports phone verification, manager-to-client presentation delivery, multi-city data management, dynamic city selection, and city-aware data filtering. Performance is optimized with Flask-Caching and batch API endpoints to mitigate N+1 query problems.

## Data Storage

PostgreSQL, managed via SQLAlchemy, serves as the primary database, storing Users, Managers, Properties, Residential Complexes, Developers, Marketing Materials, transactional records, and search analytics.

## Authentication & Authorization

The system supports Regular Users, Managers, and Admins through a unified Flask-Login system with dynamic user model loading.

## Intelligent Address Parsing & Search System

This system leverages DaData.ru for address normalization and Yandex Maps Geocoder API for geocoding. It features auto-enrichment for new properties, optimized batch processing, smart caching, and city-aware address suggestions.

## UI/UX and Feature Specifications

- **Key Features**: AJAX-powered Sorting and Filtering with infinite scroll, Residential Complex Image Sliders, PostgreSQL-backed Comparison System, Interactive Map Pages (Leaflet/Yandex Maps), Unified Filter + Search Row (Desktop), Mobile Sticky Search Bar with Fullscreen Filter Overlays, Fullscreen Map Modals (Mobile), Saved Search Feature, Smart Search with Database-Backed History, Dynamic Results Counter, Property Alert Notification System (email/Telegram), Marketing Materials Management, Action Buttons on Detail Pages, Excursion/Online Showing CTA Blocks, City Selector UI with Automatic IP-based Detection.
- **Dashboard Features**: Modernized dashboard with gradient stat cards, enhanced loading states, collapsible sidebar with dynamic navigation links, real-time badge counters, user profile, and an Avatar Fallback System.
- **Balance Management System**: Production-ready system with `UserBalance`, `BalanceTransaction`, and `WithdrawalRequest` models. Includes a service layer for credit/debit operations and withdrawal workflows, dedicated user and admin API endpoints, UI integration, auto-cashback, and email/Telegram notifications. All financial amounts use Decimal precision.

## Comprehensive SEO Optimization

The platform implements production-ready multi-city SEO for 8 cities, including Canonical URLs, City-Aware Meta Tags, JSON-LD Structured Data (schema.org for properties, complexes, organization, FAQ), Regional Variations, Comprehensive Sitemap, SEO-Friendly URLs, robots.txt Configuration, HSTS Headers, and Yandex.Metrika analytics.

# External Dependencies

## Third-Party APIs

-   **SendGrid**: Email sending.
-   **OpenAI**: Smart search and content generation.
-   **Telegram Bot API**: User notifications and communication.
-   **Yandex Maps API**: Interactive maps, geocoding, and location visualization.
-   **DaData.ru**: Address normalization, suggestions, and geocoding.
-   **SMS.ru, SMSC.ru**: Russian SMS services for phone verification.
-   **Google Analytics**: User behavior tracking.
-   **LaunchDarkly**: Feature flagging.
-   **Chaport**: Chat widget.
-   **reCAPTCHA**: Spam and bot prevention.
-   **ipwho.is**: IP-based city detection.

## Web Scraping Infrastructure

-   `selenium`, `playwright`, `beautifulsoup4`, `undetected-chromedriver`: Used for automated data collection.

## PDF Generation

-   `weasyprint`, `reportlab`: Used for generating property detail sheets, comparison reports, and cashback calculations.

## Image Processing

-   `Pillow`: Used for image resizing, compression, WebP conversion, and QR code generation.