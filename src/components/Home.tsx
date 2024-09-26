import React, { useState, useRef, ChangeEvent, FC } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosError } from 'axios';
import { ref, uploadBytes } from 'firebase/storage';
import { imageDb } from './fileUploads/config';
import './style.css';

const Home: FC = () => {
  const folderName = 'autoSync';
  const [isConfirm, setConfirm] = useState<boolean>(false);
  const [files, setFiles] = useState<File[]>([]);
  const [autoBackup, setAutoBackup] = useState<boolean>(false);
  const [folderExists, setFolderExists] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showAlert = (message: string) => alert(message);

  const handleApiError = (error: unknown, fallbackMessage: string) => {
    const axiosError = error as AxiosError<{ message: string }>;
    const errorMessage = axiosError.response?.data.message || fallbackMessage;
    console.error(errorMessage);
    showAlert(fallbackMessage);
  };

  interface StartAutoBackupResponse {
    success: boolean;
    message: string;
    start: boolean;
  }
  
  const checkFolderExists = async () => {
    try {
      const { data } = await axios.get<{ exists: boolean }>(`http://localhost:5002/check-folder-exists`, { params: { name: folderName } });
      setFolderExists(data.exists);
    } catch (error) {
      handleApiError(error, "Failed to check folder existence.");
    }
  };

  const createFolder = async () => {
    try {
      await axios.post<{ message: string }>('http://localhost:5002/create-autoSync-folder', { name: folderName });
      showAlert(`Hey User! ${folderName} folder is created successfully!`);
    } catch (error) {
      handleApiError(error, `Failed to create ${folderName} folder. Please try again.`);
    }
  };

  const startAutoBackup = async (start: boolean): Promise<void> => {
    try {
      const { data } = await axios.post<StartAutoBackupResponse>(`http://localhost:5002/start-auto-backup`, { status: start });
      setAutoBackup(data.start);
      showAlert(`Hey User, Congrats! Auto backup ${start ? 'started' : 'stopped'}...`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        handleApiError(error, "Failed to update auto backup status.");
      } else {
        console.error("Unexpected error:", error);
      }
    }
  };
  
  const handleStartAutoSync = async () => {
    await checkFolderExists();
    setConfirm(true);
  };

  const handleProceed = async () => {
    setConfirm(false);
    if (!folderExists) {
      await createFolder();
    }
    startAutoBackup(true);
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      showAlert("Please select files to upload.");
      return;
    }

    try {
      await Promise.all(files.map(file => uploadBytes(ref(imageDb, `files/${uuidv4()}_${file.name}`), file)));
      showAlert(files.length === 1 ? "File uploaded successfully!" : "Files uploaded successfully!");
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      handleApiError(error, "Failed to upload files.");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <>
      <h1>Capsyl</h1>
      <div className='description'>
        <p>
          In this Project, we are introducing <strong>auto backup</strong> feature in web client of <strong>Capsyl</strong>: <strong>PWA</strong>
          <br/><br/>
          Here, when the user click below button, the browser will ask for user permission to create a <strong>autoSync</strong> folder on their <strong>File System</strong>. If the user allows <em>PWA</em> to create the <em>autoSync</em> folder, it will create <em>autoSync</em> folder on the user's Local <em>File System</em>. The <em>autoSync</em> folder is <strong>configured</strong> in such a way that it will take <em>auto backup</em> for files are kept on to <strong>autoSync</strong> folder.
        </p>
      </div>
      <button className="start-autosync-button" onClick={handleStartAutoSync}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-repeat" viewBox="0 0 16 16">
          <path d="M11.534 2.207a.5.5 0 0 1 0 .707L9.5 4.5H12a6 6 0 1 1-6 6 .5.5 0 0 1 1 0 5 5 0 1 0 5-5h-2.5l2.034-2.034a.5.5 0 0 1 .707 0z"/>
          <path d="M4.5 7.5H2a6 6 0 1 0 6-6 .5.5 0 0 0-1 0 5 5 0 1 1-5 5h2.5l-2.034 2.034a.5.5 0 0 0 0 .707.5.5 0 0 0 .707 0L4.5 7.5z"/>
        </svg>
        Start AutoSync
      </button>

      {isConfirm && (
        <div className="modal">
          <div className="modal-content">
            <p>
              {folderExists 
                ? `Do you want to start auto backup? ${folderName} folder already exists!` 
                : `Are you sure you want to create "${folderName}" folder?`}
            </p>
            <button className="button-space yes-button" onClick={handleProceed}>Yes</button>
            <button className="button-space no-button" onClick={() => setConfirm(false)}>No</button>
          </div>
        </div>
      )}

      <div className="upload-area">
        <h2>Drop a Folder or Upload Files</h2>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="file-input" />
        <button onClick={uploadFiles} className="upload-button">Upload</button>
      </div>
    </>
  );
};

export default Home;