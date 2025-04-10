# Link Insight Tracker

A full-stack URL shortener with comprehensive analytics and MongoDB persistent storage, enabling users to create, track, and manage shortened links efficiently.

## Features

- Create shortened URLs with optional expiration dates
- Custom link aliases
- Click tracking and analytics
- Device and geographic statistics
- User authentication
- Mobile-responsive design

## Tech Stack

- **Frontend**: React, TailwindCSS, shadcn/ui components
- **Backend**: Node.js, Express
- **Database**: MongoDB
- **Authentication**: Passport.js with local strategy
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB database (Atlas recommended for production)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=your-mongodb-connection-string
SESSION_SECRET=your-session-secret
```

For Vercel deployment, these should be added as environment variables in the Vercel dashboard.

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/link-insight-tracker.git
cd link-insight-tracker
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm run dev
```

## Deployment on Vercel

This application is configured for seamless deployment on Vercel:

1. Connect your GitHub repository to Vercel or use the Vercel CLI:
   ```
   vercel login
   vercel
   ```

2. Add the required environment variables in the Vercel dashboard:
   - `MONGODB_URI` - Your MongoDB connection string
   - `SESSION_SECRET` - A secure random string for session encryption

3. Configure the project with these specific settings:
   - **Framework Preset**: Vite (important)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist` (not dist/public)
   - **Root Directory**: `.` (project root)
   - **Install Command**: `npm install`

4. **MongoDB Atlas Setup**:
   - In your MongoDB Atlas dashboard, go to Network Access
   - Add a new IP address entry with `0.0.0.0/0` to allow all IPs
   - This is required because Vercel uses dynamic IPs for serverless functions

5. **Troubleshooting Deployment**:
   - If you see 404 errors on API routes, check that:
     - `vercel.json` has the correct route configuration
     - Your framework preset is set to Vite (not Node.js)
   - If you see MongoDB connection errors:
     - Verify your MongoDB Atlas IP whitelist includes `0.0.0.0/0`
     - Check that your `MONGODB_URI` environment variable is correctly set
     - Make sure your MongoDB Atlas cluster is in an active state

## Architecture

The application follows a serverless architecture optimized for Vercel deployment:

- API routes in `/api` directory for serverless functions
- MongoDB connection pooling optimized for serverless environment
- Static assets served from `/dist/public`

## Development Guidelines

- Frontend code is in the `client/src` directory
- Backend API routes are in `server/routes.ts`
- Database models are in `server/db/models`
- Shared types are in `shared/schema.ts`

## License

MIT