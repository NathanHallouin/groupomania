# File Service

## 🎯 Vue d'ensemble

Le service de fichiers gère l'upload, le stockage, le traitement et la livraison de tous les fichiers multimédias dans l'écosystème Groupomania. Il fournit des fonctionnalités avancées de traitement d'images, sécurité et optimisation.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                FILE SERVICE (Port 3004)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Upload    │  │   Image     │  │   Video     │        │
│  │ & Validation│  │ Processing  │  │ Processing  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Storage   │  │   CDN       │  │ Metadata    │        │
│  │ Management  │  │ & Delivery  │  │ & Security  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
           │                        │
    ┌──────▼──────┐         ┌──────▼──────┐
    │File Storage │         │ PostgreSQL  │
    │   System    │         │ Metadata    │
    │  (uploads/) │         │   & Index   │
    └─────────────┘         └─────────────┘
```

## 🚀 Fonctionnalités

### 📤 Upload et Validation
- **Multi-format Support:** Images, vidéos, documents, audio
- **Validation Stricte:** Type MIME, taille, contenu malicieux
- **Upload Progressif:** Support des gros fichiers avec chunks
- **Drag & Drop:** Interface moderne d'upload
- **Batch Upload:** Upload multiple simultané

### 🖼️ Traitement d'Images
- **Redimensionnement Automatique:** Thumbnails et formats optimaux
- **Compression Intelligente:** Réduction taille sans perte qualité
- **Formats Modernes:** Conversion WebP, AVIF pour performance
- **Filigrane:** Application automatique de watermarks
- **Métadonnées EXIF:** Extraction et nettoyage

### 🎥 Traitement Vidéo
- **Compression Vidéo:** Optimisation pour web et mobile
- **Thumbnails Vidéo:** Génération d'aperçus
- **Formats Multiples:** Support MP4, WebM, etc.
- **Streaming:** Préparation pour streaming adaptatif

### 🛡️ Sécurité
- **Scan Antivirus:** Vérification des fichiers uploadés
- **Validation Type:** Vérification signature des fichiers
- **Quarantaine:** Isolation des fichiers suspects
- **Permissions Granulaires:** Contrôle d'accès par fichier
- **Audit Trail:** Traçage des accès aux fichiers

### 🚀 Performance et CDN
- **Cache Intelligent:** Mise en cache des fichiers populaires
- **Compression:** Gzip et Brotli pour les assets
- **Lazy Loading:** Chargement différé des images
- **Progressive JPEG:** Chargement progressif
- **CDN Ready:** Intégration CloudFront/CloudFlare

## 🗂️ Structure du Projet

```
microservices/file-service/
├── src/
│   ├── config/
│   │   ├── config.ts           # Configuration générale
│   │   ├── storage.ts          # Configuration stockage
│   │   ├── imageProcessing.ts  # Config traitement images
│   │   └── security.ts         # Configuration sécurité
│   ├── controllers/
│   │   ├── uploadController.ts # Upload de fichiers
│   │   ├── imageController.ts  # Gestion images
│   │   ├── videoController.ts  # Gestion vidéos
│   │   └── downloadController.ts # Téléchargement
│   ├── middleware/
│   │   ├── auth.ts             # Middleware JWT
│   │   ├── upload.ts           # Multer configuration
│   │   ├── validation.ts       # Validation fichiers
│   │   ├── security.ts         # Scan sécurité
│   │   └── rateLimit.ts        # Rate limiting upload
│   ├── models/
│   │   ├── File.ts             # Modèle fichier
│   │   ├── FileShare.ts        # Partage de fichiers
│   │   ├── ProcessingJob.ts    # Jobs de traitement
│   │   └── FileAccess.ts       # Logs d'accès
│   ├── routes/
│   │   ├── upload.ts           # Routes upload
│   │   ├── download.ts         # Routes download
│   │   ├── images.ts           # Routes images
│   │   └── admin.ts            # Routes admin
│   ├── services/
│   │   ├── uploadService.ts    # Logique upload
│   │   ├── imageProcessingService.ts # Traitement images
│   │   ├── videoProcessingService.ts # Traitement vidéos
│   │   ├── storageService.ts   # Gestion stockage
│   │   ├── securityService.ts  # Sécurité fichiers
│   │   └── cdnService.ts       # Intégration CDN
│   ├── utils/
│   │   ├── fileUtils.ts        # Utilitaires fichiers
│   │   ├── imageUtils.ts       # Utilitaires images
│   │   ├── validation.ts       # Schémas validation
│   │   └── logger.ts           # Configuration logs
│   ├── workers/
│   │   ├── imageProcessor.ts   # Worker traitement images
│   │   ├── videoProcessor.ts   # Worker traitement vidéos
│   │   └── virusScanner.ts     # Worker scan antivirus
│   ├── app.ts                  # Configuration Express
│   └── server.ts               # Point d'entrée
├── uploads/                    # Stockage local
│   ├── temp/                   # Fichiers temporaires
│   ├── images/                 # Images traitées
│   ├── videos/                 # Vidéos traitées
│   ├── documents/              # Documents
│   └── thumbnails/             # Miniatures
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## 🛣️ Endpoints API

