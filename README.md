# CosmicBeauty - E-Commerce Platform

A modern, full-stack beauty products e-commerce platform built with MERN stack.

## Features

### Customer Experience
- **User Authentication**: Registration, login, email verification, password reset
- **Product Catalog**: Browse, search, and filter beauty products
- **Shopping Cart**: Persistent cart with price snapshots
- **Order Management**: Track orders, request refunds
- **Payment Processing**: Stripe integration for secure payments (Stripe is running on test mode)
- **Wishlist**: Save favorite products
- **Address Management**: Add, edit, delete shipping addresses
- **Help Desk**: Submit support tickets and track responses
- **Reviews & Ratings**: Purchase-gated product reviews

### Admin Dashboard
- **KPI Cards**: Total sales, orders, new users
- **Navigation Cards**: Modular access to different sections
- **Sales Reports**: Detailed sales analytics
- **Product Management**: CRUD operations with soft delete
- **Low Stock Alerts**: Inventory monitoring
- **User Management**: Customer account management
- **Support Tickets**: Handle customer support requests

### Support Features
- **Ticket Management**: View and respond to customer tickets
- **Customer Information**: Access to user details for support

## Technical Stack

### Frontend
- **React 18** with modern hooks
- **Vite** for fast development and building
- **Lucide React** for consistent icons
- **CSS Grid & Flexbox** for responsive design
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Stripe** for payment processing
- **Nodemailer** for email services
- **bcrypt** for password hashing

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cosmicbeauty
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   
   Create `.env` file in backend directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/cosmicbeauty
   JWT_SECRET=your_jwt_secret_key
   CLIENT_URL=http://localhost:5173
   
   # Optional: Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   
   # Optional: Stripe Configuration
   STRIPE_SECRET=sk_test_your_stripe_secret_key
   CURRENCY=usd
   ```
   Create `.env` file in frontend directory:

   ```env
   VITE_API_URL=http://localhost:5000
   VITE_STRIPE_PUBLIC_KEY=pk_test_your_key

4. **Start Development Servers**
   ```bash
   # Terminal 1: Start Backend
   cd backend
   npm run dev

   # Terminal 2: Start Frontend
   cd frontend
   npm run dev
   ```

5. **Access Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api

## Responsive Design

- **Mobile-First**: Optimized for mobile devices
- **Tablet Support**: Adaptive layouts for tablets
- **Desktop Experience**: Full-featured desktop interface
- **Touch-Friendly**: Interactive elements optimized for touch

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Customer, Admin, Support roles
- **Password Hashing**: bcrypt for secure password storage
- **Email Verification**: Account verification process
- **Input Validation**: Server-side validation for all inputs
- **CORS Configuration**: Proper cross-origin resource sharing

## Project Structure

```
cosmicbeauty/
├── backend/
│   ├── src/
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth and validation
│   │   └── utils/           # Helper functions
│   └── package.json
└── frontend/
    ├── src/
    │   ├── pages/            # React components
    │   ├── state/            # Context providers
    │   ├── api.js            # API configuration
    │   └── App.jsx           # Main app component
    └── package.json
```

## UI/UX Features

- **Modern Design**: Clean, professional interface
- **Consistent Theme**: Pink color scheme throughout
- **Interactive Elements**: Hover states and transitions
- **Loading States**: Proper loading indicators
- **Error Handling**: User-friendly error messages
- **Form Validation**: Real-time form feedback

## Recent Updates

### Admin Dashboard Refactor
- **Navigation Cards**: Modular section access
- **KPI Display**: Enhanced metrics visualization
- **Customer Information**: Detailed user data in orders
- **Professional Icons**: Lucide React icons throughout

### Customer Experience
- **Refund System**: Enhanced refund eligibility
- **Order Tracking**: Detailed order status with customer info
- **Address Management**: Improved CRUD operations
- **Mobile Optimization**: Better responsive design

## Development Notes

- **Environment Variables**: All secrets use environment variables
- **Error Handling**: Comprehensive error catching and user feedback
- **Code Quality**: Clean, maintainable code structure
- **Performance**: Optimized for fast loading and smooth interactions

## Deployment

### Environment Setup
- Set production environment variables
- Configure production database URL
- Set up production Stripe keys
- Configure email service for production

### Build Process
```bash
# Frontend Build
cd frontend
npm run build

# Backend Production
cd backend
npm start
```

---

Developed as part of a university software engineering project
