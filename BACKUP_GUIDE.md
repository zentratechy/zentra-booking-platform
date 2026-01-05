# 🔄 Zentra Site Backup Guide

This guide explains how to create a complete backup of your Zentra site, including code, database, and files.

## 📦 What Gets Backed Up

### ✅ Automatic Backups (via `backup-site.sh`)
- **Code Repository**: Complete Git history and current code
- **Configuration Files**: firebase.json, vercel.json, package.json, etc.
- **Documentation**: All markdown documentation files
- **Environment Variables Checklist**: List of required environment variables

### ⚠️ Manual Backups Required
- **Firestore Database**: Needs to be exported separately
- **Firebase Storage**: Files need to be backed up separately
- **Environment Variables**: Values should be stored securely (not in backup)

---

## 🚀 Quick Backup

Run the backup script:

```bash
./backup-site.sh
```

This creates a timestamped backup in `backups/zentra_backup_[timestamp]/`

---

## 📋 Complete Backup Steps

### Step 1: Code Backup (Automatic)
The script automatically creates:
- `code_backup.tar.gz` - Current code snapshot
- `git_full_backup.bundle` - Complete Git history with all branches

### Step 2: Firestore Database Export

**Option A: Using gcloud CLI (Recommended)**

```bash
# Install gcloud CLI if not installed
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set your project
gcloud config set project zentra-d9671

# Export Firestore to Cloud Storage
gcloud firestore export gs://zentra-d9671-backup/firestore_export_$(date +%Y%m%d_%H%M%S)
```

**Option B: Using Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `zentra-d9671`
3. Go to **Firestore Database** → **Backups**
4. Click **Create Backup**
5. Choose destination (Cloud Storage bucket)
6. Wait for export to complete

**Option C: Using Firebase Admin SDK (Programmatic)**
```javascript
// Create a script to export Firestore
const admin = require('firebase-admin');
admin.initializeApp();

const bucket = admin.storage().bucket('zentra-d9671-backup');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const exportPath = `firestore_export_${timestamp}`;

// Note: Firestore export requires gcloud CLI or Firebase Console
// This is just an example structure
```

### Step 3: Firebase Storage Backup

**Using gsutil (Recommended)**

```bash
# Install gsutil if not installed
# Comes with gcloud CLI

# Backup all storage files
gsutil -m cp -r gs://zentra-d9671.appspot.com gs://zentra-d9671-backup/storage_$(date +%Y%m%d_%H%M%S)

# Or backup specific folders
gsutil -m cp -r gs://zentra-d9671.appspot.com/businesses gs://zentra-d9671-backup/businesses_$(date +%Y%m%d_%H%M%S)
gsutil -m cp -r gs://zentra-d9671.appspot.com/clients gs://zentra-d9671-backup/clients_$(date +%Y%m%d_%H%M%S)
gsutil -m cp -r gs://zentra-d9671.appspot.com/staff gs://zentra-d9671-backup/staff_$(date +%Y%m%d_%H%M%S)
```

**Using Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Storage**
4. Download files manually (not recommended for large backups)

### Step 4: Environment Variables Backup

**Important**: Environment variables are NOT included in the code backup for security.

**Vercel Environment Variables:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Export or document all variables

**Local Environment Variables:**
- Copy `.env.local` (if exists) to a secure location
- Document all variables in a password manager

**Required Variables Checklist:**
See `backups/[timestamp]/ENVIRONMENT_VARIABLES.md` for a complete list.

---

## 🔄 Restore from Backup

### Restore Code

**From Git Bundle (Complete History):**
```bash
git clone backups/zentra_backup_[timestamp]/git_full_backup.bundle restored-repo
cd restored-repo
git checkout main
```

**From Tar Archive:**
```bash
mkdir restored-repo
cd restored-repo
tar -xzf ../backups/zentra_backup_[timestamp]/code_backup.tar.gz
```

### Restore Firestore

```bash
# Import Firestore from export
gcloud firestore import gs://zentra-d9671-backup/firestore_export_[timestamp]
```

### Restore Storage

```bash
# Restore all storage files
gsutil -m cp -r gs://zentra-d9671-backup/storage_[timestamp]/* gs://zentra-d9671.appspot.com/
```

### Restore Environment Variables

1. Set all environment variables in Vercel or `.env.local`
2. Refer to `ENVIRONMENT_VARIABLES.md` for complete list

---

## 📅 Backup Schedule Recommendations

### Daily Backups
- **Code**: Automatic via Git (already versioned)
- **Firestore**: Consider automated daily exports
- **Storage**: Weekly or on-demand

### Before Major Changes
- Always create a full backup before:
  - Deploying major updates
  - Database migrations
  - Configuration changes
  - Removing features

### Monthly Full Backups
- Complete backup of everything
- Store in multiple locations (local + cloud)

---

## 🔐 Security Best Practices

1. **Never commit environment variables** to Git
2. **Store backups in secure locations** (encrypted storage)
3. **Use separate backup buckets** with restricted access
4. **Rotate backup retention** (keep last 30 days, archive older)
5. **Test restore procedures** regularly

---

## 🛠️ Automated Backup Setup (Optional)

### Automated Firestore Export (Cloud Scheduler)

Create a Cloud Function or use Cloud Scheduler to automate Firestore exports:

```bash
# Create a scheduled export job
gcloud scheduler jobs create http firestore-daily-backup \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/zentra-d9671/databases/(default):exportDocuments" \
  --http-method=POST \
  --message-body='{"outputUriPrefix": "gs://zentra-d9671-backup/daily/"}'
```

### Automated Storage Backup (gsutil cron)

Add to crontab:
```bash
# Daily storage backup at 3 AM
0 3 * * * gsutil -m cp -r gs://zentra-d9671.appspot.com gs://zentra-d9671-backup/daily/$(date +\%Y\%m\%d)
```

---

## 📊 Backup Verification

After creating a backup, verify it:

1. **Code Backup**: Extract and check files
2. **Firestore Export**: Check export folder in Cloud Storage
3. **Storage Backup**: Verify file counts match
4. **Test Restore**: Periodically test restore procedures

---

## 🆘 Emergency Restore

If you need to restore quickly:

1. **Code**: Use Git bundle to restore immediately
2. **Database**: Import latest Firestore export
3. **Storage**: Restore from latest backup
4. **Environment**: Set variables from secure storage

---

## 📞 Need Help?

- **Firebase Docs**: https://firebase.google.com/docs/firestore/manage-data/export-import
- **gcloud CLI**: https://cloud.google.com/sdk/docs
- **gsutil Docs**: https://cloud.google.com/storage/docs/gsutil

---

**Last Updated**: December 20, 2025



