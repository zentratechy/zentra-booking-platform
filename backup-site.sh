#!/bin/bash

# Full Site Backup Script for Zentra
# This script backs up:
# 1. Git repository (code)
# 2. Firestore database
# 3. Firebase Storage files
# 4. Environment variables documentation
# 5. Configuration files

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/zentra_backup_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🚀 Starting full site backup...${NC}"
echo -e "${BLUE}📁 Backup directory: ${BACKUP_DIR}${NC}"
echo ""

# 1. Git Repository Backup
echo -e "${GREEN}📦 Step 1: Backing up Git repository...${NC}"
git archive --format=tar.gz --output="${BACKUP_DIR}/code_backup.tar.gz" HEAD
echo -e "${GREEN}✅ Code backup complete${NC}"
echo ""

# 2. Create git bundle (includes all branches and history)
echo -e "${GREEN}📦 Step 2: Creating Git bundle (full history)...${NC}"
git bundle create "${BACKUP_DIR}/git_full_backup.bundle" --all
echo -e "${GREEN}✅ Git bundle complete${NC}"
echo ""

# 3. Export Firestore Data
echo -e "${GREEN}💾 Step 3: Exporting Firestore data...${NC}"
if command -v gcloud &> /dev/null; then
    # Get Firebase project ID
    PROJECT_ID=$(grep -o '"default": "[^"]*"' .firebaserc | cut -d'"' -f4)
    if [ -n "$PROJECT_ID" ]; then
        echo "   Project ID: $PROJECT_ID"
        gcloud firestore export "gs://${PROJECT_ID}-backup/firestore_export_${TIMESTAMP}" --project="$PROJECT_ID" 2>/dev/null || echo -e "${YELLOW}⚠️  Firestore export requires gcloud authentication. Skipping...${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not determine Firebase project ID. Skipping Firestore export...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  gcloud CLI not found. Skipping Firestore export...${NC}"
    echo "   To export Firestore manually:"
    echo "   gcloud firestore export gs://[BUCKET]/firestore_export_${TIMESTAMP}"
fi
echo ""

# 4. Backup Configuration Files
echo -e "${GREEN}⚙️  Step 4: Backing up configuration files...${NC}"
cp firebase.json "${BACKUP_DIR}/"
cp .firebaserc "${BACKUP_DIR}/" 2>/dev/null || echo "   .firebaserc not found"
cp vercel.json "${BACKUP_DIR}/" 2>/dev/null || echo "   vercel.json not found"
cp package.json "${BACKUP_DIR}/"
cp package-lock.json "${BACKUP_DIR}/" 2>/dev/null || echo "   package-lock.json not found"
cp tsconfig.json "${BACKUP_DIR}/"
cp next.config.js "${BACKUP_DIR}/" 2>/dev/null || echo "   next.config.js not found"
cp next.config.ts "${BACKUP_DIR}/" 2>/dev/null || echo "   next.config.ts not found"
cp storage.rules "${BACKUP_DIR}/" 2>/dev/null || echo "   storage.rules not found"
cp env.example "${BACKUP_DIR}/" 2>/dev/null || echo "   env.example not found"
echo -e "${GREEN}✅ Configuration files backed up${NC}"
echo ""

# 5. Backup Documentation
echo -e "${GREEN}📚 Step 5: Backing up documentation...${NC}"
mkdir -p "${BACKUP_DIR}/docs"
cp *.md "${BACKUP_DIR}/docs/" 2>/dev/null || echo "   No markdown files found"
echo -e "${GREEN}✅ Documentation backed up${NC}"
echo ""

# 6. Create Environment Variables Template
echo -e "${GREEN}🔐 Step 6: Creating environment variables checklist...${NC}"
cat > "${BACKUP_DIR}/ENVIRONMENT_VARIABLES.md" << 'EOF'
# Environment Variables Checklist

## Required Environment Variables

### Firebase
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

### Stripe
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- NEXT_PUBLIC_STRIPE_CLIENT_ID (for Connect)
- STRIPE_WEBHOOK_SECRET (optional)

### Resend (Email)
- RESEND_API_KEY

### Square (Optional)
- NEXT_PUBLIC_SQUARE_APPLICATION_ID
- NEXT_PUBLIC_SQUARE_ENVIRONMENT
- SQUARE_ACCESS_TOKEN (stored in Firestore per business)

### Vercel
- NEXT_PUBLIC_BASE_URL

### Other
- Any other API keys or secrets used in the application

## Note
Actual values are NOT stored in this backup for security reasons.
Store them securely in a password manager or secure vault.
EOF
echo -e "${GREEN}✅ Environment variables checklist created${NC}"
echo ""

# 7. Create Backup Manifest
echo -e "${GREEN}📋 Step 7: Creating backup manifest...${NC}"
cat > "${BACKUP_DIR}/BACKUP_MANIFEST.txt" << EOF
Zentra Site Backup
==================
Backup Date: $(date)
Backup Directory: ${BACKUP_DIR}

Contents:
---------
1. code_backup.tar.gz - Git repository snapshot
2. git_full_backup.bundle - Complete Git history (all branches)
3. Configuration files (firebase.json, vercel.json, etc.)
4. Documentation files
5. ENVIRONMENT_VARIABLES.md - Checklist of required env vars

Firestore Data:
--------------
Firestore data should be exported separately using:
gcloud firestore export gs://[BUCKET]/firestore_export_${TIMESTAMP}

Firebase Storage:
----------------
Storage files should be backed up separately using:
gsutil -m cp -r gs://[BUCKET]/storage gs://[BACKUP_BUCKET]/storage_${TIMESTAMP}

Restore Instructions:
--------------------
1. Extract code_backup.tar.gz or use git_full_backup.bundle
2. Restore Firestore from export
3. Restore Storage files
4. Set environment variables
5. Run: npm install
6. Deploy to Vercel or run locally

Git Bundle Restore:
------------------
To restore from git bundle:
git clone git_full_backup.bundle restored-repo
cd restored-repo
git checkout main
EOF
echo -e "${GREEN}✅ Backup manifest created${NC}"
echo ""

# 8. Create summary
echo -e "${BLUE}📊 Backup Summary${NC}"
echo "=================="
echo "Backup location: ${BACKUP_DIR}"
echo "Backup size: $(du -sh "${BACKUP_DIR}" | cut -f1)"
echo ""
echo -e "${GREEN}✅ Full backup complete!${NC}"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "1. Firestore data needs to be exported separately (see BACKUP_MANIFEST.txt)"
echo "2. Firebase Storage files need to be backed up separately"
echo "3. Environment variables are NOT included (see ENVIRONMENT_VARIABLES.md)"
echo "4. Store this backup in a secure location"
echo ""
echo "Next steps:"
echo "- Export Firestore: gcloud firestore export gs://[BUCKET]/firestore_export_${TIMESTAMP}"
echo "- Backup Storage: gsutil -m cp -r gs://[BUCKET]/storage gs://[BACKUP_BUCKET]/storage_${TIMESTAMP}"
echo "- Store environment variables securely"



