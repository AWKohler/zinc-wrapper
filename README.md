# Zinc API Wrapper

A Next.js application for Amazon ordering through Zinc's Addax/ZMA API.

## Features

- **Product Lookup**: Search Amazon products by ASIN
- **Order Creation**: Place orders through Zinc's managed accounts (Addax/ZMA)
- **Order Management**: View order history, track shipments, and manage orders
- **Webhook Integration**: Real-time order status updates
- **Responsive UI**: Built with shadcn/ui components

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Deployment**: Optimized for Vercel Edge Functions

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd zinc-wrapper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.local.example` to `.env.local` and fill in your values:
   ```env
   ZINC_CLIENT_TOKEN=your_zinc_client_token_here
   DATABASE_URL=your_neon_database_url_here
   NEXT_PUBLIC_APP_URL=https://your-vercel-domain.vercel.app
   ```

   - Get your Zinc client token from [dash.zinc.io](https://dash.zinc.io)
   - Create a Neon database at [neon.tech](https://neon.tech)
   - The app URL will be provided by Vercel after deployment

4. **Set up the database**
   ```bash
   npm run db:generate  # Generate migrations
   npm run db:push      # Apply migrations to database
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio for database management

## Project Structure

```
/app
  /api
    /zinc         # Zinc API proxy endpoints
    /webhooks     # Webhook handlers
    /orders       # Order management endpoints
  /panel          # Main UI pages
    /checkout     # Checkout flow
    /orders       # Order list and details
/components       # React components
/lib
  /zinc           # Zinc API client
  /db             # Database schema and client
```

## Key Features

### Product Lookup
- Enter an Amazon ASIN to fetch product details
- View product information including title, images, and details

### Order Flow
1. Look up product by ASIN
2. Add to checkout
3. Enter shipping information
4. Configure order options (shipping method, gift settings)
5. Place order through Zinc's Addax system

### Order Management
- View all orders with status tracking
- Detailed order timeline showing all events
- Price breakdown and tracking information
- Raw JSON view for debugging

### Webhook Integration
All Zinc webhooks are handled at `/api/webhooks/zinc`:
- `request_succeeded` - Order placed successfully
- `request_failed` - Order failed
- `tracking_updated` - Shipping updates
- `status_updated` - Order status changes
- `case_updated` - ZMA case updates

## Deployment

### Vercel Deployment

1. Push to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

The `NEXT_PUBLIC_APP_URL` will be automatically set by Vercel.

### Database Setup

Make sure to run migrations after setting up your database:
```bash
npm run db:push
```

## Security Notes

- Never expose your `ZINC_CLIENT_TOKEN` to the client
- All Zinc API calls are made server-side
- Webhook endpoints accept requests from Zinc only
- Consider adding additional authentication for production use

## Development Tips

- Use `npm run db:studio` to inspect your database
- Check the Network tab for API responses during development
- Zinc webhooks can be tested using ngrok for local development
- Order statuses are automatically derived from webhook payloads

## Future Enhancements

The following features are partially implemented with UI in place:
- Order cancellation
- Return requests
- Case management
- Background order reconciliation

## Support

For Zinc API issues: support@zinc.io
For application issues: Create a GitHub issue
