# StayAI – AI-Powered Accommodation Booking Platform

StayAI is a full-stack accommodation booking platform inspired by Airbnb, built using the MERN stack. It allows users to explore properties, create listings, write reviews, and book accommodations.

## Key Features

### Authentication & Authorization
- User registration and login
- Guest and host roles
- Protected routes and authorization middleware

### Listing Management
- Create, edit, and delete property listings
- View property details
- Host listing management

### Booking System
- Book properties with check-in and check-out dates
- Prevent overlapping bookings
- Cancel bookings
- My Trips page to manage reservations

### AI Features

**1. AI Travel Assistant**
- Understands natural-language travel requests.
- Converts user requests into structured search criteria using an LLM.
- Supports preferences such as location, bedrooms, property type, and budget.
- Validates AI output and builds MongoDB queries securely on the backend.
- The LLM never directly accesses the database.

**2. AI Listing Generator**
- Generates property titles and descriptions.
- Creates relevant search tags for hosts.
- Helps hosts create listings more efficiently.

### Security & Reliability
- Prompt-injection protection
- Input validation
- Per-user rate limiting
- Graceful AI API failure handling
- Empty-result handling
- 27 automated tests

## Tech Stack

- **Frontend:** EJS, HTML, CSS, Bootstrap, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** Passport.js
- **AI Integration:** Groq API, LLM-based natural-language processing
- **Testing:** Automated tests
- **Tools:** Git, GitHub, dotenv

## What I Learned

- Building full-stack applications using MERN-related technologies
- Designing RESTful routes and backend services
- Authentication and authorization
- MongoDB query construction and validation
- Integrating LLMs into real-world applications
- Writing automated tests
- Handling security and API failures

## Project Status

Completed – Personal Portfolio Project

## Author

Anwar Baig

GitHub: https://github.com/anwarbaig0212-creator