### Upload
```typescript
POST   /upload              # Upload fichier unique
POST   /upload/multiple     # Upload multiple fichiers
POST   /upload/chunk        # Upload par chunks (gros fichiers)
GET    /upload/:id/status   # Statut traitement
POST   /upload/url          # Upload via URL externe
```

### Images
```typescript
GET    /images/:id           # Récupérer image originale
GET    /images/:id/thumb     # Miniature
GET    /images/:id/sizes     # Toutes les tailles disponibles
POST   /images/:id/resize    # Redimensionner
POST   /images/:id/crop      # Recadrer
```

### Vidéos
```typescript
GET    /videos/:id           # Récupérer vidéo
GET    /videos/:id/thumb     # Thumbnail vidéo
GET    /videos/:id/preview   # Aperçu court
POST   /videos/:id/process   # Traitement vidéo
```

### Gestion des Fichiers
```typescript
GET    /files               # Liste fichiers utilisateur
GET    /files/:id           # Métadonnées fichier
PUT    /files/:id           # Modifier métadonnées
DELETE /files/:id           # Supprimer fichier
POST   /files/:id/share     # Partager fichier
```

### Administration
```typescript
GET    /admin/files         # Tous les fichiers
GET    /admin/stats         # Statistiques stockage
GET    /admin/quarantine    # Fichiers en quarantaine
DELETE /admin/files/:id     # Suppression admin
```

## 📊 Modèles de Données

### File
```typescript
interface File {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  thumbnailUrl?: string;
  isProcessed: boolean;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  isPublic: boolean;
  downloadCount: number;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;      // Pour vidéos
    exif?: object;          // Métadonnées EXIF
    hash: string;           // Checksum MD5
  };
  securityScan: {
    status: 'pending' | 'clean' | 'infected' | 'suspicious';
    scannedAt: Date;
    threats?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### FileShare
```typescript
interface FileShare {
  id: string;
  fileId: string;
  sharedByUserId: string;
  sharedWithUserId?: string;  // null = public
  shareToken: string;
  expiresAt?: Date;
  maxDownloads?: number;
  currentDownloads: number;
  isActive: boolean;
  createdAt: Date;
}
```

### ProcessingJob
```typescript
interface ProcessingJob {
  id: string;
  fileId: string;
  jobType: 'image_resize' | 'video_compress' | 'thumbnail_generate';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  parameters: object;
  progress: number;         // 0-100
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}
```

## ⚙️ Configuration

### Variables d'Environnement
```env
# Server
PORT=3004
NODE_ENV=development

# Storage
UPLOAD_PATH=./uploads
TEMP_PATH=./uploads/temp
MAX_FILE_SIZE=100MB
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp,mp4,mov,pdf,doc,docx

# Image Processing
IMAGE_QUALITY=85
THUMBNAIL_SIZES=50,150,300,800
WEBP_CONVERSION=true
AUTO_ORIENT=true

# Video Processing
VIDEO_QUALITY=720p
VIDEO_FORMATS=mp4,webm
THUMBNAIL_COUNT=3

# Security
VIRUS_SCAN_ENABLED=true
QUARANTINE_PATH=./uploads/quarantine
FILE_SIGNATURE_CHECK=true

# CDN
CDN_ENABLED=false
CDN_BASE_URL=https://cdn.groupomania.com
CDN_API_KEY=your-cdn-api-key

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=groupomania_files
DB_USERNAME=groupomania_user
DB_PASSWORD=groupomania_password
```

### Configuration Multer
```typescript
const multerConfig = {
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, process.env.TEMP_PATH);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: parseFileSize(process.env.MAX_FILE_SIZE),
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowed = process.env.ALLOWED_EXTENSIONS.split(',');
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    cb(null, allowed.includes(ext));
  }
};
```

## 🖼️ Traitement d'Images

### Service de Traitement
```typescript
class ImageProcessingService {
  async processImage(file: Express.Multer.File): Promise<ProcessedImage> {
    const image = sharp(file.path);
    
    // Métadonnées
    const metadata = await image.metadata();
    
    // Auto-orientation
    image.rotate();
    
    // Génération des thumbnails
    const thumbnails = await this.generateThumbnails(image);
    
    // Conversion WebP
    const webpVersion = await this.convertToWebP(image);
    
    // Compression optimale
    const optimized = await this.optimizeImage(image);
    
    return {
      original: optimized,
      thumbnails,
      webp: webpVersion,
      metadata
    };
  }
  
  async generateThumbnails(image: Sharp): Promise<Thumbnail[]> {
    const sizes = [50, 150, 300, 800];
    
    return Promise.all(sizes.map(async size => {
      const buffer = await image
        .clone()
        .resize(size, size, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer();
        
      return {
        size,
        buffer,
        filename: `thumb_${size}.jpg`
      };
    }));
  }
}
```

### Formats Supportés
```typescript
const SUPPORTED_FORMATS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'tiff'],
  videos: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
  documents: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
  audio: ['mp3', 'wav', 'ogg', 'aac']
};

