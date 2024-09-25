import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import cors from 'cors';
import admin from 'firebase-admin';
import chokidar, { FSWatcher, ChokidarOptions } from 'chokidar';

const app = express();
const PORT = 5002;

// Middleware
app.use(cors());
app.use(express.json());

interface CreateFolderRequest {
  name: string;
}

app.get('/check-folder-exists', (req: Request, res: Response) => {
  const folderName = req.query.name as string;
  const { userInfo } = require('os');
  const user = userInfo();
  const dirPath = path.join(`/Users/${user.username}/Desktop`, folderName);

  if (!folderName) {
    return res.status(400).json({ message: 'Folder name is required' });
  }

  fs.stat(dirPath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // console.log(`"${folderName}"folder does not exist.`);
        return res.json({ exists: false });
      } else {
        console.error('An error occurred while checking the folder:', err);
        return res.status(500).json({ message: 'Error checking folder existence', error: err.message });
      }
    }
    
    if (stats.isDirectory()) {
      // console.log(`"${folderName}" folder exists.`);
      return res.json({ exists: true });
    } else {
      console.log(`"${folderName}" exists but is not a directory.`);
      return res.json({ exists: false });
    }
  });
});

app.post('/create-autoSync-folder', (req: Request<{}, {}, CreateFolderRequest>, res: Response) => {
  const folderName = req.body.name;
  const { userInfo } = require('os');
  const user = userInfo();
  const dirPath = path.join(`/Users/${user.username}/Desktop`, folderName);

  if (!folderName) {
    return res.status(400).json({ message: 'Folder name is required' });
  }

  fs.stat(dirPath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // console.log(`The folder "${folderName}" does not exist.`);
      } else {
        console.error('An error occurred while checking the folder:', err);
      }
    } else if (stats.isDirectory()) {
      // console.log(`The folder "${folderName}" exists.`);
    } else {
      console.log(`"${folderName}" exists but is not a directory.`);
    }
  });

  fs.mkdir(dirPath, { recursive: true }, (err) => {
    if (err) {
      console.error('Error details:', err);
      return res.status(500).json({ message: 'Error creating folder', error: err.message });
    }
    res.status(201).json({ message: 'Folder created successfully' });
    // console.log(`${folderName} folder is created on: "Users/${user.username}/Desktop"`);
  });

});

// Initialize Firebase Admin
const serviceAccount = require('./servie-account/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'imageuploaddb-83cfc.appspot.com',
});

const bucket = admin.storage().bucket();

const { userInfo } = require('os');
const user = userInfo();

// Watch the autoSync directory
const syncFolderPath = path.join(`/Users/${user.username}`, 'Desktop', 'autoSync');

const options: ChokidarOptions = {
  persistent: true,
  ignoreInitial: false,
  usePolling: true,
};

let isAutoBackupEnabled = false;

// Endpoint to start or stop auto backup
app.post('/start-auto-backup', (req: Request, res: Response) => {
  const { status } = req.body;

  if (typeof status !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Invalid status value. Expected a boolean.' });
  }

  isAutoBackupEnabled = status;
  const statusMessage = isAutoBackupEnabled ? "Auto backup started..." : "Auto backup stopped...";
  console.log(statusMessage);

  res.status(200).json({ success: true, message: statusMessage, start: isAutoBackupEnabled });

  chokidar.watch(syncFolderPath, options).on('add', async (filePath) => {
    const fileName = path.basename(filePath);
    const destination = `autoSync/${fileName}`;
  
    try {
      if (fileName === '.DS_Store') {
        console.log(`${fileName} is not a valid file`);
        return;
      }
      if (isAutoBackupEnabled) {
        console.log(`Initialize uploading ${fileName}`);
        await bucket.upload(filePath, { destination });
        console.log(`Uploaded ${fileName} to Firebase Storage`);
      }
    } catch (error) {
      console.error(`Error uploading ${fileName}:`, error);
    }
  });

});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});