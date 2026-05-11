# 🚀 InYourTask v2.0

Platform manajemen task ultra-modern dengan AI Assistant, version tracking otomatis, dan responsive PWA design.

## ✨ Features

- 📋 **Smart Task Management** - Organize tasks with projects, priorities, and progress tracking
- 🤖 **AI Assistant** - 4 specialized AI agents (Content Writer, Data Analyst, Developer, Project Manager)
- 💬 **Real-time Chat** - Team collaboration with AI agents
- 📊 **Workflow Tracking** - Visual workflow stages for different project types
- 🏢 **Organizational Structure** - Multi-level hierarchy management
- 📱 **PWA Ready** - Install as mobile app
- 🎨 **Modern UI** - Clean, responsive design with InYourTask purple palette

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+ (or PlanetScale)
- Gemini API key

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/inyourtask.git
cd inyourtask

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Run database migration
node scripts/migrate-all.js

# Start development server
npm run dev
```

Open [http://localhost:3005](http://localhost:3005)

### Default Login
- **Username:** `admin` | **Password:** `raytask123`
- **Username:** `taufik` | **Password:** `raytask123`

## 📦 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete deployment instructions.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/inyourtask)

1. Click button above
2. Add environment variables (see `.env.example`)
3. Deploy!

## 🗄️ Database

**23 Tables:**
- Users & Auth (2 tables)
- Projects & Tasks (3 tables)
- Chat System (6 tables)
- AI Agents (2 tables)
- Organizational Structure (3 tables)
- Workflow Tracking (3 tables)
- Configuration (4 tables)

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** MySQL 8.0
- **AI:** Google Gemini 2.0
- **Styling:** CSS Modules
- **Deployment:** Vercel
- **Database Hosting:** PlanetScale (recommended)

## 📝 License

Private - InYourTask Internal Use

## 👥 Contributors

- InYourTask Team
- AI Development Division

---

**Made with ❤️ by InYourTask**

## ✨ Fitur Utama

### 🎯 Core Features
- ✅ **Full CRUD Operations** - Projects & Tasks dengan validasi lengkap
- 🔄 **Auto Version Tracking** - Setiap perubahan signifikan tercatat otomatis
- 📊 **Real-time Dashboard** - Stats, charts, dan progress tracking
- 🤖 **AI Assistant** - Gemini AI untuk bantuan cerdas
- 📱 **Responsive PWA** - Mobile-first design dengan bottom navigation
- ⚙️ **Brain Configuration** - Kelola dropdown dan defaults dari UI
- 📝 **Audit Logging** - Weekly snapshot untuk semua perubahan
- 🎨 **Modern UI/UX** - Minimalist, clean, dan user-friendly

### 🔥 Advanced Features
- Auto-fill defaults dari Brain config
- Auto-generate ID (PRJ-001, TSK-001)
- Auto-start date saat status = Active/In Progress
- Auto-closed date saat status = Closed
- Auto-calculate project progress dari tasks
- Personal view filter (My Tasks/My Projects)
- Empty state handling yang graceful
- Toast notifications untuk feedback
- Loading states dan error handling

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MySQL 8.0
- **Styling**: CSS Modules
- **Charts**: Chart.js + react-chartjs-2
- **Icons**: Lucide React
- **AI**: Google Gemini 2.0 Flash
- **Markdown**: marked.js + DOMPurify

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm atau yarn

### Setup Steps

1. **Clone & Install**
```bash
git clone <repository-url>
cd ray-task-management
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ray-task_management

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
```

3. **Database Migration**
```bash
npm run db:migrate
```

Output yang diharapkan:
```
🚀 Starting database migration...
✅ Connected to MySQL server
✅ Database and tables created successfully
✅ Database: ray-task_management
✅ Tables: brain_config, brain_defaults, projects, tasks, weekly_snapshot
✅ Default data inserted
🎉 Migration completed successfully!
```

4. **Run Development Server**
```bash
npm run dev
```

Buka browser: `http://localhost:3000`

## 📁 Project Structure

```
ray-task-management/
├── app/
│   ├── api/                    # API Routes
│   │   ├── dashboard/          # Dashboard data endpoint
│   │   ├── config/             # Configuration endpoint
│   │   ├── projects/           # Projects CRUD
│   │   ├── tasks/              # Tasks CRUD
│   │   ├── brain/              # Brain config management
│   │   └── ai/                 # AI Assistant endpoint
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
├── components/                 # React Components
│   ├── Navbar.tsx              # Desktop navigation
│   ├── BottomNav.tsx           # Mobile navigation
│   ├── Overview.tsx            # Dashboard overview
│   ├── Projects.tsx            # Projects table
│   ├── Tasks.tsx               # Tasks table
│   ├── AIAssistant.tsx         # AI chat interface
│   ├── BrainSettings.tsx       # Configuration UI
│   ├── Modal.tsx               # Create/Edit modal
│   ├── Toast.tsx               # Notification toast
│   └── FAB.tsx                 # Floating action button
├── models/                     # Database Models
│   ├── BrainModel.ts           # Brain configuration
│   ├── ProjectModel.ts         # Projects logic
│   ├── TaskModel.ts            # Tasks logic
│   └── LogModel.ts             # Audit logging
├── lib/
│   └── db.ts                   # Database connection pool
├── scripts/
│   └── migrate.js              # Database migration script
├── .env                        # Environment variables
├── package.json                # Dependencies
└── README.md                   # Documentation
```

