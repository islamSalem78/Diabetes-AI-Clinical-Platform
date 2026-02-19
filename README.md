# Diabetes Clinical Intelligence Platform

A comprehensive full-stack healthcare platform for diabetes management with AI-powered nutrition analysis and clinical intelligence.

## 🏥 Platform Overview

This platform provides an end-to-end solution for diabetes management, featuring:

- **Patient & Doctor Workflows**: Role-based access with automatic role detection
- **AI Nutrition Module**: Smart meal analysis using Kaggle Foods dataset
- **Clinical Metrics**: HbA1c calculation, Time in Range (TIR), and risk assessment
- **Modern UI/UX**: Dark purple/blue gradient design with Android compatibility
- **Security-First**: XSS, SQL injection, and session management protection

## 🚀 Features

### Core Functionality
- **Three-Page Architecture**: Clean separation of Login/Signup → Readings → Dashboard
- **Role-Based Access**: Automatic role detection (doctor/patient) based on email
- **Clinical Intelligence**: Advanced diabetes metrics and risk scoring (1-4 scale)
- **AI Meal Analysis**: Real-time nutrition breakdown with carb/fiber calculations
- **Responsive Design**: Optimized for desktop and mobile devices

### Security Features
- XSS protection with input sanitization
- SQL injection prevention with parameterized queries
- Session management with secure cookies
- Header injection protection
- High-level encryption (AES-256) for sensitive data

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite build system
- **Chart.js** for data visualization
- **Modern CSS** with gradient design and mobile responsiveness

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** database with in-memory fallback
- **Security middleware**: Helmet, rate limiting, HPP protection

### AI/ML
- **Kaggle Foods Dataset** integration
- **Natural language processing** for food matching
- **Nutritional analysis** algorithms

## 📁 Project Structure

```
bio3/
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.jsx           # Main application logic
│   │   ├── styles.css        # Global styles with gradient design
│   │   └── main.jsx          # React entry point
│   ├── dist/                 # Production build
│   └── package.json
├── server/                    # Node.js backend
│   ├── src/
│   │   ├── index.js          # Express server & API routes
│   │   ├── db.js             # Database functions
│   │   ├── nutrition.js      # AI nutrition module
│   │   └── store.js          # Data store
│   ├── db/
│   │   └── schema.sql        # PostgreSQL schema
│   └── package.json
└── foods.csv                 # Kaggle Foods dataset
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (optional, uses in-memory fallback)
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-username/diabetes-clinical-platform.git
cd diabetes-clinical-platform
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Install client dependencies**
```bash
cd ../client
npm install
```

4. **Start the backend server**
```bash
cd ../server
npm start
```

5. **Start the frontend (in a new terminal)**
```bash
cd client
npm run dev
```

6. **Open your browser**
Navigate to `http://localhost:5173`

## 🎯 Usage

### For Patients
1. Register with your email (system detects patient role automatically)
2. Enter your glucose readings and weight
3. View your personalized dashboard with clinical metrics
4. Use AI nutrition analysis for meal planning

### For Doctors
1. Register with medical email (contains keywords: doctor, dr., clinic, hospital, med)
2. Access enhanced dashboard with patient overview
3. Monitor patient progress and clinical indicators

## 📊 API Endpoints

### Authentication
- `POST /patient/login` - Patient login
- `POST /patient/register` - Patient registration

### Readings
- `POST /patient/:id/readings` - Submit glucose readings
- `GET /patient/:id/overview` - Get patient overview

### Nutrition
- `POST /nutrition/analyze` - Analyze meal nutrition

## 🔒 Security

The platform implements multiple security layers:

- **Input Validation**: All user inputs are sanitized
- **SQL Protection**: Parameterized queries prevent injection
- **Session Security**: Secure cookie-based sessions
- **Rate Limiting**: API endpoint protection
- **Header Security**: Helmet.js for HTTP header protection

## 🎨 Design System

- **Primary Colors**: Purple gradient (#667eea → #764ba2)
- **Background**: Dark theme (#1a1a2e)
- **Typography**: Modern, clean fonts
- **Mobile-First**: Responsive design for all devices

## 🧪 Testing

Run the test suite:
```bash
cd server
npm test
```

## 🚀 Deployment

### Frontend (Netlify/Vercel)
1. Connect your GitHub repository
2. Set build command: `cd client && npm run build`
3. Set publish directory: `client/dist`
4. Deploy automatically on push

### Backend (Render/Heroku)
1. Connect your GitHub repository
2. Set build command: `cd server && npm install`
3. Set start command: `cd server && npm start`
4. Add environment variables as needed

### Custom Domain
1. Add your domain to your hosting platform
2. Configure DNS settings
3. Set up SSL certificates
4. Update API endpoints in client code

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏥 Healthcare Disclaimer

This platform is designed for educational and informational purposes. Always consult with qualified healthcare professionals for medical advice and treatment decisions.

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation wiki

---

**Built with ❤️ for better diabetes management**