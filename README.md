## HMS Backend (Node.js, Express, Mongoose)

Production-ready Hospital Management System REST API.

### Requirements
- Node.js 18+
- MongoDB 6+

### Environment variables
Create `HMS-backend/.env` (copy from `.env.example` in this README):

```
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/hms
JWT_ACCESS_SECRET=change_me_access_secret
JWT_REFRESH_SECRET=change_me_refresh_secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=./storage/uploads
DEFAULT_RETENTION_DAYS=365
SEED_SUPER_ADMIN_EMAIL=superadmin@example.com
SEED_SUPER_ADMIN_PASSWORD=ChangeMeStrongP@ssw0rd
SEED_ADMIN_EMAIL=admin@example.com
SEED_USER_EMAIL=user@example.com
SEED_DEFAULT_HOSPITAL_NAME=Demo General Hospital
```

### Install & run
```bash
cd HMS-backend
npm install
npm run migrate
npm run seed
npm run dev
# Healthcheck
curl http://localhost:4000/healthz
```

### Scripts
- `npm run start` - start server
- `npm run dev` - dev mode with nodemon
- `npm run test` - run Jest tests
- `npm run seed` - seed roles/users/hospital/patient/encounters
- `npm run migrate` - sync indexes
- `npm run cron-run` - run retention job in dry-run

### Models (high-level)
- User: name, email, passwordHash, role/roleRef, hospitalId
- Hospital
- Patient: demographics, `journey[]` (summary entries), soft-delete fields
- Encounter: referenced details (meds, vitals, files, timestamp, deleted flags)
- RefreshToken: for JWT refresh flow
- AuditLog: security/audit trail
- Settings: data retention per hospital/global

Indexes: patientId+timestamp on encounters, createdAt on several, soft-delete flags, etc.

### Auth & authorization
- JWT access (15m) + refresh (7d)
- `auth` middleware validates access tokens
- `authorize(permissions, { requireAll })` checks role permissions with per-request caching
- Example permissions: `create_patient`, `read_patient`, `update_patient`, `delete_encounter`, `schedule_deletion`, `view_audit`, `manage_users`, `manage_settings`

### Storage
- Local provider at `src/services/storage/local.js` with `uploadFile` and `deleteFile(url)`
- Swap provider by setting `STORAGE_PROVIDER=s3` and adding `src/services/storage/s3.js`

### Cron: Retention
- `src/jobs/retentionJob.js` permanently deletes patients whose `deletionScheduledAt <= now`
- Deletes related encounters and local files, writes audit entries
- Dry-run preview with `--dry-run` flag

Dry-run:
```bash
cd HMS-backend
npm run cron-run
```
Real run:
```bash
node src/jobs/retentionJob.js --no-dry-run
```

### Tests (Jest + Supertest)
- `tests/auth.test.js` - login and refresh flow
- `tests/patientEncounter.test.js` - patient creation and adding an encounter
Run:
```bash
npm test
```

### Example cURL flow
```bash
# 1) Login (seeded user: user@example.com / UserP@ssw0rd!)
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"UserP@ssw0rd!"}' | jq -r .accessToken)

# 2) Create patient (replace HOSPITAL_ID from seed logs if needed)
HOSPITAL_ID=$(node -e "require('dotenv').config();(async()=>{const m=require('./src/models');const h=await m.Hospital.findOne().lean();console.log(h._id.toString());process.exit(0)})()")
PATIENT=$(curl -s -X POST http://localhost:4000/patients \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"hospitalId\":\"$HOSPITAL_ID\",\"firstName\":\"Alice\",\"lastName\":\"Smith\"}")
PATIENT_ID=$(echo $PATIENT | jq -r .data._id)

# 3) Add encounter
curl -s -X POST http://localhost:4000/patients/$PATIENT_ID/encounters \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"notes":"Routine check","vitals":{"heartRate":72}}'

# 4) Schedule deletion (dry-run custom date)
curl -s -X POST http://localhost:4000/patients/$PATIENT_ID/schedule-delete \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"date":"2030-01-01T00:00:00Z","dryRun":true}'
```

### Security notes
- Hashing with bcrypt
- Input validation with `express-validator`
- Rate-limiting on `/auth`
- Secrets in `.env` only; use strong secrets in production
- Use HTTPS or a reverse proxy (e.g., Nginx) to terminate TLS

### Developer ergonomics
- Seeded entities: 1 hospital, users (super_admin, admin, user), 1 demo patient with 2 encounters
- Postman: import endpoints easily; the cURL sample above mirrors basic flows


# hms-backend
