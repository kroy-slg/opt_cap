import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCW7zJXebEK_XZE2EJoBXDiyG_ZJuBKaWA",
    authDomain: "imageuploaddb-83cfc.firebaseapp.com",
    projectId: "imageuploaddb-83cfc",
    storageBucket: "imageuploaddb-83cfc.appspot.com",
    messagingSenderId: "572147198257",
    appId: "1:572147198257:web:bef5c4ad134bb38d646810"
};

const app = initializeApp(firebaseConfig);
export const imageDb = getStorage(app);