const OUTPUT_FORMATS = {
  thumbnail: 'jpeg',
  optimized: 'webp',
  fallback: 'jpeg'
};
```

## 🛡️ Sécurité et Validation

### Validation de Fichiers
```typescript
class FileSecurityService {
  async validateFile(file: Express.Multer.File): Promise<ValidationResult> {
    // Vérification signature
    const signatureValid = await this.checkFileSignature(file);
    
    // Scan antivirus
    const virusScan = await this.scanForViruses(file);
    
    // Vérification contenu
    const contentSafe = await this.checkContent(file);
    
    // Vérification métadonnées malicieuses
    const metadataSafe = await this.checkMetadata(file);
    
    return {
      isValid: signatureValid && virusScan.clean && contentSafe && metadataSafe,
      issues: this.collectIssues([signatureValid, virusScan, contentSafe, metadataSafe])
    };
  }
  
  async checkFileSignature(file: Express.Multer.File): Promise<boolean> {
    const buffer = await fs.readFile(file.path);
    const detectedType = await fileType.fromBuffer(buffer.slice(0, 4100));
    
    return detectedType?.mime === file.mimetype;
  }
}
```

### Scan Antivirus (ClamAV)
```typescript
class VirusScannerService {
  async scanFile(filePath: string): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const clamscan = new NodeClam().init({
        removeInfected: false,
        quarantineInfected: true,
        scanLog: true,
        debugMode: false
      });
      
      clamscan.scanFile(filePath, (err, result) => {
        if (err) return reject(err);
        
        resolve({
          isInfected: result.isInfected,
          viruses: result.viruses || []
        });
      });
    });
  }
}
```

## 🚀 Performance et Optimisation

### Cache et CDN
```typescript
class CDNService {
  async uploadToCDN(file: File): Promise<string> {
    // Upload vers CloudFront ou équivalent
    const result = await this.s3Client.upload({
      Bucket: this.bucket,
      Key: file.path,
      Body: fs.createReadStream(file.path),
      ContentType: file.mimeType,
      CacheControl: 'max-age=31536000' // 1 an
    }).promise();
    
    return result.Location;
  }
  
  async invalidateCache(fileId: string): Promise<void> {
    // Invalidation cache CDN
    await this.cloudfront.createInvalidation({
      DistributionId: this.distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: 1,
          Items: [`/files/${fileId}/*`]
        }
      }
    }).promise();
  }
}
```

### Compression et Optimisation
```typescript
const compressionConfig = {
  images: {
    jpeg: { quality: 85, progressive: true },
    png: { compressionLevel: 9, progressive: true },
    webp: { quality: 80, effort: 6 }
  },
  videos: {
    mp4: { crf: 23, preset: 'medium' },
    webm: { quality: 'good', cpu_used: 2 }
  }
};
```

## 📊 Monitoring et Métriques

### Métriques Collectées
```typescript
interface FileServiceMetrics {
  totalFiles: number;
  totalStorage: number;      // en bytes
  uploadsToday: number;
  downloadsToday: number;
  processingQueue: number;
  avgProcessingTime: number;
  errorRate: number;
  topFileTypes: string[];
  storageByType: Record<string, number>;
}
```

### Health Checks
```typescript
GET /health
{
  "status": "healthy",
  "storage": {
    "used": "15.2GB",
    "available": "84.8GB",
    "usage": "15.2%"
  },
  "processing": {
    "queue": 5,
    "avgTime": "2.3s"
  },
  "security": {
    "scannerStatus": "online",
    "quarantineFiles": 0
  }
}
```

## 🚀 Démarrage

### Développement Local
```bash
cd microservices/file-service
npm install
npm run dev
```

### Dépendances Système
```bash
# ImageMagick pour traitement images
sudo apt-get install imagemagick

# FFmpeg pour traitement vidéos
sudo apt-get install ffmpeg

# ClamAV pour scan antivirus
sudo apt-get install clamav clamav-daemon
```

### Docker
```bash
docker build -t groupomania-file-service .
docker run -p 3004:3004 -v $(pwd)/uploads:/app/uploads --env-file .env groupomania-file-service
```

## 🧪 Tests

### Tests Disponibles
```bash
npm test                    # Tous les tests
npm run test:unit          # Tests unitaires
npm run test:integration   # Tests d'intégration
npm run test:security      # Tests de sécurité
npm run test:performance   # Tests de performance
```

### Tests de Sécurité
- Upload de fichiers malicieux
- Validation des signatures
- Scan antivirus
- Protection contre path traversal
- Validation des métadonnées

## 🔮 Évolutions Futures

- [ ] Machine Learning pour classification automatique
- [ ] Support de formats d'images plus avancés (HEIC, AVIF)
- [ ] Streaming vidéo adaptatif (HLS, DASH)
- [ ] Reconnaissance d'objets dans les images
- [ ] Compression intelligente basée sur le contenu
- [ ] Integration avec services cloud (AWS S3, GCP Cloud Storage)
- [ ] Support des NFT et blockchain
