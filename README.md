# Smart-HR Application

Employee Management & HR System built with React + Vite + Firebase

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase account

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd smart-hr
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup Firebase Configuration**

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

**⚠️ IMPORTANT**: 
- Never commit `.env` file to git
- Ask team lead for Firebase credentials if you don't have them

4. **Run the development server**
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

---

## 🌍 Environments

### Development
Uses `.env` file (local development)

### Staging
```bash
cp .env.staging .env
npm run build
```

### Production
```bash
cp .env.production .env
npm run build
```

---

## 🔐 Security

### Firebase Security Rules
Make sure to apply these rules to your Firebase project:

**Firestore Rules** (Database → Rules):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'owner';
    }
    
    function isSameCompany(companyId) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId;
    }
    
    function isOwnerOfCompany(companyId) {
      return isOwner() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId == companyId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated() && 
                     (request.auth.uid == userId || 
                      isSameCompany(resource.data.companyId));
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() && 
                       (request.auth.uid == userId || 
                        isOwnerOfCompany(resource.data.companyId));
      allow delete: if isOwnerOfCompany(resource.data.companyId);
    }
    
    // Companies collection
    match /companies/{companyId} {
      allow read: if isSameCompany(companyId);
      allow write: if isOwnerOfCompany(companyId);
    }
    
    // Attendance collection
    match /attendance/{docId} {
      allow read: if isSameCompany(resource.data.companyId);
      allow create: if isAuthenticated() && 
                       request.auth.uid == request.resource.data.userId;
      allow update, delete: if isOwnerOfCompany(resource.data.companyId);
    }
    
    // Schedules collection
    match /schedules/{docId} {
      allow read: if isSameCompany(resource.data.companyId);
      allow write: if isOwnerOfCompany(resource.data.companyId);
    }
    
    // Payslips collection
    match /payslips/{docId} {
      allow read: if isAuthenticated() && 
                     (request.auth.uid == resource.data.userId || 
                      isOwnerOfCompany(resource.data.companyId));
      allow write: if isOwnerOfCompany(resource.data.companyId);
    }
    
    // Requests collection
    match /requests/{docId} {
      allow read: if isSameCompany(resource.data.companyId);
      allow create: if isAuthenticated() && 
                       request.auth.uid == request.resource.data.userId;
      allow update: if isOwnerOfCompany(resource.data.companyId);
      allow delete: if isAuthenticated() && 
                       (request.auth.uid == resource.data.userId || 
                        isOwnerOfCompany(resource.data.companyId));
    }
  }
}
```

**Storage Rules** (Storage → Rules):
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
  }
}
```

---

## 🏗️ Project Structure

```
src/
  app/              # Routes & Layouts
  pages/            # UI Pages (admin & employee)
  features/         # Feature modules (auth, attendance, payroll, etc.)
  shared/           # Shared utilities & components
```

See `implementation_plan.md` for detailed architecture.

---

## 👥 Team Workflow

1. **Never commit `.env` files** - Only `.env.example` should be in git
2. **Get Firebase credentials from team lead**
3. **Follow the refactoring plan** in `implementation_plan.md`
4. **Run tests before committing** - `npm run lint && npm run build`

---

## 📝 License

Private - Internal Use Only

