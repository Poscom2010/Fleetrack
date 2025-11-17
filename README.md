# 🚗 FleetTrack - Fleet Management System

> A comprehensive SaaS platform for fleet management companies to track vehicles, manage teams, monitor expenses, and analyze performance in real-time.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://your-app.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-blue)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Latest-orange)](https://firebase.google.com/)

---

## ✨ Features

### 🔐 Multi-Tenant Architecture
- **System Admin Dashboard** - Platform-wide management and analytics
- **Company Management** - Multiple companies with isolated data
- **Role-Based Access** - Admin, Manager, and Driver roles
- **Secure Authentication** - Email/password and Google OAuth

### 🚙 Fleet Management
- **Vehicle Tracking** - Comprehensive vehicle information and status
- **Trip Logbook** - Detailed trip records with mileage tracking
- **Daily Entries** - Cash-in, mileage, and revenue tracking
- **Expense Management** - Track fuel, maintenance, and other costs

### 📊 Analytics & Insights
- **AI-Powered Insights** - Smart recommendations for fleet optimization
- **Performance Metrics** - Revenue, profit, and efficiency analysis
- **Vehicle Analytics** - Per-vehicle performance breakdown
- **Business Dashboard** - Platform-wide revenue and growth metrics

### 👥 Team Management
- **User Invitations** - Email-based team member invitations
- **Vehicle Assignment** - Assign vehicles to specific drivers
- **Activity Tracking** - Monitor driver login and activity
- **Role Management** - Flexible permission system

---

## 🛠️ Tech Stack

**Frontend:**
- React 19 with Hooks
- Vite (Build tool)
- TailwindCSS (Styling)
- React Router DOM (Routing)
- Recharts (Data visualization)
- Lucide React (Icons)

**Backend:**
- Firebase Authentication
- Cloud Firestore (Database)
- Firebase Security Rules
- Real-time data sync

**Deployment:**
- Vercel (Hosting)
- GitHub (Version control)
- Automatic CI/CD

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Firebase account
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/fleettrack.git
cd fleettrack

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Environment Setup

Your Firebase configuration is in `src/services/firebase.js`. Update with your credentials from [Firebase Console](https://console.firebase.google.com/).

---

## 📦 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Click Deploy
   - Done! ✨

3. **Configure Firebase**
   - Add Vercel domain to Firebase Authorized Domains
   - Authentication → Settings → Authorized domains

📖 **Full Guide**: See `DEPLOY_TO_VERCEL.md`

---

## 📂 Project Structure

```
fleettrack/
├── src/
│   ├── components/
│   │   ├── auth/          # Authentication components
│   │   ├── layout/        # Navbar, Sidebar, AppShell
│   │   └── common/        # Reusable UI components
│   ├── pages/
│   │   ├── SystemAdminDashboard.jsx
│   │   ├── TeamPage.jsx
│   │   ├── AnalyticsPage.jsx
│   │   └── ...
│   ├── services/
│   │   ├── firebase.js    # Firebase configuration
│   │   └── userService.js # User management
│   ├── hooks/
│   │   └── useAuth.jsx    # Authentication hook
│   └── App.jsx            # Main application
├── firestore.rules        # Database security rules
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

---

## 📜 Available Scripts

```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## 🔐 Security Features

- **Role-Based Access Control** - System Admin, Company Admin, Manager, Driver
- **Data Isolation** - Companies can only access their own data
- **Firestore Security Rules** - Server-side data validation
- **User Deletion Control** - Only System Admin can delete users (prevents subscription fraud)
- **Secure Authentication** - Firebase Auth with email/password and Google OAuth

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **System Admin** | Full platform control, manage all companies, delete users, view business analytics |
| **Company Admin** | Manage company users, vehicles, entries, expenses, team management |
| **Company Manager** | View analytics, manage vehicles, approve entries, team oversight |
| **Driver** | Log trips, add entries, view assigned vehicle, track personal performance |

---

## 🔧 Firebase Configuration

### Deploy Security Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy rules
firebase deploy --only firestore:rules
```

### Security Rules Highlights

- ✅ Multi-tenant data isolation
- ✅ Role-based permissions
- ✅ System Admin exclusive user deletion
- ✅ Company-scoped data access
- ✅ Input validation on all writes

---

## 📸 Screenshots

### System Admin Dashboard
![System Admin](https://via.placeholder.com/800x400?text=System+Admin+Dashboard)

### Company Dashboard
![Company Dashboard](https://via.placeholder.com/800x400?text=Company+Dashboard)

### Analytics
![Analytics](https://via.placeholder.com/800x400?text=Analytics+Dashboard)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- 📖 **Documentation**: See `DEPLOY_TO_VERCEL.md` for deployment guide
- 🐛 **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/fleettrack/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/fleettrack/discussions)

---

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] SMS notifications
- [ ] Advanced reporting
- [ ] Integration with accounting software
- [ ] Multi-language support
- [ ] Dark mode

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- Vercel for hosting
- React community for amazing tools
- TailwindCSS for beautiful styling

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ for fleet management companies

</div>