## 🗄️ Database Schema

### Tables

#### `brain_config`
Central configuration untuk dropdown options
- `id`, `config_type`, `config_value`, `display_order`, `is_active`
- Types: team, status, priority, progress, category

#### `brain_defaults`
Default values untuk form
- `id`, `default_key`, `default_value`

#### `projects`
Master data projects
- `id`, `project_id`, `project_name`, `category`, `owner`, `status`
- `notes`, `progress`, `start_date`, `closed_date`, `version`

#### `tasks`
Detail data tasks
- `id`, `task_id`, `task_name`, `project_id`, `assignee`
- `status`, `priority`, `progress`, `due_date`, `start_date`, `version`

#### `weekly_snapshot`
Audit log untuk version tracking
- `id`, `timestamp`, `item_type`, `item_id`, `item_name`
- `change_type`, `from_version`, `to_version`, `from_value`, `to_value`

## 🔌 API Endpoints

### Dashboard
- `GET /api/dashboard` - Get all dashboard data (stats, projects, tasks, logs)

### Configuration
- `GET /api/config` - Get brain config & defaults

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project by ID
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/[id]` - Get task by ID
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task

### Brain
- `POST /api/brain` - Add/Update/Delete config item

### AI Assistant
- `POST /api/ai` - Send message to AI

## 🎨 UI Components

### Desktop (>768px)
- Top navigation dengan tabs
- Multi-column grid layouts
- Full-width tables
- Stats cards dalam 5 kolom

### Mobile (<768px)
- Bottom navigation dengan 5 items
- Single column layout
- Horizontal scroll tables
- FAB button untuk quick add
- Stats cards dalam 2 kolom

## 🤖 AI Assistant

### Intent Detection
- "buat task" → Open task form
- "buat project" → Open project form
- "status" → Show dashboard summary
- Other queries → Gemini AI response

### Features
- Markdown rendering dengan marked.js
- HTML sanitization dengan DOMPurify
- Quick action buttons
- Chat history dalam session

## 🔄 Version Tracking

### Auto-increment triggers:

**Projects:**
- Name, Category, Owner, Status changes

**Tasks:**
- Assignee, Status, Priority, Progress changes

### Logging:
Setiap perubahan dicatat ke `weekly_snapshot` dengan:
- Timestamp
- Item type & ID
- Change type
- From/To version
- From/To value
- Changed by user

## 📱 PWA Features

- Responsive design (mobile-first)
- Touch-friendly (min 44px targets)
- Bottom navigation untuk mobile
- FAB untuk quick actions
- Smooth animations & transitions
- Optimized performance

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Pastikan semua env vars sudah di-set di production:
- Database credentials
- Gemini API key
- App configuration

### Database
- Backup regular menggunakan mysqldump
- Monitor connection pool
- Index optimization untuk query performance

## 🔧 Development

### Adding New Features
1. Create model di `models/`
2. Create API route di `app/api/`
3. Create component di `components/`
4. Update types jika perlu

### Code Style
- TypeScript strict mode
- CSS Modules untuk styling
- Async/await untuk promises
- Error handling dengan try-catch
- Validation di client & server

## 📊 Performance

### Optimizations
- Database connection pooling
- Efficient SQL queries dengan indexes
- Client-side caching
- Lazy loading components
- Optimized bundle size

### Monitoring
- Check MySQL slow query log
- Monitor API response times
- Track error rates
- User analytics (optional)

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check MySQL service
mysql -u root -p

# Verify credentials in .env
# Check port 3306 is not blocked
```

### Migration Failed
```bash
# Drop database and retry
mysql -u root -p -e "DROP DATABASE IF EXISTS ray-task_management"
npm run db:migrate
```

### API Errors
- Check console logs
- Verify database connection
- Check API endpoint URLs
- Validate request payloads

## 📝 License

Private - InYourTask Internal Use

## 👥 Contributors

- Ray Academy Team
- AI Development Division

## 📞 Support

For issues or questions:
- Email: support@rayacademy.com
- Slack: #ray-task-management

---

**Version**: 2.0.0  
**Last Updated**: 2026-04-14  
**Status**: Production Ready 🚀
